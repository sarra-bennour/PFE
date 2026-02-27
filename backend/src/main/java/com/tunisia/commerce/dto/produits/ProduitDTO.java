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
public class ProduitDTO {
    private Long id;
    private String productType; // "alimentaire" or "industriel"
    private String category;
    private String hsCode;
    private String productName;
    private Boolean isLinkedToBrand;
    private String brandName;
    private Boolean isBrandOwner;
    private Boolean hasBrandLicense;
    private String productState; // État du produit
    private String originCountry;
    private String annualQuantityValue;
    private String annualQuantityUnit;
    private String commercialBrandName; // Pour industriel

    // Métadonnées supplémentaires (for backward compatibility)
    private String processingType;
    private String annualExportCapacity;
    private String quantity;
    private String unit;
    private BigDecimal totalValue;
    private String storagePoints;
}