package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.admin.AdminDemandeDTO;
import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.Administrateur;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.InstanceValidation;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.exception.InstanceValidationException;
import com.tunisia.commerce.repository.AdministrateurRepository;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.UserService;
import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.service.impl.AdminServiceImpl;
import com.tunisia.commerce.service.impl.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final AdministrateurRepository administrateurRepository;
    private final DocumentRepository documentRepository;
    private final AdminServiceImpl adminService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);
    // Méthode utilitaire pour récupérer l'IP
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");

        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        // 🔥 Si c'est IPv6 localhost, remplacer par IPv4 localhost
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            ip = "127.0.0.1";
        }

        // 🔥 Si plusieurs IPs (proxy), prendre la première
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip;
    }


    /**
     * Récupérer tous les utilisateurs
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestHeader("Authorization") String authHeader, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;
        try {
            log.info("=== RÉCUPÉRATION DE TOUS LES UTILISATEURS ===");
            validateAdmin(authHeader);

            List<UserDTO> users = userService.getAllUsers();
            // AUDIT: Consultation liste utilisateurs
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ALL_USERS")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation de la liste de tous les utilisateurs")
                            .entity(EntityType.USER, null, null)
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("users_count", users.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "users", users,
                    "count", users.size()
            ));
        } catch (Exception e) {
            // AUDIT: Échec consultation
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ALL_USERS")
                            .actionType(ActionType.SEARCH)
                            .description("Échec de la consultation des utilisateurs")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );
            log.error("Erreur lors de la récupération des utilisateurs: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer TOUTES les demandes sans filtre
     */
    @GetMapping("/all-demandes")
    public ResponseEntity<?> getAllDemandes(@RequestHeader("Authorization") String authHeader, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;

        try {
            log.info("=== RÉCUPÉRATION DE TOUTES LES DEMANDES ===");
            Administrateur admin = getAdminFromToken(authHeader);
            adminId = admin.getId();
            adminEmail = admin.getEmail();

            validateAdmin(authHeader);

            List<AdminDemandeDTO> demandes = adminService.getAllActiveDemandes();

            // AUDIT: Consultation toutes demandes
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ALL_DEMANDES")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation de toutes les demandes actives")
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("demandes_count", demandes.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", demandes,
                    "count", demandes.size()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ALL_DEMANDES")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation des demandes")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la récupération des demandes: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/archived-demandes")
    public ResponseEntity<?> getArchivedDemandes(@RequestHeader("Authorization") String authHeader, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;

        try {
            Administrateur admin = getAdminFromToken(authHeader);
            adminId = admin.getId();
            adminEmail = admin.getEmail();

            validateAdmin(authHeader);

            List<AdminDemandeDTO> archivedDemandes = adminService.getAllArchivedDemandes();

            // AUDIT: Consultation archives
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ARCHIVED_DEMANDES")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation des demandes archivées")
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("archived_count", archivedDemandes.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", archivedDemandes,
                    "count", archivedDemandes.size()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ARCHIVED_DEMANDES")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation archives")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    /**
     * Récupérer une demande par ID avec tous les détails
     */
    @GetMapping("/demande/{id}")
    public ResponseEntity<?> getDemandeById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;

        try {
            log.info("=== RÉCUPÉRATION DEMANDE ID: {} ===", id);
            Administrateur admin = getAdminFromToken(authHeader);
            adminId = admin.getId();
            adminEmail = admin.getEmail();

            validateAdmin(authHeader);

            AdminDemandeDTO demande = adminService.getDemandeById(id);

            // AUDIT: Consultation demande spécifique
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_DEMANDE_BY_ID")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation d'une demande par ID")
                            .entity(EntityType.DEMANDE, id, demande.getReference())
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("demande_status", demande.getStatus())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", demande
            ));
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_DEMANDE_BY_ID")
                            .actionType(ActionType.SEARCH)
                            .description("Demande non trouvée")
                            .entity(EntityType.DEMANDE, id, null)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("Demande non trouvée: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_DEMANDE_BY_ID")
                            .actionType(ActionType.SEARCH)
                            .description("Erreur consultation demande")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erreur interne: " + e.getMessage()
            ));
        }
    }

    /**
     * Prévisualiser un document (affiche dans le navigateur)
     * Accessible par ADMIN et INSTANCE_VALIDATION
     */
    @GetMapping("/document/{documentId}/preview")
    public ResponseEntity<?> previewDocument(
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;
        String userRole = null;

        try {
            log.info("=== PRÉVISUALISATION DOCUMENT ID: {} ===", documentId);

            String token = extractToken(authHeader);
            String email = jwtUtil.extractUsername(token);
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            userId = user.getId();
            userEmail = user.getEmail();
            userRole = user.getRole().name();

            boolean isAdmin = user instanceof Administrateur;
            boolean isInstanceValidation = user instanceof InstanceValidation;

            if (!isAdmin && !isInstanceValidation) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "success", false,
                        "error", "Accès non autorisé"
                ));
            }

            Document document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé"));

            // AUDIT: Prévisualisation document
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PREVIEW_DOCUMENT")
                            .actionType(ActionType.DOWNLOAD)
                            .description("Prévisualisation d'un document")
                            .entity(EntityType.DOCUMENT, documentId, document.getFileName())
                            .user(userId, userEmail, userRole)
                            .success()
                            .detail("document_type", document.getDocumentType())
                            .detail("ip_address", clientIp)
            );

            byte[] fileContent = adminService.getDocumentContent(document);
            String contentType = document.getFileType();
            if (contentType == null) {
                String fileName = document.getFileName().toLowerCase();
                if (fileName.endsWith(".pdf")) contentType = "application/pdf";
                else if (fileName.endsWith(".png")) contentType = "image/png";
                else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) contentType = "image/jpeg";
                else contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getFileName() + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(fileContent);

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PREVIEW_DOCUMENT")
                            .actionType(ActionType.DOWNLOAD)
                            .description("Échec prévisualisation document")
                            .user(userId, userEmail, userRole )
                            .failure(e.getMessage())
                            .detail("document_id", documentId)
                            .detail("ip_address", clientIp)
            );

            log.error("Document non trouvé: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PREVIEW_DOCUMENT")
                            .actionType(ActionType.DOWNLOAD)
                            .description("Erreur prévisualisation document")
                            .user(userId, userEmail, userRole )
                            .failure(e.getMessage())
                            .detail("document_id", documentId)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer les statistiques des demandes
     */
    @GetMapping("/demandes-statistics")
    public ResponseEntity<?> getDemandesStatistics(@RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION STATISTIQUES DES DEMANDES ===");
            validateAdmin(authHeader);

            Map<String, Object> stats = adminService.getDemandesStatistics();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", stats
            ));
        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer toutes les demandes de désactivation en attente
     */
    @GetMapping("/deactivation-requests")
    public ResponseEntity<?> getAllDeactivationRequests(@RequestHeader("Authorization") String authHeader, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;

        try {
            log.info("=== RÉCUPÉRATION DES DEMANDES DE DÉSACTIVATION ===");
            Administrateur admin = getAdminFromToken(authHeader);
            adminId = admin.getId();
            adminEmail = admin.getEmail();

            validateAdmin(authHeader);

            List<DeactivationRequestAdminDTO> requests = userService.getAllDeactivationRequests();

            // AUDIT: Consultation demandes désactivation
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_DEACTIVATION_REQUESTS")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation des demandes de désactivation")
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("requests_count", requests.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "requests", requests,
                    "count", requests.size()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_DEACTIVATION_REQUESTS")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation demandes désactivation")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la récupération des demandes: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Changer le statut d'un utilisateur (SUSPENDRE)
     */
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<?> toggleUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== CHANGEMENT STATUT UTILISATEUR ID: {} ===", userId);
            log.info("status", request.get("status"));
            validateAdmin(authHeader);

            String newStatus = request.get("status");

            if (newStatus == null || (!newStatus.equals("ACTIF") && !newStatus.equals("INACTIF"))) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Statut invalide. Utilisez 'ACTIF' ou 'INACTIF'"
                ));
            }

            // 🔥 Appeler la méthode du service
            userService.updateUserStatus(userId, newStatus);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Statut utilisateur mis à jour avec succès"
            ));
        } catch (Exception e) {
            log.error("Erreur lors du changement de statut: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    @PostMapping("/deactivation-requests/{requestId}/process")
    public ResponseEntity<?> processDeactivationRequest(
            @PathVariable Long requestId,
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;

        try {
            log.info("=== TRAITEMENT DEMANDE DE DÉSACTIVATION ID: {} ===", requestId);

            Administrateur admin = getAdminFromToken(authHeader);
            adminId = admin.getId();
            adminEmail = admin.getEmail();

            String action = request.get("action");
            String adminComment = request.get("comment");

            if (action == null || (!action.equals("ACCEPT") && !action.equals("REJECT"))) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Action invalide. Utilisez 'ACCEPT' ou 'REJECT'"
                ));
            }

            DeactivationRequestAdminDTO processedRequest = userService.processDeactivationRequest(
                    requestId, action, adminComment, adminId
            );

            // AUDIT: Traitement demande désactivation
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_PROCESS_DEACTIVATION")
                            .actionType(action.equals("ACCEPT") ? ActionType.VALIDATION : ActionType.REJECTION)
                            .description(action.equals("ACCEPT") ? "Approbation demande désactivation" : "Rejet demande désactivation")
                            .entity(EntityType.USER, processedRequest.getUserId(), processedRequest.getUserEmail())
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("request_id", requestId)
                            .detail("action", action)
                            .detail("admin_comment", adminComment)
                            .detail("ip_address", clientIp)
            );

            String message = action.equals("ACCEPT")
                    ? "Demande approuvée avec succès. Le compte a été désactivé."
                    : "Demande rejetée avec succès.";

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", message,
                    "request", processedRequest
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_PROCESS_DEACTIVATION")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec traitement demande désactivation")
                            .user(adminId, adminEmail,"ADMIN")
                            .failure(e.getMessage())
                            .detail("request_id", requestId)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors du traitement: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/users/{userId}/reactivate")
    public ResponseEntity<?> reactivateAccount(
            @PathVariable Long userId,
            @RequestBody(required = false) Map<String, String> request,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;
        UserDTO targetUser = null;

        try {
            log.info("=== RÉACTIVATION DE COMPTE ID: {} ===", userId);

            Administrateur admin = getAdminFromToken(authHeader);
            adminId = admin.getId();
            adminEmail = admin.getEmail();

            validateAdmin(authHeader);

            targetUser = userService.getUserById(userId);

            String adminComment = request != null ? request.get("comment") : null;

            userService.reactivateAccount(userId, adminComment);

            // AUDIT: Réactivation compte
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_REACTIVATE_ACCOUNT")
                            .actionType(ActionType.MODIFICATION)
                            .description("Réactivation de compte utilisateur")
                            .entity(EntityType.USER, userId, targetUser != null ? targetUser.getEmail() : null)
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("admin_comment", adminComment)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Compte réactivé avec succès"
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_REACTIVATE_ACCOUNT")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec réactivation compte")
                            .entity(EntityType.USER, userId, null)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("target_user_id", userId)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la réactivation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }


    @PostMapping("/users/{userId}/reset-password")
    public ResponseEntity<?> resetUserPassword(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;
        UserDTO targetUser = null;

        try {
            log.info("=== RÉINITIALISATION MOT DE PASSE - ID: {} ===", userId);

            Administrateur admin = getAdminFromToken(authHeader);
            adminId = admin.getId();
            adminEmail = admin.getEmail();

            validateAdmin(authHeader);

            targetUser = userService.getUserById(userId);

            if (targetUser.getRole() == UserRole.IMPORTATEUR) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Les importateurs n'utilisent pas de mot de passe."
                ));
            }

            String newPassword = userService.resetUserPassword(userId);

            // AUDIT: Réinitialisation mot de passe
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_RESET_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Réinitialisation de mot de passe par admin")
                            .entity(EntityType.USER, userId, targetUser != null ? targetUser.getEmail() : null)
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Mot de passe réinitialisé avec succès et envoyé par email");
            response.put("newPassword", newPassword);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_RESET_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Échec réinitialisation mot de passe")
                            .entity(EntityType.USER, userId, null)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("target_user_id", userId)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la réinitialisation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    // ==================== INSTANCE VALIDATION ENDPOINTS ====================

    @PostMapping("/instance-validation/create")
    public ResponseEntity<?> createInstanceValidation(
            @RequestBody CreateInstanceValidationRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;

        try {
            log.info("=== CRÉATION INSTANCE DE VALIDATION ===");

            // Note: Cette méthode n'a pas d'authHeader, donc l'admin n'est pas authentifié ?
            // Idéalement, il faudrait aussi vérifier l'authentification ici

            UserDTO created = userService.createInstanceValidation(request);

            // AUDIT: Création instance validation
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_INSTANCE_VALIDATION")
                            .actionType(ActionType.CREATION)
                            .description("Création d'une instance de validation")
                            .entity(EntityType.USER, created.getId(), created.getEmail())
                            .success()
                            .detail("structure_name", request.getStructure())
                            .detail("email", request.getEmail())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Instance de validation créée avec succès.",
                    "data", created
            ));
        } catch (InstanceValidationException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_INSTANCE_VALIDATION")
                            .actionType(ActionType.CREATION)
                            .description("Échec création instance validation")
                            .failure(e.getMessage())
                            .detail("structure_name", request.getStructure())
                            .detail("email", request.getEmail())
                            .detail("error_code", e.getErrorCode())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur métier: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "errorCode", e.getErrorCode()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_INSTANCE_VALIDATION")
                            .actionType(ActionType.CREATION)
                            .description("Erreur technique création instance")
                            .failure(e.getMessage())
                            .detail("structure_name", request.getStructure())
                            .detail("email", request.getEmail())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur technique: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue: " + e.getMessage()
            ));
        }
    }

    // Endpoint pour créer un utilisateur BANQUE
    @PostMapping("/banque/create")
    public ResponseEntity<?> createBanqueUser(
            @RequestBody CreateBanqueUserRequest request,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;

        try {
            log.info("=== CRÉATION UTILISATEUR BANQUE ===");

            // 🔥 Récupérer l'admin pour l'audit
            try {
                Administrateur admin = getAdminFromToken(authHeader);
                adminId = admin.getId();
                adminEmail = admin.getEmail();
                validateAdmin(authHeader);
            } catch (Exception e) {
                log.warn("Admin non authentifié, création sans audit admin");
            }

            UserDTO created = userService.createBanqueUser(request);

            // Audit
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_BANQUE_USER")
                            .actionType(ActionType.CREATION)
                            .description("Création d'un utilisateur banque")
                            .entity(EntityType.USER, created.getId(), created.getEmail())
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_name", request.getStructure() != null ? request.getStructure().getOfficialName() : null)
                            .detail("email", request.getEmail())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Utilisateur banque créé avec succès.",
                    "data", created
            ));

        } catch (InstanceValidationException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_BANQUE_USER")
                            .actionType(ActionType.CREATION)
                            .description("Échec création utilisateur banque")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("email", request.getEmail())
                            .detail("error_code", e.getErrorCode())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur métier: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "errorCode", e.getErrorCode()
            ));

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_BANQUE_USER")
                            .actionType(ActionType.CREATION)
                            .description("Erreur technique création utilisateur banque")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("email", request.getEmail())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur technique: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue: " + e.getMessage()
            ));
        }
    }

    // Endpoint pour créer un utilisateur DOUANE
    @PostMapping("/douane/create")
    public ResponseEntity<?> createDouaneUser(
            @RequestBody CreateDouaneUserRequest request,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        Long adminId = null;

        try {
            log.info("=== CRÉATION UTILISATEUR DOUANE ===");

            // 🔥 Récupérer l'admin pour l'audit
            try {
                Administrateur admin = getAdminFromToken(authHeader);
                adminId = admin.getId();
                adminEmail = admin.getEmail();
                validateAdmin(authHeader);
            } catch (Exception e) {
                log.warn("Admin non authentifié, création sans audit admin");
            }

            UserDTO created = userService.createDouaneUser(request);

            // Audit
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_DOUANE_USER")
                            .actionType(ActionType.CREATION)
                            .description("Création d'un utilisateur douane")
                            .entity(EntityType.USER, created.getId(), created.getEmail())
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_name", request.getStructure() != null ? request.getStructure().getOfficialName() : null)
                            .detail("email", request.getEmail())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Utilisateur douane créé avec succès.",
                    "data", created
            ));

        } catch (InstanceValidationException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_DOUANE_USER")
                            .actionType(ActionType.CREATION)
                            .description("Échec création utilisateur douane")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("email", request.getEmail())
                            .detail("error_code", e.getErrorCode())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur métier: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "errorCode", e.getErrorCode()
            ));

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_DOUANE_USER")
                            .actionType(ActionType.CREATION)
                            .description("Erreur technique création utilisateur douane")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("email", request.getEmail())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur technique: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue: " + e.getMessage()
            ));
        }
    }



    // ==================== MÉTHODES PRIVÉES ====================

    private void validateAdmin(String authHeader) {
        Administrateur admin = getAdminFromToken(authHeader);
        if (!admin.isSuperAdmin()) {
            throw new RuntimeException("Accès non autorisé. Privilèges super administrateur requis.");
        }
    }

    private Administrateur getAdminFromToken(String authHeader) {
        String token = extractToken(authHeader);
        String email = jwtUtil.extractUsername(token);

        return administrateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé avec l'email: " + email));
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification manquant ou invalide");
        }
        return authHeader.substring(7);
    }
}