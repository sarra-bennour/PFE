import React, { useEffect, useState, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useAuthHook } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ExporterSpace from './pages/Exportateur/ExporterSpace';
import ImporterSpace from './pages/Importateur/ImporterSpace';
import ValidatorSpace from './pages/ValidatorSpace';
import DecisionAid from './pages/DecisionAid';
import AdminPanel from './pages/Admin/AdminPanel';
import ExporterSignUp from './pages/Exportateur/ExporterSignUp';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ProductDeclaration from './pages/Exportateur/ProductDeclaration';
import DeclarationsList from './pages/DeclarationsList';
import { SessionExpiredHandler } from './components/SessionExpiredHandler';

// Define User types for the simulation
export type UserRole = 'EXPORTATEUR' | 'IMPORTATEUR' | 'validator' | 'ADMIN';

export interface User {
  email: string;
  role: UserRole;
  companyName?: string;
  legalRep?: string;
  phone?: string;
  isTwoFactorEnabled?: boolean;
  submissionDate?: string;
  // Champs spécifiques aux exportateurs
  raisonSociale?: string;
  paysOrigine?: string;
  numeroRegistreCommerce?: string;
  adresseLegale?: string;
  ville?: string;
  siteWeb?: string;
  representantLegal?: string;
  numeroTVA?: string;
  emailVerified?: boolean;
  // Champs spécifiques aux importateurs
  mobileIdMatricule?: string;
  mobileIdPin?: string;
  id?: number; // Ajout de l'ID utilisateur
}

// Interface pour les statuts du dossier
interface DossierStatus {
  demandeStatus: string;
  paymentStatus: string;
  lastUpdated: string;
  demandeId?: number;
  reference?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  dossierStatus: DossierStatus | null;
  updateDossierStatus: (demandeStatus: string, paymentStatus: string, additionalData?: any) => void;
  acceptedProducts: Set<number>; // Ajout des produits acceptés
  addAcceptedProduct: (productId: number) => void; // Fonction pour ajouter un produit accepté
  clearAcceptedProduct: (productId: number) => void; // Fonction pour effacer un produit accepté
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: UserRole[] }> = ({ children, roles }) => {
  const { user, isLoading } = useAuth();

  console.log('🛡️ ProtectedRoute - isLoading:', isLoading, 'user:', user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red mb-4"></i>
          <p className="text-sm font-bold">Chargement de votre session...</p>
        </div>
      </div>
    );
  }
  // ✅ Une fois le chargement terminé, vérifier l'utilisateur
  if (!user) {
    console.log('🚫 Pas d\'utilisateur, redirection vers login');
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    console.log('🚫 Rôle non autorisé, redirection vers accueil');
    return <Navigate to="/" replace />;
  }

  console.log('✅ Accès autorisé');
  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  // Liste des routes qui ne doivent pas avoir Navbar/Footer
  const noNavbarRoutes = [
    '/login',
    '/forgot-password', 
    '/reset-password',
    '/admin',
    '/validator'
  ];
  
  const shouldHideNavbar = noNavbarRoutes.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {!shouldHideNavbar && <Navbar />}
      <main className={`flex-grow ${shouldHideNavbar ? '' : 'container mx-auto px-4 py-8'}`}>
        {children}
      </main>
      {!shouldHideNavbar && <Footer />}
    </div>
  );
};

// Wrapper pour ForgotPassword
const ForgotPasswordWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <ForgotPassword onBack={() => navigate('/login')} />;
};

