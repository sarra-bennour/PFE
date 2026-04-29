package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.entity.AuditLog;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    // ThreadLocal pour le requestId (trace une requête complète)
    private static final ThreadLocal<String> currentRequestId = new ThreadLocal<>();

    /**
     * Méthode principale d'enregistrement d'audit - à utiliser partout
     */
    @Transactional
    public void log(AuditLogBuilder builder) {
        try {
            AuditLog auditLog = builder.build();
            enrichWithRequestData(auditLog);
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Erreur lors de l'enregistrement de l'audit: {}", e.getMessage());
            // Ne pas interruption l'application si l'audit échoue
        }
    }

    /**
     * Enrichit l'audit avec les données de la requête HTTP
     */
    private void enrichWithRequestData(AuditLog auditLog) {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                auditLog.setUserIpAddress(getClientIp(request));
                auditLog.setUserAgent(request.getHeader("User-Agent"));
                auditLog.setSessionId(request.getSession().getId());
            }
        } catch (Exception e) {
            log.debug("Impossible d'enrichir avec les données de requête: {}", e.getMessage());
        }

        // RequestId pour tracer une requête complète
        if (currentRequestId.get() == null) {
            currentRequestId.set(UUID.randomUUID().toString());
        }
        auditLog.setRequestId(currentRequestId.get());
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    /**
     * Nettoie le ThreadLocal à la fin de la requête
     */
    public static void clearRequestId() {
        currentRequestId.remove();
    }

    /**
     * Builder pour faciliter la création d'audit logs
     */
    public static class AuditLogBuilder {
        private String action;
        private ActionType actionType;
        private String description;
        private EntityType entityType;
        private Long entityId;
        private String entityReference;
        private Long userId;
        private String userEmail;
        private String userRole;
        private String status = "SUCCESS";
        private String errorMessage;
        private Map<String, Object> details = new HashMap<>();

        public static AuditLogBuilder builder() {
            return new AuditLogBuilder();
        }

        public AuditLogBuilder action(String action) {
            this.action = action;
            return this;
        }

        public AuditLogBuilder actionType(ActionType actionType) {
            this.actionType = actionType;
            return this;
        }

        public AuditLogBuilder description(String description) {
            this.description = description;
            return this;
        }

        public AuditLogBuilder entity(EntityType entityType, Long entityId, String entityReference) {
            this.entityType = entityType;
            this.entityId = entityId;
            this.entityReference = entityReference;
            return this;
        }

        public AuditLogBuilder user(Long userId, String userEmail, String userRole) {
            this.userId = userId;
            this.userEmail = userEmail;
            this.userRole = userRole;
            return this;
        }

        public AuditLogBuilder success() {
            this.status = "SUCCESS";
            return this;
        }

        public AuditLogBuilder failure(String errorMessage) {
            this.status = "FAILURE";
            this.errorMessage = errorMessage;
            return this;
        }

        public AuditLogBuilder detail(String key, Object value) {
            this.details.put(key, value);
            return this;
        }

        public AuditLogBuilder details(Map<String, Object> details) {
            this.details.putAll(details);
            return this;
        }

        public AuditLog build() {
            AuditLog auditLog = AuditLog.builder()
                    .action(action)
                    .actionType(actionType)
                    .description(description)
                    .entityType(entityType)
                    .entityId(entityId)
                    .entityReference(entityReference)
                    .userId(userId)
                    .userEmail(userEmail)
                    .userRole(userRole)
                    .status(status)
                    .errorMessage(errorMessage)
                    .build();
            auditLog.setDetailsMap(details);
            return auditLog;
        }
    }
}