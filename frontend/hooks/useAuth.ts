import { useState, useEffect } from 'react';
import { User } from '../types/User';
import { DossierStatus } from '../types/DossierStatus';


export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dossierStatus, setDossierStatus] = useState<DossierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        const parsedUser = JSON.parse(userData) as User;
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
        // Nettoyer les données corrompues
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('dossierStatus');
      }
    } else {
      console.log('ℹ️ Aucune session trouvée dans localStorage');
    }
    
    setIsLoading(false);
  }, []);

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
  const updateUser = (userData: Partial<User>): User | null => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log('👤 Utilisateur mis à jour:', updatedUser);
      return updatedUser;
    }
    return null;
  };

  const login = (userData: User, token: string): void => {
    console.log('🔐 Connexion - Données reçues:', userData);
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    
    console.log('✅ Connexion réussie');
  };

  const logout = (): void => {
      console.log('🚪 Déconnexion');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('dossierStatus');
      setUser(null);
      setIsAuthenticated(false);
      setDossierStatus(null);
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