import { useState, useEffect } from 'react';

// Interface pour typer les statuts
interface DossierStatus {
  demandeStatus: string;
  paymentStatus: string;
  lastUpdated: string;
  demandeId?: number;
  reference?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dossierStatus, setDossierStatus] = useState<DossierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction de logout centralisée
  const performLogout = (reason?: string) => {
    console.log('🚪 Déconnexion', reason ? `- Raison: ${reason}` : '');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('dossierStatus');
    setUser(null);
    setIsAuthenticated(false);
    setDossierStatus(null);
  };

  useEffect(() => {
    // Récupérer les données du localStorage au chargement
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const savedStatus = localStorage.getItem('dossierStatus');

    console.log('🔄 useAuth - Lecture du localStorage:', { 
      hasToken: !!token, 
      hasUserData: !!userData,
      hasSavedStatus: !!savedStatus 
    });

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Restaurer les statuts du dossier s'ils existent
        if (savedStatus) {
          const parsedStatus = JSON.parse(savedStatus);
          setDossierStatus(parsedStatus);
          console.log('📦 Statuts restaurés depuis localStorage:', parsedStatus);
        }
        console.log('✅ Utilisateur restauré:', parsedUser);
      } catch (error) {
        console.error('❌ Erreur lors du parsing:', error);
        performLogout('Données corrompues');
      }
    } else {
      console.log('ℹ️ Aucune session trouvée dans localStorage');
    }
    
    setIsLoading(false);
  }, []);

  // Écouter l'événement de session expirée
  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      console.log('⏰ Session expirée détectée:', event.detail?.message);
      performLogout('Token expiré');
    };

    window.addEventListener('sessionExpired', handleSessionExpired as EventListener);

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired as EventListener);
    };
  }, []);

  // Vérifier périodiquement si le token est valide (optionnel)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenValidity = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        performLogout('Token manquant');
        return;
      }

      // Optionnel: Décoder le token JWT pour vérifier l'expiration
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        
        if (exp && exp < now) {
          console.log('⏰ Token expiré (vérification périodique)');
          performLogout('Token expiré');
          // Déclencher l'événement pour afficher l'alerte
          const sessionExpiredEvent = new CustomEvent('sessionExpired', {
            detail: { message: 'Votre session a expiré. Veuillez vous reconnecter.' }
          });
          window.dispatchEvent(sessionExpiredEvent);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du token:', error);
      }
    };

    // Vérifier toutes les minutes
    const interval = setInterval(checkTokenValidity, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Fonction pour mettre à jour les statuts du dossier
  const updateDossierStatus = (demandeStatus: string, paymentStatus: string, additionalData = {}) => {
    const newStatus = {
      demandeStatus,
      paymentStatus,
      lastUpdated: new Date().toISOString(),
      ...additionalData
    };
    
    localStorage.setItem('dossierStatus', JSON.stringify(newStatus));
    setDossierStatus(newStatus);
    
    console.log('💾 Statuts sauvegardés dans localStorage:', newStatus);
    return newStatus;
  };

  // Fonction pour mettre à jour l'utilisateur
  const updateUser = (userData) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log('👤 Utilisateur mis à jour:', updatedUser);
      return updatedUser;
    }
    return null;
  };

  const login = (userData, token) => {
    console.log('🔐 Connexion - Données reçues:', userData);
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    
    console.log('✅ Connexion réussie');
  };

  const logout = () => {
    performLogout('Déconnexion manuelle');
  };

  return { 
    user, 
    isAuthenticated, 
    dossierStatus,
    isLoading,
    updateUser,
    updateDossierStatus,
    login, 
    logout 
  };
};