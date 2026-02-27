package com.tunisia.commerce.dto.produits;

import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.PaymentStatus;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
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
    private String paymentReference;
    private BigDecimal paymentAmount;
    private PaymentStatus paymentStatus;
    private Long assignedTo;
    private LocalDateTime decisionDate;
    private String decisionComment;
    private String numeroAgrement;
    private LocalDateTime dateAgrement;
    private UserDTO exportateur;
    private List<ProduitDTO> products;
    private List<DocumentDTO> documents;
    private List<DemandeHistoryDTO> history;
}