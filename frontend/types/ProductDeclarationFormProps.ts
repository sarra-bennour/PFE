import { Product } from "./Product";
import { Exporter } from "./Exporter";

export interface ProductDeclarationFormProps {
  product: Product;
  exporter: Exporter;
  onClose: () => void;
  onSuccess: () => void;
}