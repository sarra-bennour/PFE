package com.tunisia.commerce.dto.produits;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProduitDTO {
    private String hsCode;           // Code NGP
    private String categorie;         // Catégorie du produit
    private String nom;               // Nom du produit
    private String marque;            // Marque (optionnel)
    private Boolean isBrandOwned;     // Marque détenue ?
    private Boolean hasBrandLicense;  // Licence de marque ?
    private String processingType;    // Type de transformation
    private String annualExportCapacity; // Capacité annuelle d'exportation
}