import { Product } from "@/types/Product";
import { Document } from "@/types/Document";
import { DemandeHistory } from "@/types/DemandeHistory";

export interface DemandeEnregistrement {
  id: number;
  reference: string;
  status: string;
  submittedAt: string | null;
  paymentReference?: string | null;
  paymentAmount?: number | null;
  paymentStatus?: string;
  assignedTo?: number | null;
  decisionDate?: string | null;
  decisionComment?: string | null;
  numeroAgrement?: string | null;
  dateAgrement?: string | null;
  exportateur?: any;
  products?: Product[];
  documents?: Document[];
  history?: DemandeHistory[];
}


export interface ImportDetails {
  invoiceNum: string;
  invoiceDate: string;
  amount: string;
  currency: string;
  incoterm: 'EXW' | 'FOB' | 'CIF';
  transportMode: 'AIR' | 'SEA' | 'ROAD';
  departurePort: string;
  arrivalPort: string;
  arrivalDate: string;
}

export interface DossierResponse {
  success: boolean;
  message: string;
  timestamp: string;
  hasDossier: boolean;
  demandeId?: number;
  status?: string;
  paymentStatus?: string;
  reference?: string;
}

export interface DemandeResponse {
  id: number;
  reference: string;
  status: string;
  products: Product[];
}