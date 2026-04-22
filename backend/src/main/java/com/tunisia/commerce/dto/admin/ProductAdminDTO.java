package com.tunisia.commerce.dto.admin;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ProductAdminDTO {
    private Long id;
    private String productName;
    private String productType;      // ALIMENTAIRE / INDUSTRIEL
    private String category;
    private String hsCode;
    private Boolean isLinkedToBrand;
    private String brandName;
    private Boolean isBrandOwner;
    private Boolean hasBrandLicense;
    private String productState;     // NEUF / OCCASION
    private String originCountry;
    private Double annualQuantityValue;
    private String annualQuantityUnit;
    private String commercialBrandName;
    private String productImage;
}