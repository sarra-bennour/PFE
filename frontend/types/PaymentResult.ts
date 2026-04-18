export interface PaymentResult {
  success: boolean;
  message: string;
  transactionId?: string;
  paymentReference?: string;
  amount?: number;
  status?: string;
}