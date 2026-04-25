package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.validation.DecisionRequest;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.dto.validation.DocumentValidationRequest;
import com.tunisia.commerce.dto.validation.ValidationSummaryDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.exception.ValidationException;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.DemandeValidateurRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.ValidationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

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
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== RÉCUPÉRATION DES DEMANDES ==========");
        log.info("Type: {}, Status: {}", type, status);

        try {
            String token = extractToken(authHeader);
            String email = jwtUtil.extractUsername(token);

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            List<DemandeEnregistrementDTO> demandes;

            // 🔥 DIFFÉRENCIER SELON LE RÔLE
            if (user.getRole() == UserRole.ADMIN) {
                // ADMIN : voit toutes les demandes
                log.info("👑 Accès ADMIN - Toutes les demandes");
                demandes = validationService.getAllDemandes(type, status);

            } else if (user.getRole() == UserRole.INSTANCE_VALIDATION) {
                // INSTANCE : voit uniquement ses demandes assignées
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

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", demandes);
            response.put("count", demandes.size());

            // Ajouter des statistiques supplémentaires pour l'instance
            if (user.getRole() == UserRole.INSTANCE_VALIDATION) {
                InstanceValidation instance = (InstanceValidation) user;
                long pendingCount = validationService.countPendingDemandesByInstance(instance.getId());
                response.put("pendingCount", pendingCount);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
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
            @RequestBody(required = false) DecisionRequest request) {  // 🔥 RETIRER @AuthenticationPrincipal

        log.info("========== APPROBATION DEMANDE ID: {} ==========", id);

        try {
            Long agentId = getCurrentAgentId();
            log.info("Agent ID qui valide: {}", agentId);

            String comment = request != null ? request.getComment() : null;
            log.info("Commentaire: {}", comment);

            // 🔥 Vérifier si la demande existe
            DemandeEnregistrement demandeTEST = demandeRepository.findById(id).orElse(null);
            log.info("Demande trouvée: ID={}, Référence={}, Statut={}",
                    demandeTEST != null ? demandeTEST.getId() : "null",
                    demandeTEST != null ? demandeTEST.getReference() : "null",
                    demandeTEST != null ? demandeTEST.getStatus() : "null");

            // 🔥 Vérifier si l'agent a une validation assignée
            DemandeValidateur validation = demandeValidateurRepository
                    .findByDemandeIdAndInstanceId(id, agentId).orElse(null);
            log.info("Validation assignée: {}", validation != null ? "OUI" : "NON");

            if (validation != null) {
                log.info("Statut de la validation: {}", validation.getValidationStatus());
                log.info("Structure: {}", validation.getStructure().getOfficialName());
            }

            DemandeEnregistrementDTO demande = validationService.approveDemande(id, agentId, comment);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande approuvée avec succès");
            response.put("data", demande);
            if (demande.getNumeroAgrement() != null) {
                response.put("numeroAgrement", demande.getNumeroAgrement());
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
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
            @RequestBody DecisionRequest request) {  // 🔥 RETIRER @AuthenticationPrincipal

        log.info("========== REJET DEMANDE ID: {} ==========", id);

        try {
            Long agentId = getCurrentAgentId();  // 🔥 UTILISER LA NOUVELLE MÉTHODE
            String reason = request != null && request.getComment() != null ? request.getComment() : "Demande rejetée";

            DemandeEnregistrementDTO demande = validationService.rejectDemande(id, agentId, reason);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande rejetée avec succès");
            response.put("data", demande);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
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
            @RequestBody DecisionRequest request) {  // 🔥 RETIRER @AuthenticationPrincipal

        log.info("========== DEMANDE D'INFOS SUPPLÉMENTAIRES ID: {} ==========", id);

        try {
            Long agentId = getCurrentAgentId();  // 🔥 UTILISER LA NOUVELLE MÉTHODE
            String comment = request != null && request.getComment() != null ? request.getComment() : "Informations complémentaires requises";

            DemandeEnregistrementDTO demande = validationService.requestMoreInfo(id, agentId, comment);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande d'informations envoyée avec succès");
            response.put("data", demande);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
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
            @RequestBody DocumentValidationRequest request) {  // 🔥 RETIRER @AuthenticationPrincipal

        log.info("========== VALIDATION DOCUMENT ID: {} ==========", documentId);
        log.info("Statut: {}, Commentaire: {}", request.getStatus(), request.getComment());

        try {
            Long agentId = getCurrentAgentId();  // 🔥 UTILISER LA NOUVELLE MÉTHODE

            Document document = validationService.validateDocument(
                    documentId,
                    agentId,
                    request.getStatus(),
                    request.getComment()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document validé avec succès");
            response.put("documentId", document.getId());
            response.put("status", document.getStatus());
            response.put("validatedAt", document.getValidatedAt());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
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