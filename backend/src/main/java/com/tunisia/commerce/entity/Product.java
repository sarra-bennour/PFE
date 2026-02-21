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

    @Column(name = "hs_code", nullable = false)
    private String hsCode; // Code NGP

    @Column(name = "product_category", nullable = false)
    private String productCategory;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "brand_name")
    private String brandName;

    @Column(name = "is_brand_owned")
    private Boolean isBrandOwned;

    @Column(name = "has_brand_license")
    private Boolean hasBrandLicense;

    @Column(name = "processing_type")
    private String processingType;

    @Column(name = "annual_export_capacity")
    private String annualExportCapacity;

    @ManyToOne
    @JoinColumn(name = "exportateur_id")
    private ExportateurEtranger exportateur;

    /*@OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<ProductDocument> documents = new ArrayList<>();*/
}
