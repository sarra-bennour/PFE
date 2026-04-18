export interface PreKycData {
  username: string;
  officialRegistrationNumber: string;
  siteType: 'SIEGE' | 'USINE' | 'ENTREPOT' | 'DISTRIBUTEUR' | '';
  representativeRole: string;
  representativeEmail: string;
  annualCapacity: string;
  numeroTVA: string;
}