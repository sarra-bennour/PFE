export interface CreateInstanceValidationResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    role: string;
    statut: string;
    nomOfficiel: string;
    codeMinistere: string;
    typeAutorite: string;
    slaTraitementJours: number;
    dateCreation: string;
  };
}