// hooks/useAuth.ts - Version corrigée
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

  useEffect(() => {
    // Récupérer les données du localStorage au chargement
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const savedStatus = localStorage.getItem('dossierStatus');

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
      } catch (error) {
        console.error('Erreur lors du parsing:', error);
        logout();
      }
    }
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
  };

  const login = (userData, token) => {
    console.log('Données reçues par le hook:', userData);
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('dossierStatus'); // Nettoyer aussi les statuts
    setUser(null);
    setIsAuthenticated(false);
    setDossierStatus(null);
  };

  return { 
    user, 
    isAuthenticated, 
    dossierStatus,
    updateDossierStatus, // Maintenant bien exporté
    login, 
    logout 
  };
};