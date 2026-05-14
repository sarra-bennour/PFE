package com.tunisia.commerce.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTransactionDTO {
    private String transactionId;
    private String paymentIntentId;
    private String chargeId;
    private Double amount;
    private String currency;
    private String status;
    private String description;
    private String customerEmail;
    private String customerName;
    private String paymentMethod;
    private String paymentMethodType;
    private String cardBrand;
    private String cardLast4;
    private String failureCode;
    private String failureMessage;
    private LocalDateTime created;
    private LocalDateTime paidAt;
    private String demandeReference;
    private Long demandeId;
    private String userRole;
    private Long userId;
    private Map<String, String> metadata;
}