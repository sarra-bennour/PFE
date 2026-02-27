import React, { useEffect, useState, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ExporterSpace from './pages/ExporterSpace';
import ImporterSpace from './pages/ImporterSpace';
import ValidatorSpace from './pages/ValidatorSpace';
import DecisionAid from './pages/DecisionAid';
import AdminPanel from './pages/AdminPanel';
import ExporterSignUp from './pages/ExporterSignUp';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ProductDeclaration from './pages/ProductDeclaration';
import DeclarationsList from './pages/DeclarationsList';

// Define User types for the simulation
export type UserRole = 'EXPORTATEUR' | 'importer' | 'validator' | 'admin';
export type ExporterStatus = 'SIGNED_UP' | 'PROFILE_INCOMPLETE' | 'PAYMENT_PENDING' | 'PENDING_VERIFICATION' | 'VERIFIED';

export interface User {
  email: string;
  role: UserRole;
  status?: ExporterStatus;
  companyName?: string;
  phone?: string;
  isTwoFactorEnabled?: boolean;
  submissionDate?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUserStatus: (status: ExporterStatus) => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: UserRole[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isLoginPage = location.pathname === '/login';
  const isForgotPasswordPage = location.pathname === '/forgot-password';
  const isResetPasswordPage = location.pathname === '/reset-password'; // NOUVEAU
  const isAdminBackOffice = location.pathname === '/admin' && user?.role === 'admin';

  return (
    <div className="flex flex-col min-h-screen">
      {!isLoginPage && !isForgotPasswordPage && !isResetPasswordPage && !isAdminBackOffice && <Navbar />}
      <main className={`flex-grow ${isLoginPage || isForgotPasswordPage || isResetPasswordPage || isAdminBackOffice ? '' : 'container mx-auto px-4 py-8'}`}>
        {children}
      </main>
      {!isLoginPage && !isForgotPasswordPage && !isResetPasswordPage && !isAdminBackOffice && <Footer />}
    </div>
  );
};

// Wrapper pour ForgotPassword
const ForgotPasswordWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <ForgotPassword onBack={() => navigate('/login')} />;
};

// NOUVEAU: Wrapper pour la réinitialisation de mot de passe
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

// Importez useNavigate
import { useNavigate } from 'react-router-dom';

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const login = (userData: User) => setUser(userData);
  const logout = () => setUser(null);
  const updateUserStatus = (status: ExporterStatus) => {
    if (user) setUser({ ...user, status });
  };
  const updateUser = (data: Partial<User>) => {
    if (user) setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUserStatus, updateUser }}>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup/exporter" element={<ExporterSignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPasswordWrapper />} />
            
            {/* NOUVELLE ROUTE: Réinitialisation de mot de passe */}
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
              <ProtectedRoute roles={['importer']}>
                <ImporterSpace />
              </ProtectedRoute>
            } />
            <Route path="/validator" element={
              <ProtectedRoute roles={['validator']}>
                <ValidatorSpace />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute roles={['admin', 'validator']}>
                <DecisionAid />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
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