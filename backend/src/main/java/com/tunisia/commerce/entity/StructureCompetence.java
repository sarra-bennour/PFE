// StructureCompetence.java
package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.ProductCategory;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "structure_competences",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"structure_id", "product_category"})
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StructureCompetence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_id", nullable = false)
    private StructureInterne structure;

    @Column(name = "product_category", nullable = false)
    private String productCategory; // "alimentaire", "industriel", "electronique", etc.

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true; // Est-ce que cette compétence est obligatoire?

    @Column(name = "validation_order")
    private Integer validationOrder; // Ordre de validation (ex: 1,2,3)

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}