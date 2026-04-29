import { Product } from "@/types/Product";
import { Document } from "@/types/Document";
import { DemandeHistory } from "@/types/DemandeHistory";

export interface DemandeEnregistrement {
  id: number;
  reference: string;
  status: DemandeStatus;
  submittedAt: string | null;
  paymentReference?: string | null;
  paymentAmount?: number | null;
  paymentStatus?: string;
  assignedTo?: number | null;
  decisionDate?: string | null;
  decisionComment?: string | null;
  numeroAgrement?: string | null;
  dateAgrement?: string | null;
  applicantType: 'IMPORTATEUR' | 'EXPORTATEUR';
  type: 'REGISTRATION' | 'PRODUCT_DECLARATION' | 'IMPORT';
  importateur?: any;
  exportateur?: any;
  products?: Product[];
  documents?: Document[];
  history?: DemandeHistory[];

  invoiceNumber?: string;
  invoiceDate?: string;
  amount?: string;
  currency?: string;
  incoterm?: string;
  transportMode?: 'MARITIME' | 'AERIEN' | 'TERRESTRE';
  loadingPort?: string;
  dischargePort?: string;
  arrivalDate?: string;

  step: number;
  currentValidator?: string;
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

export enum DemandeStatus {
  // Nouveaux statuts officiels
  BROUILLON = 'BROUILLON',
  SOUMISE = 'SOUMISE',
  EN_COURS_VALIDATION = 'EN_COURS_VALIDATION',
  EN_ATTENTE_INFO = 'EN_ATTENTE_INFO',
  VALIDEE = 'VALIDEE',
  REJETEE = 'REJETEE',
  SUSPENDUE = 'SUSPENDUE',
}