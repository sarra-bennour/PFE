export interface NotificationData {
  id: number;
  sender: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    raisonSociale?: string;
    companyName?: string;
  };
  receiver: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    raisonSociale?: string;
    companyName?: string;
  };
  title: string;
  notificationType: string;
  status: string;
  action: string;
  readAt: string | null;
  createdAt: string;
  targetEntityType: string;
  targetEntityId: number;
  isEmailSent: boolean;
  isSmsSent: boolean;
  isUnread: boolean;
}
