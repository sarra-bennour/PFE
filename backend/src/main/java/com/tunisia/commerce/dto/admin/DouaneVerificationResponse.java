package com.tunisia.commerce.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DouaneVerificationResponse {

    // Informations générales de la demande
    private String reference;
    private String typeDemande; // "REGISTRATION" ou "PRODUCT_DECLARATION"
    private String status;
    private String numeroAgrement;
    private LocalDate dateAgrement;
    private LocalDateTime submittedAt;
    private LocalDateTime decisionDate;
    private String decisionComment;

    // Informations exportateur (commun aux deux types)
    private String exportateurRaisonSociale;
    private String exportateurNom;
    private String exportateurPrenom;
    private String exportateurRepresentantLegal;
    private String exportateurPaysOrigine;
    private String exportateurNumeroRegistreCommerce;
    private String exportateurVille;
    private String exportateurAdresseLegale;
    private String exportateurEmail;
    private String exportateurTelephone;

    // Pour PRODUCT_DECLARATION - produits associés
    private List<ProductInfo> products;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductInfo {
        private Long id;
        private String productName;
        private String productType;
        private String hsCode;
        private String category;
        private String originCountry;
        private String brandName;
        private Double annualQuantityValue;
        private String annualQuantityUnit;
    }
}
