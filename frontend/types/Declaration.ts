import { RequestStatus } from '../types';

export interface Declaration {
  id: string;
  demandeId: number;
  date: string;
  exporter: string;
  product: string;
  status: RequestStatus;
  ngp: string;
  value: string;
  weight?: string;
  origin?: string;
  transport?: string;
  // ✅ Nouveaux champs pour les détails supplémentaires
  invoiceNumber?: string;
  invoiceDate?: string;
  incoterm?: string;
  loadingPort?: string;
  dischargePort?: string;
  arrivalDate?: string;
  currency?: string;
} 

export interface ImporterTrackingProps {
  onModalOpen?: (isOpen: boolean, content?: React.ReactNode) => void;
}