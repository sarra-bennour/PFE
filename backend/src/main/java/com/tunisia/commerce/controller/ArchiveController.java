package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.archive.ArchiveDemandeDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.service.impl.ArchiveService;
import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.service.impl.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/archive")
@RequiredArgsConstructor
public class ArchiveController {

    private final ArchiveService archiveService;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;

    private final Logger logger = Logger.getLogger(getClass().getName());

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
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            ip = "127.0.0.1";
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    // 1. Archivage manuel par admin (une seule demande)
    @PostMapping("/demande/{demandeId}")
    public ResponseEntity<?> archiveDemande(
            @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;

        try {
            String email = validateAdminToken(authHeader);
            adminEmail = email;

            String reason = body != null && body.containsKey("reason")
                    ? body.get("reason")
                    : "Archivage manuel par administrateur";

            archiveService.manualArchive(demandeId, email, reason);

            // AUDIT: Archivage manuel
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_MANUAL")
                            .actionType(ActionType.MODIFICATION)
                            .description("Archivage manuel d'une demande par admin")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, adminEmail, "ADMIN")
                            .success()
                            .detail("reason", reason)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande archivée avec succès"
            ));

        } catch (IllegalArgumentException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_MANUAL")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec archivage manuel - argument invalide")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_MANUAL")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec archivage manuel - non autorisé")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_MANUAL")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur interne archivage manuel")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            logger.severe("Erreur lors de l'archivage: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // 2. Archivage multiple par admin
    @PostMapping("/bulk")
    public ResponseEntity<?> bulkArchive(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;
        List<Long> demandeIds = new ArrayList<>();

        logger.info("=== DÉBUT ARCHIVAGE MULTIPLE ===");
        logger.info("Request body reçu: " + request);

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                logger.warning("Token manquant ou invalide");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            String token = authHeader.substring(7);

            if (!jwtUtil.validateToken(token)) {
                logger.warning("Token invalide ou expiré");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token invalide ou expiré"));
            }

            String email = jwtUtil.extractUsername(token);
            adminEmail = email;
            String role = jwtUtil.extractRole(token);

            logger.info("Utilisateur: " + email + ", Rôle: " + role);

            if (!"ADMIN".equals(role)) {
                logger.warning("Accès non autorisé pour le rôle: " + role);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Accès non autorisé. Rôle ADMIN requis."));
            }

            logger.info("Admin authentifié: " + email);

            Object demandeIdsObj = request.get("demandeIds");
            logger.info("demandeIds reçu: " + demandeIdsObj);

            if (demandeIdsObj == null) {
                logger.warning("demandeIds est null");
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "La liste des IDs des demandes est requise"));
            }

            if (demandeIdsObj instanceof List) {
                List<?> rawList = (List<?>) demandeIdsObj;
                for (Object item : rawList) {
                    if (item instanceof Number) {
                        demandeIds.add(((Number) item).longValue());
                    } else if (item instanceof String) {
                        try {
                            demandeIds.add(Long.parseLong((String) item));
                        } catch (NumberFormatException e) {
                            logger.warning("ID invalide: " + item);
                        }
                    }
                }
            } else if (demandeIdsObj instanceof Integer) {
                demandeIds.add(((Integer) demandeIdsObj).longValue());
            } else if (demandeIdsObj instanceof Long) {
                demandeIds.add((Long) demandeIdsObj);
            } else {
                logger.warning("Format de demandeIds non supporté: " + demandeIdsObj.getClass());
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Format de la liste des IDs invalide"));
            }

            if (demandeIds.isEmpty()) {
                logger.warning("Aucun ID valide trouvé");
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Aucun ID valide dans la liste"));
            }

            String reason = request.containsKey("reason") ? (String) request.get("reason") : "Archivage massif par administrateur";

            archiveService.bulkArchive(demandeIds, email, reason);

            // AUDIT: Archivage multiple
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_BULK")
                            .actionType(ActionType.MODIFICATION)
                            .description("Archivage multiple de demandes par admin")
                            .user(null, adminEmail, "ADMIN")
                            .success()
                            .detail("demande_ids", demandeIds.toString())
                            .detail("count", demandeIds.size())
                            .detail("reason", reason)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", demandeIds.size() + " demande(s) archivée(s) avec succès"
            ));

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_BULK")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur lors de l'archivage multiple")
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("demande_ids", demandeIds.toString())
                            .detail("ip_address", clientIp)
            );

            logger.severe("Erreur lors de l'archivage: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne du serveur: " + e.getMessage()));
        }
    }

    // 3. Demande d'archivage par l'utilisateur (exportateur/importateur)
    @PostMapping("/request/{demandeId}")
    public ResponseEntity<?> requestArchive(
            @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        String userRole = null;

        try {
            String email = validateUserToken(authHeader);
            userEmail = email;
            userRole = extractRoleFromToken(authHeader);

            archiveService.userArchiveRequest(demandeId, email);

            // AUDIT: Demande d'archivage par utilisateur
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_REQUEST")
                            .actionType(ActionType.MODIFICATION)
                            .description("Demande d'archivage soumise par utilisateur")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, userEmail, userRole)
                            .success()
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande d'archivage soumise avec succès"
            ));

        } catch (IllegalArgumentException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_REQUEST")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec demande d'archivage - argument invalide")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_REQUEST")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec demande d'archivage - non autorisé")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_REQUEST")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur interne demande d'archivage")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            logger.severe("Erreur lors de la demande d'archivage: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // 4. Restaurer une demande archivée (admin uniquement)
    @PostMapping("/restore/{demandeId}")
    public ResponseEntity<?> restoreDemande(
            @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;

        try {
            String email = validateAdminToken(authHeader);
            adminEmail = email;

            archiveService.restoreDemande(demandeId, email);

            // AUDIT: Restauration demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_RESTORE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Restauration d'une demande archivée")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, adminEmail, "ADMIN")
                            .success()
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande restaurée avec succès"
            ));

        } catch (IllegalArgumentException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_RESTORE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec restauration - argument invalide")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_RESTORE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec restauration - non autorisé")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_RESTORE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur interne restauration")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            logger.severe("Erreur lors de la restauration: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // 5. Récupérer toutes les demandes archivées (admin)
    @GetMapping("/all")
    public ResponseEntity<?> getAllArchivedDemandes(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String adminEmail = null;

        try {
            String email = validateAdminToken(authHeader);
            adminEmail = email;

            List<DemandeEnregistrement> archivedDemandes = archiveService.getArchivedDemandes();

            // AUDIT: Consultation toutes archives
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_GET_ALL")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation de toutes les demandes archivées")
                            .user(null, adminEmail, "ADMIN")
                            .success()
                            .detail("count", archivedDemandes.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", archivedDemandes,
                    "count", archivedDemandes.size()
            ));

        } catch (IllegalArgumentException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_GET_ALL")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation archives - argument invalide")
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_GET_ALL")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation archives - non autorisé")
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_GET_ALL")
                            .actionType(ActionType.SEARCH)
                            .description("Erreur interne consultation archives")
                            .user(null, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            logger.severe("Erreur lors de la récupération: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // 6. Récupérer les demandes archivées par l'utilisateur connecté
    @GetMapping("/my-archives")
    public ResponseEntity<?> getMyArchivedDemandes(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        String userRole = null;

        try {
            System.out.println("***archive");
            String email = validateUserToken(authHeader);
            userEmail = email;
            userRole = extractRoleFromToken(authHeader);

            List<ArchiveDemandeDTO> archivedDemandes = archiveService.getArchivedDemandesByUser(email, userRole);

            // AUDIT: Consultation ses propres archives
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_GET_MY")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation de ses propres demandes archivées")
                            .user(null, userEmail, userRole)
                            .success()
                            .detail("count", archivedDemandes.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", archivedDemandes,
                    "count", archivedDemandes.size()
            ));

        } catch (IllegalArgumentException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_GET_MY")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation ses archives - argument invalide")
                            .user(null, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_GET_MY")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation ses archives - non autorisé")
                            .user(null, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ARCHIVE_GET_MY")
                            .actionType(ActionType.SEARCH)
                            .description("Erreur interne consultation ses archives")
                            .user(null, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            logger.severe("Erreur lors de la récupération: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }


    // 7. Vérifier si une demande est archivée
    @GetMapping("/check/{demandeId}")
    public ResponseEntity<?> checkArchived(
            @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader) {

        try {
            validateUserToken(authHeader);

            boolean isArchived = archiveService.isDemandeArchived(demandeId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "isArchived", isArchived
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.severe("Erreur lors de la vérification: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // Méthodes utilitaires pour la validation des tokens
    private String validateAdminToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Token d'authentification manquant");
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.validateToken(token)) {
            throw new IllegalArgumentException("Token invalide ou expiré");
        }

        String role = jwtUtil.extractRole(token);
        if (!"ADMIN".equals(role)) {
            throw new RuntimeException("Accès non autorisé. Rôle ADMIN requis.");
        }

        return jwtUtil.extractUsername(token);
    }

    private String validateUserToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Token d'authentification manquant");
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.validateToken(token)) {
            throw new IllegalArgumentException("Token invalide ou expiré");
        }

        return jwtUtil.extractUsername(token);
    }

    private String extractRoleFromToken(String authHeader) {
        String token = authHeader.substring(7);
        return jwtUtil.extractRole(token);
    }
}