package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.audit.AuditLogFilterDTO;
import com.tunisia.commerce.dto.audit.AuditLogResponseDTO;
import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.impl.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Audit Logs", description = "API pour la consultation des logs d'audit")
@CrossOrigin(origins = "*")
public class AuditLogController {

    private final AuditService auditLogService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;


    /**
     * Récupérer TOUS les logs d'audit avec pagination (ADMIN uniquement)
     */
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Récupérer tous les logs d'audit avec pagination")
    public ResponseEntity<AuditLogResponseDTO> getAllAuditLogs(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit,
            @RequestHeader("Authorization") String authHeader) {

        log.info("=== RÉCUPÉRATION DE TOUS LES LOGS AUDIT - Offset: {}, Limit: {} ===", offset, limit);
        validateAdmin(authHeader);

        AuditLogResponseDTO response = auditLogService.getAllAuditLogs(offset, limit);
        return ResponseEntity.ok(response);
    }

    /**
     * Récupérer les logs d'audit par utilisateur (accessible à l'utilisateur lui-même)
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @auditLogControllerSecurity.isCurrentUser(#userId, authentication)")
    @Operation(summary = "Récupérer les logs d'audit par utilisateur")
    public ResponseEntity<AuditLogResponseDTO> getAuditLogsByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit,
            @RequestHeader("Authorization") String authHeader) {

        log.info("=== LOGS AUDIT PAR UTILISATEUR ID: {} - Offset: {}, Limit: {} ===", userId, offset, limit);

        AuditLogResponseDTO response = auditLogService.getAuditLogsByUser(userId, offset, limit);
        return ResponseEntity.ok(response);
    }

    /**
     * Récupérer ses propres logs (pour l'utilisateur connecté)
     */
    @GetMapping("/my-logs")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Récupérer les logs de l'utilisateur connecté")
    public ResponseEntity<AuditLogResponseDTO> getMyAuditLogs(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit,
            @RequestHeader("Authorization") String authHeader) {

        log.info("=== LOGS AUDIT POUR L'UTILISATEUR CONNECTÉ - Offset: {}, Limit: {} ===", offset, limit);

        Long userId = getCurrentUserId(authHeader);
        AuditLogResponseDTO response = auditLogService.getAuditLogsByUser(userId, offset, limit);
        return ResponseEntity.ok(response);
    }

    /**
     * Récupérer les logs d'audit par entité
     */
    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Récupérer les logs d'audit par entité avec pagination")
    public ResponseEntity<AuditLogResponseDTO> getAuditLogsByEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("Authorization") String authHeader) {

        log.info("=== LOGS AUDIT PAR ENTITÉ - Type: {}, ID: {} - Page: {}, Size: {} ===", entityType, entityId, page, size);
        validateAdmin(authHeader);

        AuditLogResponseDTO response = auditLogService.getAuditLogsByEntity(entityType, entityId, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Récupérer les derniers logs (limite)
     */
    @GetMapping("/latest")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Récupérer les derniers logs d'audit")
    public ResponseEntity<AuditLogResponseDTO> getLatestAuditLogs(
            @RequestParam(defaultValue = "100") int limit,
            @RequestHeader("Authorization") String authHeader) {

        log.info("=== DERNIERS LOGS AUDIT - Limit: {} ===", limit);
        validateAdmin(authHeader);

        AuditLogResponseDTO response = auditLogService.getLatestAuditLogs(limit);
        return ResponseEntity.ok(response);
    }

    /**
     * Récupérer les statistiques d'audit
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Récupérer les statistiques d'audit")
    public ResponseEntity<Map<String, Object>> getAuditStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestHeader("Authorization") String authHeader) {

        log.info("=== STATISTIQUES AUDIT ===");
        validateAdmin(authHeader);

        if (startDate == null) {
            startDate = LocalDateTime.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }

        Map<String, Object> stats = auditLogService.getAuditStatistics(startDate, endDate);
        stats.put("success", true);
        stats.put("startDate", startDate);
        stats.put("endDate", endDate);

        return ResponseEntity.ok(stats);
    }

    /**
     * Récupérer les types d'actions disponibles pour les filtres
     */
    @GetMapping("/action-types")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Récupérer les types d'actions disponibles")
    public ResponseEntity<Map<String, Object>> getActionTypes(@RequestHeader("Authorization") String authHeader) {
        validateAdmin(authHeader);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("actionTypes", com.tunisia.commerce.enums.ActionType.values());
        response.put("entityTypes", com.tunisia.commerce.enums.EntityType.values());
        response.put("statuses", new String[]{"SUCCESS", "FAILURE", "PENDING"});

        return ResponseEntity.ok(response);
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private void validateAdmin(String authHeader) {
        String token = extractToken(authHeader);
        String email = jwtUtil.extractUsername(token);
        String role = jwtUtil.extractRole(token);

        if (!"ADMIN".equals(role)) {
            throw new RuntimeException("Accès non autorisé. Rôle ADMIN requis.");
        }
    }

    private Long getCurrentUserId(String authHeader) {
        String token = extractToken(authHeader);
        String email = jwtUtil.extractUsername(token);

        // Récupérer l'utilisateur depuis la base de données
        // Vous devez injecter UserRepository
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return user.getId();
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification manquant ou invalide");
        }
        return authHeader.substring(7);
    }
}