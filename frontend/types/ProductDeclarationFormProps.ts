import { Product } from "./Product";
import { User } from "./User";

export interface ProductDeclarationFormProps {
  product: Product;
  exporter: User;
  onClose: () => void;
  onSuccess: () => void;
  onDeclarationCreated?: (declarationId: number) => void;
}

export interface ProductDeclarationDemande {
  exportateurEtranger?: string; // nom prenom exportateur
  products: Product[];
}