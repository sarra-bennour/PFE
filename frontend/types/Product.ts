import { User } from "./User";
export type ProductType = 'alimentaire' | 'industriel' | 'ALIMENTAIRE' | 'INDUSTRIEL';


export interface Product {
  id: number ;
  backendId?: number;
  price?: string;
  productImage?: string | null;
  ngp?: string;
  productName?: string;
  annualQuantityValue?: string;
  annualQuantityUnit?: string;
  category?: string;
  productType?: ProductType;
  isLinkedToBrand?: boolean;
  brandName?: string;
  isBrandOwner?: boolean;
  hasBrandLicense?: boolean;
  productState?: string;
  originCountry?: string;
  commercialBrandName?: string;
  processingType?: string;
  annualExportCapacity?: string;
  exporter?: User;
}
