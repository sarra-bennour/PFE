package com.tunisia.commerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ngp_codes",
        uniqueConstraints = @UniqueConstraint(name = "uk_ngp_code", columnNames = "ngp_code"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NgpCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngp_code", nullable = false, length = 10)
    private String ngpCode;  // Code à 10 chiffres

    @Column(name = "category_code", length = 2)
    private String categoryCode;  // 2 premiers chiffres

    @Column(name = "product_name_fr", length = 500)
    private String productNameFr;

    @Column(name = "product_name_ar", length = 500)
    private String productNameAr;

    @Column(name = "product_name_en", length = 500)
    private String productNameEn;

    @Column(name = "product_type")
    private String productType; // "ALIMENTAIRE" or "INDUSTRIEL"

    @Column(name = "duty_rate")
    private BigDecimal dutyRate;  // Taux de droit de douane

    @Column(name = "vat_rate")
    private BigDecimal vatRate;   // Taux de TVA (normal ou réduit)

    @Column(name = "additional_taxes_rate")
    private BigDecimal additionalTaxesRate;  // Taxes additionnelles

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "requires_authorization")
    @Builder.Default
    private Boolean requiresAuthorization = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}