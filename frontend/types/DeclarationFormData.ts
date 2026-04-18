import { Product } from './Product';

export interface DeclarationFormData {
  products: Product[];
  files: Record<string, File | null>;
  productImages: { [productId: number]: File }; // Images des produits
}