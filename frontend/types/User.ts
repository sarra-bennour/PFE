import { Product } from "./Product";

export enum UserRoleType {
  EXPORTATEUR = 'EXPORTATEUR',
  IMPORTATEUR = 'IMPORTATEUR',
  INSTANCE_VALIDATION = 'INSTANCE_VALIDATION',
  ADMIN = 'ADMIN'
}

export type UserRole = 'EXPORTATEUR' | 'IMPORTATEUR' | 'INSTANCE_VALIDATION' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  
  // Champs de base
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  statut?: 'ACTIF' | 'INACTIF' | 'EN_ATTENTE' | string | null;
  
  // Champs spécifiques aux exportateurs
  raisonSociale?: string | null;
  companyName?: string | null;  // Pour compatibilité avec le front
  paysOrigine?: string | null;
  numeroRegistreCommerce?: string | null;
  adresseLegale?: string | null;
  ville?: string | null;
  siteWeb?: string | null;
  representantLegal?: string | null;
  numeroTVA?: string | null;
  
  // Champs d'agrément
  statutAgrement?: string | null;
  dateAgrement?: string | null;
  numeroAgrement?: string | null;
  numeroOfficielEnregistrement?: string | null;
  
  // Dates
  dateCreation?: string;
  lastLogin?: string;
  updatedAt?: string | null;
  
  // Sécurité
  twoFactorEnabled?: boolean;
  isTwoFactorEnabled?: boolean;  // Pour compatibilité
  emailVerified?: boolean;
  
  // Documents
  documentsCount?: number;
  preKycCompleted?: boolean;
  preKycCompletedAt?: string | null;
  
  // Champs optionnels
  submissionDate?: string;
  userStatut?: 'ACTIF' | 'INACTIF' | 'EN_ATTENTE';
  
  // Champs spécifiques aux instances (null pour exportateur)
  structureId?: number ;
  structureName?: string | null;
  structureCode?: string | null;
  structureType?: string | null;
  slaTraitementJours?: number | null;
  products?: Product[];
  
  
  // Champs importateur (null pour exportateur)
  mobileIdMatricule?: string | null;
  mobileIdPin?: string | null;
  
  // Autres
  capaciteAnnuelle?: number | null;
  produits?: any | null;
  siteType?: string | null;
  representantEmail?: string | null;
  representantRole?: string | null;
  username?: string | null;
  verificationToken?: string | null;
  verificationTokenExpiry?: string | null;

}

export interface ExporterDirectoryProps {
  externalSearchQuery?: string;
  onClearSearch?: () => void;
}