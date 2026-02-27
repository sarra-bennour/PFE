package com.tunisia.commerce.dto.produits;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandeEnregistrementRequestDTO {
    private Long exportateurId;
    private List<ProductRequestDTO> products;
    private List<DocumentRequestDTO> documents;
    private PaymentInfoDTO paymentInfo;
}