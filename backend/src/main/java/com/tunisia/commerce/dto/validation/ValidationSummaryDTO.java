package com.tunisia.commerce.dto.validation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationSummaryDTO {
    private long totalDemandes;
    private long pendingDemandes;
    private long approvedDemandes;
    private long rejectedDemandes;
    private long moreInfoDemandes;
    private long exportateurDemandes;
    private long importateurDemandes;
    private long dossierConformite;      // DOS-
    private long declarationProduits;    // DEM-
    private long demandeImportation;     // IMP-
}