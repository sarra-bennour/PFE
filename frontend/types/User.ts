export type UserRole = 'EXPORTATEUR' | 'IMPORTATEUR' | 'VALIDATOR' | 'ADMIN';

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
  id?: number; // Ajout de l'ID utilisateur
}