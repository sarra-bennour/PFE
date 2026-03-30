import React,{ useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FormAlert from './FormAlert'; // 👈 Utilisez votre composant existant

export const SessionExpiredHandler: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      const message = event.detail?.message || 'Votre session a expiré. Veuillez vous reconnecter.';
      
      // Afficher l'alerte
      setAlertMessage(message);
      setShowAlert(true);
      
      // Effectuer le logout
      logout();
      
      // Rediriger vers la page de login après un court délai
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            sessionExpired: true, 
            message: message 
          } 
        });
      }, 2000); // Attendre 2 secondes pour que l'utilisateur voie l'alerte
    };

    window.addEventListener('sessionExpired', handleSessionExpired as EventListener);

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired as EventListener);
    };
  }, [logout, navigate]);

  // Ne pas afficher l'alerte si elle est fermée ou si on n'est plus sur la page
  if (!showAlert) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <FormAlert
        message={alertMessage}
        type="error"
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
};