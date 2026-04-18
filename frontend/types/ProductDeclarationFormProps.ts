import { Product } from "./Product";
import { User } from "./User";

export interface ProductDeclarationFormProps {
  product: Product;
  exporter: User;
  onClose: () => void;
  onSuccess: () => void;
  onDeclarationCreated?: (declarationId: number) => void;
}