// Wrapper pour la réinitialisation de mot de passe
const ResetPasswordWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();

  // Extraire le token de l'URL
  const searchParams = new URLSearchParams(search);
  const resetToken = searchParams.get('token');

  // Rediriger vers login avec le token dans l'URL
  useEffect(() => {
    if (resetToken) {
      navigate(`/login?reset-token=${resetToken}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [resetToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red mb-4"></i>
        <p className="text-sm font-bold">Redirection vers la page de réinitialisation...</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const authHook = useAuthHook(); // Utiliser le hook personnalisé

  // État pour les produits acceptés
  const [acceptedProducts, setAcceptedProducts] = useState<Set<number>>(new Set());

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  // Charger les produits acceptés depuis le localStorage au démarrage
  useEffect(() => {
    const savedAcceptedProducts = localStorage.getItem('acceptedProducts');
    if (savedAcceptedProducts) {
      try {
        const parsed = JSON.parse(savedAcceptedProducts);
        setAcceptedProducts(new Set(parsed));
      } catch (error) {
        console.error('Erreur lors du chargement des produits acceptés:', error);
      }
    }
  }, []);

  // Sauvegarder les produits acceptés dans le localStorage quand ils changent
  useEffect(() => {
    localStorage.setItem('acceptedProducts', JSON.stringify(Array.from(acceptedProducts)));
  }, [acceptedProducts]);

  // Écouter les événements de notification acceptée
  useEffect(() => {
    const handleAcceptedNotification = (event: CustomEvent) => {
      console.log('Événement notification acceptée reçu dans App:', event.detail);
      const notification = event.detail;

      // Extraire l'ID du produit de la notification
      const productId = notification.targetEntityId;

      if (productId) {
        console.log('Ajout du produit accepté:', productId);
        addAcceptedProduct(productId);
      }
    };

    window.addEventListener('acceptedNotification', handleAcceptedNotification as EventListener);

    return () => {
      window.removeEventListener('acceptedNotification', handleAcceptedNotification as EventListener);
    };
  }, []);

  const login = (userData: User, token: string) => {
    authHook.login(userData, token); // Utiliser le login du hook
  };

  const logout = () => {
    authHook.logout(); // Utiliser le logout du hook
    // Ne pas effacer les produits acceptés lors de la déconnexion
  };

  const updateUser = (data: Partial<User>) => {
    if (authHook.user) {
      const updatedUser = { ...authHook.user, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      authHook.updateUser(updatedUser);
    }
  };

  // Fonction pour ajouter un produit accepté
  const addAcceptedProduct = (productId: number) => {
    setAcceptedProducts(prev => {
      const newSet = new Set(prev);
      newSet.add(productId);
      return newSet;
    });
  };

  // Fonction pour effacer un produit accepté (après soumission de la déclaration)
  const clearAcceptedProduct = (productId: number) => {
    setAcceptedProducts(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
  };

  return (
    <AuthContext.Provider value={{
      user: authHook.user,
      isLoading: authHook.isLoading,
      login,
      logout,
      updateUser,
      dossierStatus: authHook.dossierStatus,
      updateDossierStatus: authHook.updateDossierStatus,
      acceptedProducts, // Exposer les produits acceptés
      addAcceptedProduct, // Exposer la fonction pour ajouter
      clearAcceptedProduct // Exposer la fonction pour effacer
    }}>
      <Router>
        <SessionExpiredHandler />
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup/exporter" element={<ExporterSignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPasswordWrapper />} />

            {/* Route de réinitialisation de mot de passe */}
            <Route path="/reset-password" element={<ResetPasswordWrapper />} />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/exportateur" element={
              <ProtectedRoute roles={['EXPORTATEUR']}>
                <ExporterSpace />
              </ProtectedRoute>
            } />
            <Route path="/declare-product" element={
              <ProtectedRoute roles={['EXPORTATEUR']}>
                <ProductDeclaration />
              </ProtectedRoute>
            } />
            <Route path="/declarations" element={
              <ProtectedRoute roles={['EXPORTATEUR']}>
                <DeclarationsList />
              </ProtectedRoute>
            } />
            <Route path="/importer" element={
              <ProtectedRoute roles={['IMPORTATEUR']}>
                <ImporterSpace />
              </ProtectedRoute>
            } />
            <Route path="/validator" element={
              <ProtectedRoute roles={['validator']}>
                <ValidatorSpace />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute roles={['ADMIN', 'validator']}>
                <DecisionAid />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminPanel />
              </ProtectedRoute>
            } />

            {/* Redirection par défaut */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;