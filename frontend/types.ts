
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  REVISION = 'REVISION'
}

export interface Exporter {
  id: string;
  companyName: string;
  country: string;
  activitySector: string;
  status: RequestStatus;
  registrationDate: string;
}

export interface ImportDeclaration {
  id: string;
  exporterId: string;
  importerName: string;
  productDescription: string;
  ngpCode: string;
  status: RequestStatus;
  date: string;
}
