
export enum RequestStatus {
  BROULLION = 'BROULLION',
  SOUMISE = 'SOUMISE',
  VALIDEE = 'VALIDEE',
  REJETEE = 'REJETEE',
  SUSPENDUE = 'SUSPENDUE',
  EN_COURS_VALIDATION = 'EN_COURS_VALIDATION',
  EN_ATTENTE_INFO = 'EN_ATTENTE_INFO',
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
