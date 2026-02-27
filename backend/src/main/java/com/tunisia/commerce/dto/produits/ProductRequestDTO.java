package com.tunisia.commerce.dto.produits;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequestDTO {
    private String productType; // "alimentaire" or "industriel"
    private String category;
    private String hsCode;
    private String productName;
    private Boolean isLinkedToBrand; // Est-ce que le produit est lié à une marque ?
    private String brandName; // Nom de la marque
    private Boolean isBrandOwner; // Propriétaire de la marque ?
    private Boolean hasBrandLicense; // Disposez-vous d'une licence pour exploiter la marque ?
    private String productState; // État du produit (Brut, Transformé, etc.)
    private String originCountry; // Pays d'origine
    private String annualQuantityValue; // Quantité annuelle exportée (valeur)
    private String annualQuantityUnit; // Unité (Tonnes, Kilogrammes, etc.)
    private String commercialBrandName; // Marque commerciale (pour industriel)

    // For backward compatibility
    public String getHsCode() { return hsCode; }
    public String getProductCategory() { return category; }
    public String getProcessingType() { return productState; }
    public String getAnnualExportCapacity() {
        if (annualQuantityValue != null && annualQuantityUnit != null) {
            return annualQuantityValue + " " + annualQuantityUnit;
        }
        return null;
    }
}