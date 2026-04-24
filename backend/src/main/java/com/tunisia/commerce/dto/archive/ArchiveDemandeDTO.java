package com.tunisia.commerce.dto.archive;

import com.tunisia.commerce.enums.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArchiveDemandeDTO {
    private Long id;
    private String reference;
    private DemandeStatus status;
    private LocalDateTime submittedAt;
    private String paymentReference;
    private BigDecimal paymentAmount;
    private PaymentStatus paymentStatus;
    private String assignedTo;
    private LocalDateTime decisionDate;
    private String decisionComment;
    private String numeroAgrement;
    private LocalDate dateAgrement;
    private TypeDemandeur applicantType;
    private TypeDemande type;

    // Exportateur
    private Long exportateurId;
    private String exportateurNom;
    private String exportateurPays;
    private String exportateurEmail;

    // Importateur
    private Long importateurId;
    private String importateurNom;
    private String importateurEmail;

    // Champs d'archivage
    private boolean archived;
    private LocalDateTime archivedAt;
    private String archivedBy;
    private String archiveReason;
    private ArchiveType archiveType;
    private boolean canBeRestored;
}