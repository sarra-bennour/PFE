package com.tunisia.commerce.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponseDTO {
    private boolean success;
    private String message;
    private String transactionId;
    private String paymentReference;
    private Double amount;
    private LocalDateTime paymentDate;
    private String status;
    private String receiptUrl;
    private LocalDateTime timestamp;
}