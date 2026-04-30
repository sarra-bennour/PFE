package com.tunisia.commerce.dto.audit;

import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.enums.UserRole;
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
public class AuditLogDTO {
    private Long id;
    private String action;
    private ActionType actionType;
    private String description;
    private EntityType entityType;
    private Long entityId;
    private String entityReference;
    private Long userId;
    private String userEmail;
    private String userRole;
    private String userIpAddress;
    private String userAgent;
    private Map<String, Object> details;
    private String status;
    private String errorMessage;
    private LocalDateTime performedAt;
    private String sessionId;
    private String requestId;
}