package com.tunisia.commerce.dto.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogFilterDTO {
    private String action;
    private String actionType;
    private String entityType;
    private Long entityId;
    private String userEmail;
    private String status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String searchTerm;
    @Builder.Default
    private int page = 0;
    @Builder.Default
    private int size = 20;
}