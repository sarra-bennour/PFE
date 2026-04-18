export interface DeactivationRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  companyName: string;
  reason: string;
  requestType: string;
  status: string;
  requestDate: string;
  urgent: boolean;
}