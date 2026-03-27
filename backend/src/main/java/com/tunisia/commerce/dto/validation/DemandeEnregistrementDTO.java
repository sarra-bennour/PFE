package com.tunisia.commerce.dto.validation;

import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.PaymentStatus;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandeEnregistrementDTO {
    private Long id;
    private String reference;
    private DemandeStatus status;
    private LocalDateTime submittedAt;
    private LocalDateTime decisionDate;
    private LocalDate dateAgrement;
    private String paymentReference;
    private BigDecimal paymentAmount;
    private PaymentStatus paymentStatus;
    private Long assignedTo;
    private String decisionComment;
    private String numeroAgrement;

    private String invoiceNumber;
    private LocalDate invoiceDate;
    private BigDecimal amount;
    private String currency;
    private String incoterm;
    private String transportMode;
    private String loadingPort;
    private String dischargePort;
    private LocalDate arrivalDate;

    // Informations exportateur simplifiées
    private ExportateurSimpleDTO exportateur;

    // Statistiques
    private int documentsCount;
    private int documentsValidesCount;
    private int documentsRejetesCount;
}
