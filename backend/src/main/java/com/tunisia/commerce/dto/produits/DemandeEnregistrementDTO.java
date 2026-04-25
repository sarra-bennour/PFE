package com.tunisia.commerce.dto.produits;

import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.PaymentStatus;
import com.tunisia.commerce.enums.TypeDemande;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandeEnregistrementDTO {
    private Long id;
    private String reference;
    private DemandeStatus status;
    private LocalDateTime submittedAt;
    private String paymentReference;
    private BigDecimal paymentAmount;
    private PaymentStatus paymentStatus;
    private Long assignedTo;
    private LocalDateTime decisionDate;
    private String decisionComment;
    private String numeroAgrement;
    private LocalDateTime dateAgrement;
    private TypeDemande typeDemande;

    private String invoiceNumber;
    private LocalDate invoiceDate;
    private Double amount;
    private String currency;
    private String incoterm;
    private String transportMode;
    private String loadingPort;
    private String dischargePort;
    private LocalDate arrivalDate;

    private List<ProduitDTO> products;
    private List<DocumentDTO> documents;
    private List<DemandeHistoryDTO> history;
    private List<Map<String, Object>> validationStatuses; // Statuts individuels par validateur

}