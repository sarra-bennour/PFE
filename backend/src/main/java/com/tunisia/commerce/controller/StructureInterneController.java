package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.structure.CreateStructureRequestDTO;
import com.tunisia.commerce.dto.structure.StructureInterneDTO;
import com.tunisia.commerce.dto.structure.UpdateStructureRequestDTO;
import com.tunisia.commerce.entity.Administrateur;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.enums.StructureType;
import com.tunisia.commerce.repository.AdministrateurRepository;
import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.service.impl.AuditService;
import com.tunisia.commerce.service.impl.StructureInterneServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/structures")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class StructureInterneController {

    private final StructureInterneServiceImpl structureService;
    private final JwtUtil jwtUtil;
    private final AdministrateurRepository administrateurRepository;
    private final AuditService auditService;

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

    /**
     * Créer une nouvelle structure interne
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStructure(
            @Valid @RequestBody CreateStructureRequestDTO request,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;

        try {
            log.info("=== CRÉATION STRUCTURE INTERNE ===");
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            StructureInterneDTO created = structureService.createStructure(request, adminId);

            // AUDIT: Création structure
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_STRUCTURE")
                            .actionType(ActionType.CREATION)
                            .description("Création d'une nouvelle structure interne")
                            .entity(EntityType.STRUCTURE, created.getId(), created.getOfficialName())
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_name", request.getOfficialName())
                            .detail("structure_type", request.getType())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Structure créée avec succès");
            response.put("data", created);

            return new ResponseEntity<>(response, HttpStatus.CREATED);

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_STRUCTURE")
                            .actionType(ActionType.CREATION)
                            .description("Échec création structure interne")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_name", request.getOfficialName())
                            .detail("structure_type", request.getType())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la création: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_CREATE_STRUCTURE")
                            .actionType(ActionType.CREATION)
                            .description("Erreur technique création structure")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_name", request.getOfficialName())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue: " + e.getMessage()
            ));
        }
    }

    /**
     * Mettre à jour une structure interne
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateStructure(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStructureRequestDTO request,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;
        String oldName = null;

        try {
            log.info("=== MISE À JOUR STRUCTURE ID: {} ===", id);
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            // Récupérer l'ancien nom pour l'audit
            try {
                StructureInterneDTO oldStructure = structureService.getStructureById(id);
                oldName = oldStructure.getOfficialName();
            } catch (Exception e) {
                oldName = "unknown";
            }

            StructureInterneDTO updated = structureService.updateStructure(id, request, adminId);

            // AUDIT: Mise à jour structure
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_UPDATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Mise à jour d'une structure interne")
                            .entity(EntityType.STRUCTURE, id, updated.getOfficialName())
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_id", id)
                            .detail("old_name", oldName)
                            .detail("new_name", request.getOfficialName())
                            .detail("structure_type", request.getType())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Structure mise à jour avec succès");
            response.put("data", updated);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_UPDATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec mise à jour structure")
                            .entity(EntityType.STRUCTURE, id, null)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("new_name", request.getOfficialName())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la mise à jour: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_UPDATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur technique mise à jour structure")
                            .entity(EntityType.STRUCTURE, id, null)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Supprimer définitivement une structure interne
     */
    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStructureHard(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;
        String structureName = null;

        try {
            log.info("=== SUPPRESSION PHYSIQUE STRUCTURE ID: {} ===", id);
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            // Récupérer le nom pour l'audit
            try {
                StructureInterneDTO structure = structureService.getStructureById(id);
                structureName = structure.getOfficialName();
            } catch (Exception e) {
                structureName = "unknown";
            }

            structureService.deleteStructureHard(id, adminId);

            // AUDIT: Suppression physique structure
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_DELETE_STRUCTURE_HARD")
                            .actionType(ActionType.DELETION)
                            .description("Suppression physique d'une structure interne")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_id", id)
                            .detail("structure_name", structureName)
                            .detail("deletion_type", "PHYSICAL")
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Structure supprimée définitivement avec succès"
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_DELETE_STRUCTURE_HARD")
                            .actionType(ActionType.DELETION)
                            .description("Échec suppression physique structure")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la suppression: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_DELETE_STRUCTURE_HARD")
                            .actionType(ActionType.DELETION)
                            .description("Erreur technique suppression structure")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Désactiver une structure interne (suppression logique)
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateStructure(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;
        String structureName = null;

        try {
            log.info("=== DÉSACTIVATION STRUCTURE ID: {} ===", id);
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            // Récupérer le nom pour l'audit
            try {
                StructureInterneDTO structure = structureService.getStructureById(id);
                structureName = structure.getOfficialName();
            } catch (Exception e) {
                structureName = "unknown";
            }

            StructureInterneDTO deactivated = structureService.deactivateStructure(id, adminId);

            // AUDIT: Désactivation structure
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_DEACTIVATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Désactivation d'une structure interne")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_id", id)
                            .detail("structure_name", structureName)
                            .detail("action", "DEACTIVATE")
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Structure désactivée avec succès",
                    "data", deactivated
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_DEACTIVATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec désactivation structure")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la désactivation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_DEACTIVATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur technique désactivation structure")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Réactiver une structure interne
     */
    @PutMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> reactivateStructure(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;
        String structureName = null;

        try {
            log.info("=== RÉACTIVATION STRUCTURE ID: {} ===", id);
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            // Récupérer le nom pour l'audit
            try {
                StructureInterneDTO structure = structureService.getStructureById(id);
                structureName = structure.getOfficialName();
            } catch (Exception e) {
                structureName = "unknown";
            }

            StructureInterneDTO reactivated = structureService.reactivateStructure(id, adminId);

            // AUDIT: Réactivation structure
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_REACTIVATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Réactivation d'une structure interne")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_id", id)
                            .detail("structure_name", structureName)
                            .detail("action", "REACTIVATE")
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Structure réactivée avec succès",
                    "data", reactivated
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_REACTIVATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec réactivation structure")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la réactivation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_REACTIVATE_STRUCTURE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur technique réactivation structure")
                            .entity(EntityType.STRUCTURE, id, structureName)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Récupérer toutes les structures internes
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllStructures(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;

        try {
            log.info("=== RÉCUPÉRATION DE TOUTES LES STRUCTURES ===");
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            validateAdmin(authHeader);

            List<StructureInterneDTO> structures = structureService.getAllStructures();

            // AUDIT: Consultation liste structures
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ALL_STRUCTURES")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation de toutes les structures")
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structures_count", structures.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "structures", structures,
                    "count", structures.size()
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ALL_STRUCTURES")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation structures")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ALL_STRUCTURES")
                            .actionType(ActionType.SEARCH)
                            .description("Erreur technique consultation structures")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Récupérer les structures actives
     */
    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getActiveStructures(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;

        try {
            log.info("=== RÉCUPÉRATION DES STRUCTURES ACTIVES ===");
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            validateAdmin(authHeader);

            List<StructureInterneDTO> structures = structureService.getAllActiveStructures();

            // AUDIT: Consultation structures actives
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ACTIVE_STRUCTURES")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation des structures actives")
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("active_structures_count", structures.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "structures", structures,
                    "count", structures.size()
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_ACTIVE_STRUCTURES")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation structures actives")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer une structure par son ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getStructureById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;

        try {
            log.info("=== RÉCUPÉRATION STRUCTURE ID: {} ===", id);
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            validateAdmin(authHeader);

            StructureInterneDTO structure = structureService.getStructureById(id);

            // AUDIT: Consultation structure par ID
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_STRUCTURE_BY_ID")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation d'une structure par ID")
                            .entity(EntityType.STRUCTURE, id, structure.getOfficialName())
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_id", id)
                            .detail("structure_name", structure.getOfficialName())
                            .detail("structure_type", structure.getType())
                            .detail("is_active", structure.getIsActive())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "structure", structure
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_STRUCTURE_BY_ID")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation structure")
                            .entity(EntityType.STRUCTURE, id, null)
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_id", id)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer les structures par type
     */
    @GetMapping("/type/{type}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getStructuresByType(
            @PathVariable StructureType type,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long adminId = null;
        String adminEmail = null;

        try {
            log.info("=== RÉCUPÉRATION STRUCTURES PAR TYPE: {} ===", type);
            adminId = getAdminIdFromToken(authHeader);
            adminEmail = getAdminEmailFromToken(authHeader);

            validateAdmin(authHeader);

            List<StructureInterneDTO> structures = structureService.getStructuresByType(type);

            // AUDIT: Consultation structures par type
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_STRUCTURES_BY_TYPE")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation des structures par type")
                            .user(adminId, adminEmail, "ADMIN")
                            .success()
                            .detail("structure_type", type.name())
                            .detail("structures_count", structures.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "structures", structures,
                    "count", structures.size()
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("ADMIN_GET_STRUCTURES_BY_TYPE")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation structures par type")
                            .user(adminId, adminEmail, "ADMIN")
                            .failure(e.getMessage())
                            .detail("structure_type", type.name())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private String getAdminEmailFromToken(String authHeader) {
        String token = extractToken(authHeader);
        return jwtUtil.extractUsername(token);
    }

    private void validateAdmin(String authHeader) {
        getAdminIdFromToken(authHeader);
    }

    private Long getAdminIdFromToken(String authHeader) {
        String token = extractToken(authHeader);
        String email = jwtUtil.extractUsername(token);

        Administrateur admin = administrateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé avec l'email: " + email));

        return admin.getId();
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification manquant ou invalide");
        }
        return authHeader.substring(7);
    }
}