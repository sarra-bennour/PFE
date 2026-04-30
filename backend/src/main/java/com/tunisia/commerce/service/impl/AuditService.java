package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.audit.AuditLogDTO;
import com.tunisia.commerce.dto.audit.AuditLogFilterDTO;
import com.tunisia.commerce.dto.audit.AuditLogResponseDTO;
import com.tunisia.commerce.entity.AuditLog;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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

    /**
     * Récupérer les logs d'audit avec pagination (offset/limit)
     */
    @Transactional(readOnly = true)
    public AuditLogResponseDTO getAllAuditLogs(int offset, int limit) {
        try {
            Pageable pageable = PageRequest.of(offset / limit, limit, Sort.by(Sort.Direction.DESC, "performedAt"));
            Page<AuditLog> auditLogPage = auditLogRepository.findAllByOrderByPerformedAtDesc(pageable);

            List<AuditLogDTO> dtos = auditLogPage.getContent().stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return AuditLogResponseDTO.builder()
                    .success(true)
                    .data(dtos)
                    .totalElements(auditLogPage.getTotalElements())
                    .currentPage(auditLogPage.getNumber())
                    .totalPages(auditLogPage.getTotalPages())
                    .pageSize(limit)
                    .hasNext(auditLogPage.hasNext())
                    .hasPrevious(auditLogPage.hasPrevious())
                    .build();

        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
            return AuditLogResponseDTO.builder()
                    .success(false)
                    .message("Erreur: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Récupérer les logs d'audit avec filtres et pagination
     */
    @Transactional(readOnly = true)
    public AuditLogResponseDTO getAuditLogs(AuditLogFilterDTO filters) {
        try {
            Pageable pageable = PageRequest.of(filters.getPage(), filters.getSize(), Sort.by(Sort.Direction.DESC, "performedAt"));
            Page<AuditLog> auditLogPage;

            // Si un terme de recherche est fourni
            if (filters.getSearchTerm() != null && !filters.getSearchTerm().isEmpty()) {
                auditLogPage = auditLogRepository.searchByTerm(filters.getSearchTerm(), pageable);
            }
            // Sinon, utiliser les filtres standards
            else {
                auditLogPage = auditLogRepository.searchAuditLogs(
                        filters.getAction(),
                        filters.getActionType() != null ?
                                com.tunisia.commerce.enums.ActionType.valueOf(filters.getActionType()) : null,
                        filters.getEntityType() != null ?
                                com.tunisia.commerce.enums.EntityType.valueOf(filters.getEntityType()) : null,
                        filters.getEntityId(),
                        filters.getUserEmail(),
                        filters.getStatus(),
                        filters.getStartDate(),
                        filters.getEndDate(),
                        pageable
                );
            }

            List<AuditLogDTO> dtos = auditLogPage.getContent().stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            log.info("Page {} sur {} - {} log(s) trouvé(s)",
                    filters.getPage(), auditLogPage.getTotalPages(), dtos.size());

            return AuditLogResponseDTO.builder()
                    .success(true)
                    .data(dtos)
                    .currentPage(auditLogPage.getNumber())
                    .totalPages(auditLogPage.getTotalPages())
                    .totalElements(auditLogPage.getTotalElements())
                    .pageSize(auditLogPage.getSize())
                    .hasNext(auditLogPage.hasNext())
                    .hasPrevious(auditLogPage.hasPrevious())
                    .build();

        } catch (Exception e) {
            log.error("Erreur lors de la récupération des logs: {}", e.getMessage());
            return AuditLogResponseDTO.builder()
                    .success(false)
                    .message("Erreur lors de la récupération des logs: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Récupérer les logs d'audit par utilisateur avec pagination
     */
    // Dans AuditService.java - Modifier la méthode getAuditLogsByUser
    @Transactional(readOnly = true)
    public AuditLogResponseDTO getAuditLogsByUser(Long userId, int offset, int limit) {
        try {
            Pageable pageable = PageRequest.of(offset / limit, limit, Sort.by(Sort.Direction.DESC, "performedAt"));
            Page<AuditLog> auditLogPage = auditLogRepository.findByUserIdOrderByPerformedAtDesc(userId, pageable);

            List<AuditLogDTO> dtos = auditLogPage.getContent().stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return AuditLogResponseDTO.builder()
                    .success(true)
                    .data(dtos)
                    .totalElements(auditLogPage.getTotalElements())
                    .currentPage(auditLogPage.getNumber())
                    .totalPages(auditLogPage.getTotalPages())
                    .pageSize(limit)
                    .hasNext(auditLogPage.hasNext())
                    .hasPrevious(auditLogPage.hasPrevious())
                    .build();

        } catch (Exception e) {
            log.error("Erreur lors de la récupération des logs par utilisateur: {}", e.getMessage());
            return AuditLogResponseDTO.builder()
                    .success(false)
                    .message("Erreur lors de la récupération des logs")
                    .build();
        }
    }

    /**
     * Récupérer les logs d'audit par entité avec pagination
     */
    @Transactional(readOnly = true)
    public AuditLogResponseDTO getAuditLogsByEntity(String entityType, Long entityId, int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "performedAt"));
            Page<AuditLog> auditLogPage = auditLogRepository.findByEntityTypeAndEntityIdOrderByPerformedAtDesc(
                    com.tunisia.commerce.enums.EntityType.valueOf(entityType),
                    entityId,
                    pageable
            );

            List<AuditLogDTO> dtos = auditLogPage.getContent().stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return AuditLogResponseDTO.builder()
                    .success(true)
                    .data(dtos)
                    .currentPage(auditLogPage.getNumber())
                    .totalPages(auditLogPage.getTotalPages())
                    .totalElements(auditLogPage.getTotalElements())
                    .pageSize(auditLogPage.getSize())
                    .hasNext(auditLogPage.hasNext())
                    .hasPrevious(auditLogPage.hasPrevious())
                    .build();

        } catch (Exception e) {
            log.error("Erreur lors de la récupération des logs par entité: {}", e.getMessage());
            return AuditLogResponseDTO.builder()
                    .success(false)
                    .message("Erreur lors de la récupération des logs")
                    .build();
        }
    }

    /**
     * Récupérer les derniers logs (limite)
     */
    @Transactional(readOnly = true)
    public AuditLogResponseDTO getLatestAuditLogs(int limit) {
        try {
            List<AuditLog> auditLogs = auditLogRepository.findTop100ByOrderByPerformedAtDesc();

            if (limit > 0 && limit < auditLogs.size()) {
                auditLogs = auditLogs.subList(0, limit);
            }

            List<AuditLogDTO> dtos = auditLogs.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return AuditLogResponseDTO.builder()
                    .success(true)
                    .data(dtos)
                    .totalElements(dtos.size())
                    .build();

        } catch (Exception e) {
            log.error("Erreur lors de la récupération des derniers logs: {}", e.getMessage());
            return AuditLogResponseDTO.builder()
                    .success(false)
                    .message("Erreur lors de la récupération des logs")
                    .build();
        }
    }

    /**
     * Récupérer les statistiques d'audit
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAuditStatistics(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> stats = new HashMap<>();

        try {
            // Statistiques par type d'action
            List<Object[]> actionTypeStats = auditLogRepository.countByActionTypeAndDateRange(startDate, endDate);
            Map<String, Long> actionTypeCounts = new HashMap<>();
            for (Object[] stat : actionTypeStats) {
                actionTypeCounts.put(stat[0].toString(), (Long) stat[1]);
            }
            stats.put("byActionType", actionTypeCounts);

            // Statistiques par jour
            List<Object[]> dailyStats = auditLogRepository.countByDateRange(startDate, endDate);
            Map<String, Long> dailyCounts = new HashMap<>();
            for (Object[] stat : dailyStats) {
                dailyCounts.put(stat[0].toString(), (Long) stat[1]);
            }
            stats.put("byDay", dailyCounts);

            // Utilisateurs les plus actifs
            List<Object[]> topUsers = auditLogRepository.findMostActiveUsers(startDate, endDate);
            List<Map<String, Object>> topUsersList = topUsers.stream().limit(10).map(stat -> {
                Map<String, Object> userStat = new HashMap<>();
                userStat.put("email", stat[0]);
                userStat.put("count", stat[1]);
                return userStat;
            }).collect(Collectors.toList());
            stats.put("topUsers", topUsersList);

            // IP suspectes
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            List<Object[]> suspiciousIps = auditLogRepository.findSuspiciousIps(oneHourAgo);
            List<Map<String, Object>> suspiciousIpsList = suspiciousIps.stream().map(stat -> {
                Map<String, Object> ipStat = new HashMap<>();
                ipStat.put("ip", stat[0]);
                ipStat.put("failures", stat[1]);
                return ipStat;
            }).collect(Collectors.toList());
            stats.put("suspiciousIps", suspiciousIpsList);

            // Taux de succès
            List<AuditLog> allLogs = auditLogRepository.findByPerformedAtBetweenOrderByPerformedAtDesc(startDate, endDate);
            long totalCount = allLogs.size();
            long successCount = allLogs.stream().filter(log -> "SUCCESS".equals(log.getStatus())).count();
            double successRate = totalCount > 0 ? (successCount * 100.0 / totalCount) : 0;
            stats.put("successRate", successRate);
            stats.put("totalActions", totalCount);

        } catch (Exception e) {
            log.error("Erreur lors du calcul des statistiques: {}", e.getMessage());
            stats.put("error", e.getMessage());
        }

        return stats;
    }

    /**
     * Convertir AuditLog en DTO
     */
    private AuditLogDTO convertToDTO(AuditLog log) {
        return AuditLogDTO.builder()
                .id(log.getId())
                .action(log.getAction())
                .actionType(log.getActionType())
                .description(log.getDescription())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .entityReference(log.getEntityReference())
                .userId(log.getUserId())
                .userEmail(log.getUserEmail())
                .userRole(log.getUserRole())
                .userIpAddress(log.getUserIpAddress())
                .userAgent(log.getUserAgent())
                .details(log.getDetailsMap())
                .status(log.getStatus())
                .errorMessage(log.getErrorMessage())
                .performedAt(log.getPerformedAt())
                .sessionId(log.getSessionId())
                .requestId(log.getRequestId())
                .build();
    }
}