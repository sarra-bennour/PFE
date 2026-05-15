import axios from 'axios';
import { ProductAdditionData } from '../types/ProductAdditionData';
import { NotificationData } from '../types/NotificationData';
import { NotificationActionData } from '../types/NotificationActionData';

const API_BASE_URL = '/api';

const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
};

export const notificationService = {
  // Créer une notification pour l'ajout de produit
  createProductAdditionNotification: async (data: ProductAdditionData): Promise<NotificationData> => {
    const token = getAuthToken();
    const response = await axios.post(`${API_BASE_URL}/notifications/product-addition`, data, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  },

  // Récupérer les notifications non lues d'un utilisateur
  getUnreadNotifications: async (userId: number): Promise<NotificationData[]> => {
    const token = getAuthToken();
    const response = await axios.get(`${API_BASE_URL}/notifications/user/${userId}/unread`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  },

  // Récupérer le nombre de notifications non lues
  getUnreadCount: async (userId: number): Promise<number> => {
    const token = getAuthToken();
    const response = await axios.get(`${API_BASE_URL}/notifications/user/${userId}/unread-count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.count;
  },

  // Marquer une notification comme lue
  markAsRead: async (notificationId: number): Promise<void> => {
    const token = getAuthToken();
    await axios.put(`${API_BASE_URL}/notifications/${notificationId}/read`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // Traiter une action sur une notification
  handleNotificationAction: async (data: NotificationActionData): Promise<void> => {
    const token = getAuthToken();
    await axios.post(`${API_BASE_URL}/notifications/${data.notificationId}/action`, data, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // Récupérer toutes les notifications d'un utilisateur
  getUserNotifications: async (userId: number, page: number = 0, size: number = 20): Promise<NotificationData[]> => {
    const token = getAuthToken();
    const response = await axios.get(`${API_BASE_URL}/notifications/user/${userId}?page=${page}&size=${size}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.content;
  }
};