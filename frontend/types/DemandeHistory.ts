export interface DemandeHistory {
  id: number;
  action: string;
  comment: string;
  oldStatus: string;
  newStatus: string;
  performedBy: string;
  performedAt: string;
}