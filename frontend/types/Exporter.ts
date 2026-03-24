import { Product } from "./Product";

export interface Exporter {
  id: string;
  name: string;
  companyName?: string;
  country: string;
  paysOrigine?: string;
  category: string;
  description: string;
  registration: string;
  numeroRegistreCommerce?: string;
  email: string;
  phone: string;
  telephone?: string;
  coverPhoto: string;
  profilePic: string;
  products: Product[];
  statutAgrement?: string;
  numeroAgrement?: string;
  siteType?: string;
  ville?: string;
  siteWeb?: string;
  representantLegal?: string;
}