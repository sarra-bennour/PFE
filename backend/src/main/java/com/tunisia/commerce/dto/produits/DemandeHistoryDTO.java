package com.tunisia.commerce.dto.produits;

import com.tunisia.commerce.enums.DemandeStatus;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandeHistoryDTO {
    private Long id;
    private DemandeStatus oldStatus;
    private DemandeStatus newStatus;
    private String action;
    private String comment;
    private String performedBy;
    private LocalDateTime performedAt;
}