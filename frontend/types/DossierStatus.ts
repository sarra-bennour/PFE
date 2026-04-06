export interface DossierStatus {
  demandeStatus: string;
  paymentStatus: string;
  lastUpdated: string;
  demandeId?: number;
  reference?: string;
}