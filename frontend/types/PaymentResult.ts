export interface PaymentResult {
  success: boolean;
  message: string;
  transactionId?: string;
  paymentReference?: string;
  amount?: number;
  status?: string;
}

export enum PaymentStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  INITIE = 'INITIE',
  REUSSI = 'REUSSI',
  ECHEC = 'ECHEC',
  REMBOURSE = 'REMBOURSE'
}