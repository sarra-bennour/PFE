import axios from 'axios';

// Variable pour suivre si le logout est déjà en cours
let isLoggingOut = false;

// Configuration de base d'axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur de requête - Ajoute le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse - Gère les erreurs d'authentification
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si l'erreur est 401 (Unauthorized) et que ce n'est pas une requête de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Éviter les multiples tentatives de logout
      if (isLoggingOut) {
        return Promise.reject(error);
      }

      isLoggingOut = true;

      // Déclencher l'événement de session expirée
      const sessionExpiredEvent = new CustomEvent('sessionExpired', {
        detail: { message: error.response?.data?.message || 'Session expirée' }
      });
      window.dispatchEvent(sessionExpiredEvent);

      // Nettoyer le localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('dossierStatus');
      
      // Réinitialiser le flag après un délai
      setTimeout(() => {
        isLoggingOut = false;
      }, 1000);

      return Promise.reject(new Error('Session expirée'));
    }

    return Promise.reject(error);
  }
);

export default api;