export interface NotificationActionData {
  notificationId: number;
  action: 'ACCEPT' | 'REJECT';
  comment?: string;
}