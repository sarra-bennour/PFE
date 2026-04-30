package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.validation.DecisionRequest;
import com.tunisia.commerce.dto.validation.DocumentValidationRequest;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.exception.ValidationException;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.DemandeValidateurRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.ValidationService;
import com.tunisia.commerce.service.impl.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;


import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/validation")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Validation", description = "API pour la gestion des validations des demandes")
@CrossOrigin(origins = "*")
public class ValidationController {

    private final JwtUtil jwtUtil;
    private final ValidationService validationService;
    private final UserRepository userRepository;
    private final DemandeEnregistrementRepository demandeRepository;
    private final DemandeValidateurRepository demandeValidateurRepository;
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

    // ==================== ENDPOINTS POUR LES DEMANDES ====================

    /**
     * Récupérer les demandes (ADMIN voit tout, INSTANCE voit ses demandes)
     */
    @GetMapping("/demandes")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Récupérer les demandes",
            description = "ADMIN: toutes les demandes | INSTANCE: uniquement ses demandes assignées")
    public ResponseEntity<?> getAllDemandes(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;
        String userRole = null;

        log.info("========== RÉCUPÉRATION DES DEMANDES ==========");
        log.info("Type: {}, Status: {}", type, status);

        try {
            String token = extractToken(authHeader);
            String email = jwtUtil.extractUsername(token);
            userEmail = email;

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            userId = user.getId();
            userRole = user.getRole().name();

            List<DemandeEnregistrementDTO> demandes;

            if (user.getRole() == UserRole.ADMIN) {
                log.info("👑 Accès ADMIN - Toutes les demandes");
                demandes = validationService.getAllDemandes(type, status);
            } else if (user.getRole() == UserRole.INSTANCE_VALIDATION) {
                log.info("👤 Accès INSTANCE - Demandes assignées à l'instance");
                InstanceValidation instance = (InstanceValidation) user;
                demandes = validationService.getDemandesByInstance(instance.getId(), type, status);
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "success", false,
                        "error", "ACCES_DENIED",
                        "message", "Rôle non autorisé pour accéder à cette ressource"
                ));
            }

            // AUDIT: Consultation demandes
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_GET_DEMANDES")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation des demandes de validation")
                            .user(userId, userEmail, userRole)
                            .success()
                            .detail("type", type != null ? type : "all")
                            .detail("status", status != null ? status : "all")
                            .detail("demandes_count", demandes.size())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", demandes);
            response.put("count", demandes.size());

            if (user.getRole() == UserRole.INSTANCE_VALIDATION) {
                InstanceValidation instance = (InstanceValidation) user;
                long pendingCount = validationService.countPendingDemandesByInstance(instance.getId());
                response.put("pendingCount", pendingCount);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_GET_DEMANDES")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation demandes")
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("type", type != null ? type : "all")
                            .detail("status", status != null ? status : "all")
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la récupération des demandes: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "RETRIEVAL_FAILED",
                    "message", e.getMessage()
            ));
        }
    }
    // ==================== ENDPOINTS POUR LES DÉCISIONS ====================

    @PostMapping("/demandes/{id}/approve")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Approuver une demande", description = "Valide une demande et génère un numéro d'agrément si nécessaire")
    public ResponseEntity<?> approveDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long agentId = null;
        String agentEmail = null;
        String agentRole = null;
        String demandeReference = null;

        log.info("========== APPROBATION DEMANDE ID: {} ==========", id);

        try {
            agentId = getCurrentAgentId();

            // Récupérer l'agent pour l'audit
            User agent = userRepository.findById(agentId).orElse(null);
            if (agent != null) {
                agentEmail = agent.getEmail();
                agentRole = agent.getRole().name();
            }

            // Récupérer la demande pour l'audit
            DemandeEnregistrement demande = demandeRepository.findById(id).orElse(null);
            if (demande != null) {
                demandeReference = demande.getReference();
            }

            String comment = request != null ? request.getComment() : null;
            log.info("Commentaire: {}", comment);

            DemandeEnregistrementDTO demandeDTO = validationService.approveDemande(id, agentId, comment);

            // AUDIT: Approbation demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_APPROVE_DEMANDE")
                            .actionType(ActionType.VALIDATION)
                            .description("Approbation d'une demande de validation")
                            .entity(EntityType.DEMANDE, id, demandeReference)
                            .user(agentId, agentEmail, agentRole)
                            .success()
                            .detail("demande_id", id)
                            .detail("comment", comment != null ? comment : "Aucun")
                            .detail("numero_agrement", demandeDTO.getNumeroAgrement())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande approuvée avec succès");
            response.put("data", demandeDTO);
            if (demandeDTO.getNumeroAgrement() != null) {
                response.put("numeroAgrement", demandeDTO.getNumeroAgrement());
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_APPROVE_DEMANDE")
                            .actionType(ActionType.VALIDATION)
                            .description("Échec approbation demande")
                            .entity(EntityType.DEMANDE, id, demandeReference)
                            .user(agentId, agentEmail, agentRole)
                            .failure(e.getMessage())
                            .detail("demande_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de l'approbation: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "APPROVAL_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/demandes/{id}/reject")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Rejeter une demande", description = "Refuse une demande avec une raison")
    public ResponseEntity<?> rejectDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @RequestBody DecisionRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long agentId = null;
        String agentEmail = null;
        String agentRole = null;
        String demandeReference = null;

        log.info("========== REJET DEMANDE ID: {} ==========", id);

        try {
            agentId = getCurrentAgentId();

            // Récupérer l'agent pour l'audit
            User agent = userRepository.findById(agentId).orElse(null);
            if (agent != null) {
                agentEmail = agent.getEmail();
                agentRole = agent.getRole().name();
            }

            // Récupérer la demande pour l'audit
            DemandeEnregistrement demande = demandeRepository.findById(id).orElse(null);
            if (demande != null) {
                demandeReference = demande.getReference();
            }

            String reason = request != null && request.getComment() != null ? request.getComment() : "Demande rejetée";

            DemandeEnregistrementDTO demandeDTO = validationService.rejectDemande(id, agentId, reason);

            // AUDIT: Rejet demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_REJECT_DEMANDE")
                            .actionType(ActionType.REJECTION)
                            .description("Rejet d'une demande de validation")
                            .entity(EntityType.DEMANDE, id, demandeReference)
                            .user(agentId, agentEmail, agentRole)
                            .success()
                            .detail("demande_id", id)
                            .detail("reason", reason)
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande rejetée avec succès");
            response.put("data", demandeDTO);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_REJECT_DEMANDE")
                            .actionType(ActionType.REJECTION)
                            .description("Échec rejet demande")
                            .entity(EntityType.DEMANDE, id, demandeReference)
                            .user(agentId, agentEmail, agentRole)
                            .failure(e.getMessage())
                            .detail("demande_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors du rejet: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "REJECTION_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/demandes/{id}/request-info")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Demander plus d'informations", description = "Met une demande en attente d'informations complémentaires")
    public ResponseEntity<?> requestMoreInfo(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @RequestBody DecisionRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long agentId = null;
        String agentEmail = null;
        String agentRole = null;
        String demandeReference = null;

        log.info("========== DEMANDE D'INFOS SUPPLÉMENTAIRES ID: {} ==========", id);

        try {
            agentId = getCurrentAgentId();

            // Récupérer l'agent pour l'audit
            User agent = userRepository.findById(agentId).orElse(null);
            if (agent != null) {
                agentEmail = agent.getEmail();
                agentRole = agent.getRole().name();
            }

            // Récupérer la demande pour l'audit
            DemandeEnregistrement demande = demandeRepository.findById(id).orElse(null);
            if (demande != null) {
                demandeReference = demande.getReference();
            }

            String comment = request != null && request.getComment() != null ? request.getComment() : "Informations complémentaires requises";

            DemandeEnregistrementDTO demandeDTO = validationService.requestMoreInfo(id, agentId, comment);

            // AUDIT: Demande plus d'informations
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_REQUEST_INFO")
                            .actionType(ActionType.MODIFICATION)
                            .description("Demande d'informations complémentaires")
                            .entity(EntityType.DEMANDE, id, demandeReference)
                            .user(agentId, agentEmail, agentRole)
                            .success()
                            .detail("demande_id", id)
                            .detail("comment", comment)
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande d'informations envoyée avec succès");
            response.put("data", demandeDTO);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_REQUEST_INFO")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec demande d'informations")
                            .entity(EntityType.DEMANDE, id, demandeReference)
                            .user(agentId, agentEmail, agentRole)
                            .failure(e.getMessage())
                            .detail("demande_id", id)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la demande d'infos: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "REQUEST_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // ==================== ENDPOINTS POUR LES DOCUMENTS ====================

    @PostMapping("/documents/{documentId}/validate")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Valider un document", description = "Valide ou rejette un document individuel")
    public ResponseEntity<?> validateDocument(
            @Parameter(description = "ID du document") @PathVariable Long documentId,
            @RequestBody DocumentValidationRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long agentId = null;
        String agentEmail = null;
        String agentRole = null;
        String documentName = null;

        log.info("========== VALIDATION DOCUMENT ID: {} ==========", documentId);
        log.info("Statut: {}, Commentaire: {}", request.getStatus(), request.getComment());

        try {
            agentId = getCurrentAgentId();

            // Récupérer l'agent pour l'audit
            User agent = userRepository.findById(agentId).orElse(null);
            if (agent != null) {
                agentEmail = agent.getEmail();
                agentRole = agent.getRole().name();
            }

            // Récupérer le document pour l'audit (optionnel, selon votre repository)
            // Document document = documentRepository.findById(documentId).orElse(null);
            // if (document != null) {
            //     documentName = document.getFileName();
            // }

            Document document = validationService.validateDocument(
                    documentId,
                    agentId,
                    request.getStatus(),
                    request.getComment()
            );

            documentName = document.getFileName();

            // AUDIT: Validation document
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_DOCUMENT")
                            .actionType(ActionType.VALIDATION)
                            .description("Validation d'un document")
                            .entity(EntityType.DOCUMENT, documentId, documentName)
                            .user(agentId, agentEmail, agentRole)
                            .success()
                            .detail("document_id", documentId)
                            .detail("validation_status", request.getStatus())
                            .detail("comment", request.getComment() != null ? request.getComment() : "Aucun")
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document validé avec succès");
            response.put("documentId", document.getId());
            response.put("status", document.getStatus());
            response.put("validatedAt", document.getValidatedAt());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VALIDATION_DOCUMENT")
                            .actionType(ActionType.VALIDATION)
                            .description("Échec validation document")
                            .entity(EntityType.DOCUMENT, documentId, documentName)
                            .user(agentId, agentEmail, agentRole)
                            .failure(e.getMessage())
                            .detail("document_id", documentId)
                            .detail("requested_status", request.getStatus())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la validation du document: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "DOCUMENT_VALIDATION_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }


    // ==================== MÉTHODES PRIVÉES ====================

    /**
     * Récupère l'ID de l'utilisateur actuellement authentifié
     */
    private Long getCurrentAgentId() {
        // Récupérer l'authentification depuis le SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("Aucune authentification trouvée dans le SecurityContext");
            throw new ValidationException("AUTHENTICATION_ERROR", "Utilisateur non authentifié");
        }

        String email = authentication.getName();
        log.info("Utilisateur authentifié: email={}", email);

        // Récupérer l'utilisateur depuis la base de données
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ValidationException("USER_NOT_FOUND",
                        "Utilisateur non trouvé avec l'email: " + email));

        log.info("Agent trouvé: ID={}, Nom={}, Rôle={}", user.getId(), user.getNom(), user.getRole());

        return user.getId();
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification manquant ou invalide");
        }
        return authHeader.substring(7);
    }
}