package com.tunisia.commerce.dto.produits;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentInfoDTO {
    private String paymentReference;
    private BigDecimal paymentAmount;
    private String paymentMethod;
}