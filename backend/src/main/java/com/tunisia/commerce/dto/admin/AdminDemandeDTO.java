package com.tunisia.commerce.dto.admin;

import com.tunisia.commerce.enums.*;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
public class AdminDemandeDTO {

    // Informations de base
    private Long id;
    private String reference;
    private TypeDemande typeDemande;
    private DemandeStatus status;
    private LocalDateTime submittedAt;

    // Informations de paiement
    private String paymentReference;
    private BigDecimal paymentAmount;
    private PaymentStatus paymentStatus;

    // Assignation
    private Long assignedToId;
    private String assignedToName;

    // Décision
    private LocalDateTime decisionDate;
    private String decisionComment;
    private String numeroAgrement;
    private LocalDate dateAgrement;

    // Type de demandeur
    private TypeDemandeur applicantType;

    // Informations du demandeur (importateur ou exportateur tunisien)
    private Long applicantId;
    private String applicantName;
    private String applicantEmail;
    private String applicantMatriculeFiscale;

    // Exportateur étranger (pour REGISTRATION et PRODUCT_DECLARATION)
    private Long exportateurEtrangerId;
    private String exportateurEtrangerNom;
    private String exportateurEtrangerPays;

    private boolean archived;
    private LocalDateTime archivedAt;
    private String archivedBy;  // email de l'admin ou référence système
    private String archiveReason;
    private ArchiveType archiveType;
    private boolean canBeRestored ;

    // Produits (pour PRODUCT_DECLARATION)
    private List<ProductAdminDTO> products;

    // Détails d'importation (pour IMPORT)
    private ImportDetailsDTO importDetails;

    // Documents
    private List<DocumentAdminDTO> documents;

    @Data
    @NoArgsConstructor
    public static class ImportDetailsDTO {
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private Double amount;
        private String currency;
        private String incoterm;
        private String transportMode;
        private String loadingPort;
        private String dischargePort;
        private LocalDate arrivalDate;
    }
}