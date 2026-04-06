export type UserRole = 'EXPORTATEUR' | 'IMPORTATEUR' | 'INSTANCE_VALIDATION' | 'ADMIN';

export interface User {
  email: string;
  role: UserRole;
  companyName?: string;
  legalRep?: string;
  phone?: string;
  isTwoFactorEnabled?: boolean;
  submissionDate?: string;
  // Champs spécifiques aux exportateurs
  raisonSociale?: string;
  paysOrigine?: string;
  numeroRegistreCommerce?: string;
  adresseLegale?: string;
  ville?: string;
  siteWeb?: string;
  representantLegal?: string;
  numeroTVA?: string;
  emailVerified?: boolean;
  // Champs spécifiques aux importateurs
  mobileIdMatricule?: string;
  mobileIdPin?: string;
  // Champs spécifiques aux instances de validation
  nomOfficiel?: string;
  codeMinistere?: string;
  typeAutorite?: string;
  slaTraitementJours?: number;
  id?: number;
}