import { Exporter } from "./Exporter";

export interface Product {
  id?: number;
  name: string;
  price?: string;
  image?: string | null;
  ngp?: string;
  productName?: string;
  hsCode?: string;
  annualQuantityValue?: string;
  annualQuantityUnit?: string;
  category?: string;
  exporter?: Exporter;
}
