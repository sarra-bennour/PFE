package com.tunisia.commerce.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductAdditionNotificationDTO {
    private Long importerId;
    private String importerName;
    private Long exporterId;
    private String exporterName;
    private Long productId;
    private String productName;
    private String productPrice;
    private String productNgp;
    private Long declarationId;
    private String message;
}