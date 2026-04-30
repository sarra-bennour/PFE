export interface AuditLog {
    id:number;
  action: string;
  actionType: string;
  description: string;
  entityType: string;
  entityId: string;
  entityReference: string;
  userId: string;
  userEmail: string;
  userRole: string;
  userIpAddress: string;
  userAgent: string;
  details: any;
  status: string;
  errorMessage?: string;
  performedAt: string;
  sessionId: string;
  requestId: string;
}