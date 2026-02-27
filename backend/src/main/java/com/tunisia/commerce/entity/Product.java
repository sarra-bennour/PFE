package com.tunisia.commerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_type")
    private String productType; // "alimentaire" or "industriel"

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "hs_code", nullable = false)
    private String hsCode;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "is_linked_to_brand")
    private Boolean isLinkedToBrand;

    @Column(name = "brand_name")
    private String brandName;

    @Column(name = "is_brand_owner")
    private Boolean isBrandOwner;

    @Column(name = "has_brand_license")
    private Boolean hasBrandLicense;

    @Column(name = "product_state")
    private String productState;

    @Column(name = "origin_country", nullable = false)
    private String originCountry;

    @Column(name = "annual_quantity_value")
    private String annualQuantityValue;

    @Column(name = "annual_quantity_unit")
    private String annualQuantityUnit;

    @Column(name = "commercial_brand_name")
    private String commercialBrandName;

    @ManyToOne
    @JoinColumn(name = "exportateur_id")
    private ExportateurEtranger exportateur;
}