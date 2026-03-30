import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { notificationService } from '../services/notificationService';
import { NotificationActionData } from '../types/NotificationActionData';
import { NotificationData } from '../types/NotificationData';

interface NotificationProps {
  onNotificationAction?: (action: 'ACCEPT' | 'REJECT', notification: NotificationData) => void;
  onNotificationClick?: (notification: NotificationData) => void;
  onNotificationRead?: () => void;
}

const Notification: React.FC<NotificationProps> = ({ onNotificationAction, onNotificationClick, onNotificationRead }) => {
  const { user } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    
    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Erreur lors du chargement du compteur:', error);
    }
  };

  // 🔥 CORRECTION: Utiliser getUserNotifications au lieu de getNotifications
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await notificationService.getUserNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, status: 'LU' } 
          : notif
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const handleAction = async (notificationId: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      const actionData: NotificationActionData = {
        notificationId,
        action
      };
      await notificationService.handleNotificationAction(actionData);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (onNotificationAction) {
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
          onNotificationAction(action, notification);
        }
      }
      
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error('Erreur lors du traitement de l\'action:', error);
    }
  };

  const handleNotificationClick = async (notification: NotificationData) => {
    if (notification.status === 'NON_LU') {
      await markAsRead(notification.id);
    }
    
    setShowNotifications(false);
    
    if (notification.notificationType === 'ACTION' && notification.action === 'ACCEPT') {
      window.dispatchEvent(new CustomEvent('acceptedNotification', { 
        detail: notification 
      }));
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    return `Il y a ${diffDays} jours`;
  };

  const getSenderName = (notification: NotificationData) => {
    if (notification.sender.raisonSociale) {
      return notification.sender.raisonSociale;
    }
    if (notification.sender.companyName) {
      return notification.sender.companyName;
    }
    return `${notification.sender.prenom} ${notification.sender.nom}`;
  };

  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
      
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  const getIconForType = (type: string, action?: string) => {
    if (type === 'ACTION') {
      if (action === 'ACCEPT') {
        return { icon: 'fa-check-circle', color: 'text-emerald-500' };
      }
      if (action === 'REJECT') {
        return { icon: 'fa-times-circle', color: 'text-red-500' };
      }
      return { icon: 'fa-plus-circle', color: 'text-tunisia-red' };
    }
    return { icon: 'fa-bell', color: 'text-blue-500' };
  };

  const getNotificationTitle = (notification: NotificationData) => {
    if (notification.notificationType === 'ACTION' && notification.action === 'ACCEPT') {
      return "Demande acceptée";
    }
    if (notification.notificationType === 'ACTION' && notification.action === 'REJECT') {
      return "Demande refusée";
    }
    return notification.title;
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-all group ${
          showNotifications ? 'border-tunisia-red bg-tunisia-red/5' : 'bg-slate-50 border-slate-100 hover:border-tunisia-red'
        }`}
      >
        <i className={`fas fa-bell text-[10px] transition-colors ${showNotifications ? 'text-tunisia-red' : 'text-slate-500 group-hover:text-tunisia-red'}`}></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-tunisia-red rounded-full flex items-center justify-center text-white text-[8px] font-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          <div 
            className="fixed inset-0 z-[110]" 
            onClick={() => setShowNotifications(false)}
          ></div>
          <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[120] animate-fade-in-scale">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Notifications</h4>
              <span className="text-[8px] font-black uppercase tracking-widest text-tunisia-red">
                {unreadCount} Non lue{unreadCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <i className="fas fa-spinner fa-spin text-slate-400"></i>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <i className="fas fa-bell-slash text-slate-300 text-3xl mb-3"></i>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Aucune notification
                  </p>
                </div>
              ) : (
                notifications.map(notif => {
                  const { icon, color } = getIconForType(notif.notificationType, notif.action);
                  const isClickable = notif.notificationType === 'ACTION' && 
                                      (notif.action === 'ACCEPT' || notif.action === 'REJECT');
                  const isUnread = notif.status === 'NON_LU';
                  
                  return (
                    <div 
                      key={notif.id} 
                      className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex flex-col gap-3 group ${
                        isClickable ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        if (isClickable) {
                          handleNotificationClick(notif);
                        }
                      }}
                    >
                      <div className="flex gap-4 items-start">
                        <div className={`w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                          <i className={`fas ${icon} text-[10px] ${color}`}></i>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <span className={`text-[10px] uppercase tracking-tight leading-tight ${
                            isUnread ? 'text-slate-900 font-black' : 'text-slate-500 font-bold'
                          }`}>
                            {getNotificationTitle(notif)}
                          </span>
                          {notif.notificationType !== 'ACTION' && (
                            <span className={`text-[9px] font-medium ${
                              isUnread ? 'text-slate-600' : 'text-slate-400'
                            }`}>
                              De: {getSenderName(notif)}
                            </span>
                          )}
                          <span className={`text-[8px] font-bold uppercase tracking-widest ${
                            isUnread ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>
                        {isUnread && (
                          <div className="w-2 h-2 bg-tunisia-red rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                      {notif.notificationType === 'ACTION' && notif.action === 'PENDING' && (
                        <div className="flex gap-2 ml-12">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(notif.id, 'ACCEPT');
                            }}
                            className="flex-1 py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-tunisia-red transition-colors"
                          >
                            Accepter
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(notif.id, 'REJECT');
                            }}
                            className="flex-1 py-2 bg-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            Rejeter
                          </button>
                        </div>
                      )}
                      {notif.status === 'NON_LU' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-tunisia-red text-right"
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <button 
              onClick={() => {
                window.location.href = '/notifications';
              }}
              className="w-full py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-tunisia-red hover:bg-slate-50 transition-all border-t border-slate-50"
            >
              Voir tout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Notification;