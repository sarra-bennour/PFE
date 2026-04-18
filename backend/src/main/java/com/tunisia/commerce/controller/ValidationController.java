package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.validation.DecisionRequest;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.dto.validation.DocumentValidationRequest;
import com.tunisia.commerce.dto.validation.ValidationSummaryDTO;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.exception.ValidationException;
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

    private final ValidationService validationService;
    private final UserRepository userRepository;

    // ==================== ENDPOINTS POUR LES DEMANDES ====================

    @GetMapping("/demandes")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Récupérer toutes les demandes", description = "Retourne la liste de toutes les demandes avec filtres optionnels")
    public ResponseEntity<?> getAllDemandes(
            @RequestParam(required = false) @Parameter(description = "Type de demandeur (EXPORTATEUR, IMPORTATEUR, ALL)") String type,
            @RequestParam(required = false) @Parameter(description = "Statut de la demande (SOUMISE, VALIDEE, REJETEE, EN_ATTENTE_INFO, ALL)") String status) {

        log.info("========== RÉCUPÉRATION TOUTES LES DEMANDES ==========");
        log.info("Type: {}, Status: {}", type, status);

        try {
            List<DemandeEnregistrementDTO> demandes = validationService.getAllDemandes(type, status);
            log.info("Nombre de demandes trouvées: {}", demandes.size());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", demandes);
            response.put("count", demandes.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des demandes: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "RETRIEVAL_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /*@GetMapping("/demandes/dossier-conformite")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Récupérer les dossiers de conformité", description = "Retourne la liste des demandes d'enregistrement exportateur (préfixe DOS-)")
    public ResponseEntity<?> getDossierConformiteDemandes(
            @RequestParam(required = false) @Parameter(description = "Statut de la demande") String status) {

        log.info("========== RÉCUPÉRATION DOSSIERS DE CONFORMITÉ (DOS-) ==========");

        try {
            List<DemandeEnregistrementDTO> demandes = validationService.getDemandesByReferencePrefix("DOS-", status);
            log.info("Nombre de dossiers de conformité trouvés: {}", demandes.size());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", demandes);
            response.put("count", demandes.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "RETRIEVAL_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }*/

    /*@GetMapping("/demandes/declaration-produits")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Récupérer les déclarations de produits", description = "Retourne la liste des demandes de déclaration de produits (préfixe DEM-)")
    public ResponseEntity<?> getDeclarationProduitsDemandes(
            @RequestParam(required = false) @Parameter(description = "Statut de la demande") String status) {

        log.info("========== RÉCUPÉRATION DÉCLARATIONS DE PRODUITS (DEM-) ==========");

        try {
            List<DemandeEnregistrementDTO> demandes = validationService.getDemandesByReferencePrefix("DEM-", status);
            log.info("Nombre de déclarations de produits trouvées: {}", demandes.size());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", demandes);
            response.put("count", demandes.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "RETRIEVAL_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }*/

    /*@GetMapping("/demandes/importation")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Récupérer les demandes d'importation", description = "Retourne la liste des demandes d'importation (préfixe IMP-)")
    public ResponseEntity<?> getImportationDemandes(
            @RequestParam(required = false) @Parameter(description = "Statut de la demande") String status) {

        log.info("========== RÉCUPÉRATION DEMANDES D'IMPORTATION (IMP-) ==========");

        try {
            List<DemandeEnregistrementDTO> demandes = validationService.getDemandesByReferencePrefix("IMP-", status);
            log.info("Nombre de demandes d'importation trouvées: {}", demandes.size());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", demandes);
            response.put("count", demandes.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "RETRIEVAL_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }*/

    /*@GetMapping("/demandes/{id}")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Récupérer une demande par ID", description = "Retourne les détails complets d'une demande spécifique")
    public ResponseEntity<?> getDemandeById(
            @Parameter(description = "ID de la demande") @PathVariable Long id) {

        log.info("========== RÉCUPÉRATION DEMANDE ID: {} ==========", id);

        try {
            DemandeEnregistrementDTO demande = validationService.getDemandeById(id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", demande);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "NOT_FOUND");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }
    }*/

    // ==================== ENDPOINTS POUR LES DÉCISIONS ====================

    @PostMapping("/demandes/{id}/approve")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Approuver une demande", description = "Valide une demande et génère un numéro d'agrément si nécessaire")
    public ResponseEntity<?> approveDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request) {  // 🔥 RETIRER @AuthenticationPrincipal

        log.info("========== APPROBATION DEMANDE ID: {} ==========", id);

        try {
            Long agentId = getCurrentAgentId();  // 🔥 UTILISER LA NOUVELLE MÉTHODE
            String comment = request != null ? request.getComment() : null;

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

    // ==================== ENDPOINTS POUR LES STATISTIQUES ====================

    /*@GetMapping("/summary")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Résumé des validations", description = "Retourne les statistiques globales des validations")
    public ResponseEntity<?> getValidationSummary() {

        log.info("========== RÉCUPÉRATION DU RÉSUMÉ DES VALIDATIONS ==========");

        try {
            ValidationSummaryDTO summary = validationService.getValidationSummary();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", summary);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération du résumé: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "SUMMARY_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }*/

    /*@GetMapping("/documents/{documentId}/telecharger")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Télécharger un document", description = "Télécharge le fichier d'un document spécifique")
    public ResponseEntity<?> downloadDocument(
            @Parameter(description = "ID du document") @PathVariable Long documentId) {  // 🔥 RETIRER @AuthenticationPrincipal

        log.info("========== TÉLÉCHARGEMENT DOCUMENT ID: {} ==========", documentId);

        try {
            Long agentId = getCurrentAgentId();  // 🔥 UTILISER LA NOUVELLE MÉTHODE

            org.springframework.core.io.Resource resource = validationService.getDocumentFile(documentId, agentId);
            DocumentDTO documentInfo = validationService.getDocumentDTOById(documentId, agentId);

            log.info("Document téléchargé: {}", documentInfo.getFileName());

            String contentType = determineContentType(documentInfo.getFileType());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + documentInfo.getFileName() + "\"")
                    .body(resource);

        } catch (ValidationException e) {
            log.error("Erreur: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", "DOWNLOAD_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }*/

    /*@GetMapping("/documents/{documentId}")
    @PreAuthorize("hasRole('INSTANCE_VALIDATION') or hasRole('ADMIN')")
    @Operation(summary = "Informations d'un document")
    public ResponseEntity<?> getDocumentInfo(
            @Parameter(description = "ID du document") @PathVariable Long documentId) {  // 🔥 RETIRER @AuthenticationPrincipal

        log.info("========== INFOS DOCUMENT ID: {} ==========", documentId);

        try {
            Long agentId = getCurrentAgentId();  // 🔥 UTILISER LA NOUVELLE MÉTHODE
            DocumentDTO documentInfo = validationService.getDocumentDTOById(documentId, agentId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", documentInfo);

            return ResponseEntity.ok(response);
        } catch (ValidationException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("success", "false");
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }
    }*/

    /*private String determineContentType(String fileType) {
        if (fileType == null) return "application/octet-stream";

        String type = fileType.toLowerCase();
        if (type.contains("pdf")) return "application/pdf";
        if (type.contains("jpg") || type.contains("jpeg")) return "image/jpeg";
        if (type.contains("png")) return "image/png";
        if (type.contains("gif")) return "image/gif";

        return "application/octet-stream";
    }*/

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
}