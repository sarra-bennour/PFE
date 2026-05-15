package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.importateur.DemandeImportationRequestDTO;
import com.tunisia.commerce.dto.importateur.ImportateurStatutsDTO;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.exception.ImportateurException;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.ImportateurRepository;
import com.tunisia.commerce.service.ImportateurService;
import com.tunisia.commerce.service.RapportPDFService;
import com.tunisia.commerce.service.impl.AuditService;
import com.tunisia.commerce.service.impl.DemandeImportationService;
import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.service.impl.SecureStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/importateur")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Importateur", description = "API pour la gestion des fonctionnalités importateur")
@CrossOrigin(origins = "*")
public class ImportateurController {

    private final ImportateurService importateurService;
    private final DemandeImportationService demandeImportationService;
    private final JwtUtil jwtUtil;
    private final ImportateurRepository importateurRepository;
    private final DocumentRepository documentRepository;
    private final AuditService auditService;
    private final RapportPDFService rapportPDFService;



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

    // ==================== ENDPOINTS EXISTANTS POUR LA RECHERCHE ====================

    @Operation(
            summary = "Recherche multi-critères d'exportateurs validés",
            description = "Recherche des exportateurs validés (agrément VALIDE) par pays, raison sociale, produit ou code NGP"
    )
    @GetMapping("/exportateurs/recherche")
    public ResponseEntity<?> rechercherExportateurs(
            @Parameter(description = "Terme de recherche (pays, raison sociale, produit, code NGP)")
            @RequestParam(required = false) String q,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== DÉBUT RECHERCHE EXPORTATEURS ==========");
        log.info("Terme de recherche reçu: '{}'", q);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherExportateursValides(q);

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            log.info("Résultats trouvés: {} exportateur(s)", resultats.size());
            log.info("Temps d'exécution: {} ms", duration);
            log.info("========== FIN RECHERCHE EXPORTATEURS ==========");

            // AUDIT: Recherche exportateurs
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_RECHERCHER_EXPORTATEURS")
                            .actionType(ActionType.SEARCH)
                            .description("Recherche d'exportateurs validés")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("search_term", q != null ? q : "")
                            .detail("results_count", resultats.size())
                            .detail("duration_ms", duration)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_RECHERCHER_EXPORTATEURS")
                            .actionType(ActionType.SEARCH)
                            .description("Échec recherche exportateurs")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("search_term", q != null ? q : "")
                            .detail("error_code", e.getErrorCode())
                            .detail("ip_address", clientIp)
            );

            log.error("ERREUR ImportateurException: Code={}, Message={}", e.getErrorCode(), e.getMessage());
            return handleImportateurException(e);
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_RECHERCHER_EXPORTATEURS")
                            .actionType(ActionType.SEARCH)
                            .description("Erreur inattendue recherche exportateurs")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("search_term", q != null ? q : "")
                            .detail("ip_address", clientIp)
            );

            log.error("ERREUR inattendue: {}", e.getMessage());
            return handleGenericException(e);
        }
    }


    @Operation(
            summary = "Lister tous les exportateurs validés",
            description = "Récupère la liste de tous les exportateurs avec un agrément VALIDE"
    )
    @GetMapping("/exportateurs")
    public ResponseEntity<?> getAllExportateursValides(HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== LISTE TOUS EXPORTATEURS VALIDÉS ==========");

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> exportateurs = importateurService.getAllExportateursValides();

            long endTime = System.currentTimeMillis();

            log.info("Nombre total d'exportateurs validés: {}", exportateurs.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            // AUDIT: Liste tous exportateurs
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_GET_ALL_EXPORTATEURS")
                            .actionType(ActionType.SEARCH)
                            .description("Liste de tous les exportateurs validés")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("exportateurs_count", exportateurs.size())
                            .detail("duration_ms", endTime - startTime)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(exportateurs);

        } catch (ImportateurException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_GET_ALL_EXPORTATEURS")
                            .actionType(ActionType.SEARCH)
                            .description("Échec liste exportateurs")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("ERREUR lors de la récupération de tous les exportateurs: {}", e.getMessage());
            return handleImportateurException(e);
        }
    }

    // ==================== NOUVEAUX ENDPOINTS POUR LES DEMANDES D'IMPORTATION ====================

    /**
     * Créer une nouvelle demande d'importation
     */
    @Operation(
            summary = "Créer une demande d'importation",
            description = "Crée une nouvelle demande d'importation pour un produit"
    )
    @PostMapping("/demandes")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> createImportationDemande(
            @Valid @RequestBody DemandeImportationRequestDTO request,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== CRÉATION DEMANDE D'IMPORTATION ==========");

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            userEmail = importateur.getEmail();
            userId = importateur.getId();

            DemandeEnregistrementDTO demande = demandeImportationService.createImportationDemande(
                    importateur.getId(),
                    request
            );

            // AUDIT: Création demande importation
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_CREER_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Création d'une demande d'importation")
                            .entity(EntityType.DEMANDE, demande.getId(), demande.getReference())
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("product_id", request.getProduitId())
                            .detail("exporter_id", request.getExportateurId())
                            .detail("amount", request.getAmount())
                            .detail("currency", request.getCurrency())
                            .detail("ip_address", clientIp)
            );

            return new ResponseEntity<>(demande, HttpStatus.CREATED);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_CREER_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Échec création demande d'importation")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("product_id", request.getProduitId())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la création de la demande: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "CREATION_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Uploader un document pour une demande d'importation
     */
    @Operation(
            summary = "Uploader un document",
            description = "Télécharge un document pour une demande d'importation spécifique"
    )
    @PostMapping(value = "/demandes/{demandeId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> uploadDocument(
            @Parameter(description = "ID de la demande") @PathVariable Long demandeId,
            @Parameter(description = "Type de document") @RequestParam String documentType,
            @Parameter(description = "Fichier à uploader") @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== UPLOAD DOCUMENT ==========");
        log.info("Demande ID: {}", demandeId);
        log.info("Type de document: {}", documentType);
        log.info("Nom du fichier: {}", file.getOriginalFilename());

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            userEmail = importateur.getEmail();
            userId = importateur.getId();

            log.info("Importateur authentifié: ID={}", importateur.getId());

            DocumentDTO document = demandeImportationService.uploadDocument(
                    demandeId,
                    importateur.getId(),
                    file,
                    documentType
            );

            log.info("Document uploadé avec succès, ID: {}", document.getId());
            log.info("========== FIN UPLOAD ==========");

            // AUDIT: Upload document
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_UPLOAD_DOCUMENT")
                            .actionType(ActionType.UPLOAD)
                            .description("Upload de document pour une demande d'importation")
                            .entity(EntityType.DOCUMENT, document.getId(), document.getFileName())
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("demande_id", demandeId)
                            .detail("document_type", documentType)
                            .detail("file_name", file.getOriginalFilename())
                            .detail("file_size", file.getSize())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document téléchargé avec succès");
            response.put("documentId", document.getId());
            response.put("fileName", document.getFileName());
            response.put("documentType", documentType);
            response.put("status", document.getStatus());
            response.put("fileSize", document.getFileSize());
            response.put("uploadedAt", document.getUploadedAt());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_UPLOAD_DOCUMENT")
                            .actionType(ActionType.UPLOAD)
                            .description("Échec upload document")
                            .user(userId, userEmail,"IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("document_type", documentType)
                            .detail("file_name", file.getOriginalFilename())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de l'upload du document: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "UPLOAD_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Soumettre une demande d'importation pour traitement
     */
    @Operation(
            summary = "Soumettre une demande d'importation",
            description = "Soumet la demande d'importation pour validation par les agents"
    )
    @PostMapping("/demandes/{demandeId}/soumettre")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> submitDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== SOUMISSION DEMANDE D'IMPORTATION ==========");
        log.info("Demande ID: {}", demandeId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            userEmail = importateur.getEmail();
            userId = importateur.getId();

            log.info("Importateur authentifié: ID={}", importateur.getId());

            DemandeEnregistrementDTO demande = demandeImportationService.submitImportationDemande(
                    demandeId,
                    importateur.getId()
            );

            log.info("Demande soumise avec succès, référence: {}", demande.getReference());
            log.info("========== FIN SOUMISSION ==========");

            // AUDIT: Soumission demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_SOUMETTRE_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Soumission d'une demande d'importation")
                            .entity(EntityType.DEMANDE, demande.getId(), demande.getReference())
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("demande_id", demandeId)
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande soumise avec succès pour traitement");
            response.put("demandeId", demande.getId());
            response.put("reference", demande.getReference());
            response.put("status", demande.getStatus());
            response.put("submittedAt", demande.getSubmittedAt());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_SOUMETTRE_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Échec soumission demande")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la soumission de la demande: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "SUBMISSION_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Récupérer toutes les demandes d'importation de l'importateur connecté
     */
    @Operation(
            summary = "Mes demandes d'importation",
            description = "Récupère la liste de toutes les demandes d'importation de l'importateur connecté"
    )
    // Ajouter/modifier cet endpoint pour retourner les données formatées
    @GetMapping("/mes-demandes")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> getMyDemandes(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== RÉCUPÉRATION MES DEMANDES POUR TRACKING ==========");

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            userEmail = importateur.getEmail();
            userId = importateur.getId();

            log.info("Importateur authentifié: ID={}", importateur.getId());

            List<Map<String, Object>> demandes = demandeImportationService.getDemandesForTracking(importateur.getId());

            log.info("Nombre de demandes trouvées: {}", demandes.size());

            // AUDIT: Consultation mes demandes
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_GET_MES_DEMANDES")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation de ses demandes d'importation")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("demandes_count", demandes.size())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("demandes", demandes);
            response.put("count", demandes.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_GET_MES_DEMANDES")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation demandes")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la récupération des demandes: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "RETRIEVAL_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }


    /**
     * Récupérer tous les documents d'une demande d'importation
     */
    @Operation(
            summary = "Documents d'une demande",
            description = "Récupère la liste de tous les documents associés à une demande d'importation"
    )
    @GetMapping("/demandes/{demandeId}/documents")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> getDocumentsForDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== RÉCUPÉRATION DOCUMENTS ==========");
        log.info("Demande ID: {}", demandeId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            userEmail = importateur.getEmail();
            userId = importateur.getId();

            List<Document> documents = documentRepository.findByDemandeId(demandeId);

            List<Map<String, Object>> result = documents.stream()
                    .map(doc -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", doc.getId());
                        map.put("fileName", doc.getFileName());
                        map.put("documentType", doc.getDocumentType().toString());
                        map.put("fileSize", doc.getFileSize());
                        map.put("uploadedAt", doc.getUploadedAt());
                        map.put("status", doc.getStatus().toString());
                        return map;
                    })
                    .collect(Collectors.toList());

            // AUDIT: Consultation documents
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_GET_DOCUMENTS")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation des documents d'une demande")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("demande_id", demandeId)
                            .detail("documents_count", result.size())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("documents", result);
            response.put("count", result.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_GET_DOCUMENTS")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation documents")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "RETRIEVAL_FAILED");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }


    /**
     * Modifier une demande d'importation avec ses documents
     */
    @Operation(
            summary = "Modifier une demande d'importation",
            description = "Modifie une demande d'importation existante (uniquement si elle est en brouillon) avec possibilité de mettre à jour les documents"
    )
    @PutMapping(value = "/demandes/{demandeId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> updateDemandeWithDocuments(
            @Parameter(description = "ID de la demande à modifier") @PathVariable Long demandeId,
            @RequestPart("data") @Valid DemandeImportationRequestDTO request,
            @RequestParam(value = "files", required = false) MultipartFile[] files,
            @RequestParam(value = "documentTypes", required = false) String[] documentTypes,
            @RequestParam(value = "documentsToDelete", required = false) List<Long> documentsToDelete,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== MODIFICATION DEMANDE AVEC DOCUMENTS ==========");
        log.info("Demande ID: {}", demandeId);
        log.info("Documents à supprimer: {}", documentsToDelete);
        log.info("Nouveaux documents: {}", files != null ? files.length : 0);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            userEmail = importateur.getEmail();
            userId = importateur.getId();

            log.info("Importateur authentifié: ID={}", importateur.getId());

            Map<String, MultipartFile> filesMap = new HashMap<>();
            if (files != null && documentTypes != null) {
                for (int i = 0; i < files.length && i < documentTypes.length; i++) {
                    String documentType = documentTypes[i];
                    MultipartFile file = files[i];
                    filesMap.put(documentType, file);
                    log.info("Fichier: {} -> Type reçu: {}", file.getOriginalFilename(), documentType);
                }
            }

            DemandeEnregistrementDTO demande = demandeImportationService.updateImportationDemandeWithDocuments(
                    demandeId,
                    importateur.getId(),
                    request,
                    filesMap,
                    documentsToDelete
            );

            log.info("Demande ID: {} modifiée avec succès", demandeId);
            log.info("========== FIN MODIFICATION ==========");

            // AUDIT: Modification demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_MODIFIER_DEMANDE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Modification d'une demande d'importation")
                            .entity(EntityType.DEMANDE, demande.getId(), demande.getReference())
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("demande_id", demandeId)
                            .detail("documents_added", files != null ? files.length : 0)
                            .detail("documents_deleted", documentsToDelete != null ? documentsToDelete.size() : 0)
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande modifiée avec succès");
            response.put("demandeId", demande.getId());
            response.put("reference", demande.getReference());
            response.put("status", demande.getStatus());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_MODIFIER_DEMANDE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec modification demande")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la modification de la demande {}: {}", demandeId, e.getMessage());

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "UPDATE_FAILED");
            errorResponse.put("message", e.getMessage());

            if (e.getMessage().contains("non autorisé")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
            } else if (e.getMessage().contains("brouillon")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
            } else if (e.getMessage().contains("non trouvée")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Supprimer une demande d'importation (uniquement si elle est en brouillon)
     */
    @Operation(
            summary = "Supprimer une demande d'importation",
            description = "Supprime une demande d'importation ainsi que tous ses documents associés (uniquement si elle est en brouillon)"
    )
    @DeleteMapping("/demandes/{demandeId}")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> deleteDemande(
            @Parameter(description = "ID de la demande à supprimer") @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        log.info("========== SUPPRESSION DEMANDE D'IMPORTATION ==========");
        log.info("Demande ID: {}", demandeId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            userEmail = importateur.getEmail();
            userId = importateur.getId();

            log.info("Importateur authentifié: ID={}", importateur.getId());

            demandeImportationService.deleteImportationDemande(demandeId, importateur.getId());

            log.info("Demande ID: {} supprimée avec succès", demandeId);
            log.info("========== FIN SUPPRESSION ==========");

            // AUDIT: Suppression demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_SUPPRIMER_DEMANDE")
                            .actionType(ActionType.DELETION)
                            .description("Suppression d'une demande d'importation")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("demande_id", demandeId)
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande supprimée avec succès");
            response.put("demandeId", demandeId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("IMPORTATEUR_SUPPRIMER_DEMANDE")
                            .actionType(ActionType.DELETION)
                            .description("Échec suppression demande")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("ip_address", clientIp)
            );

            log.error("Erreur lors de la suppression de la demande {}: {}", demandeId, e.getMessage());

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "DELETE_FAILED");
            errorResponse.put("message", e.getMessage());

            if (e.getMessage().contains("non autorisé")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
            } else if (e.getMessage().contains("brouillon")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
            } else if (e.getMessage().contains("non trouvée")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // ==================== ENDPOINTS POUR LE DASHBOARD ====================

    @Operation(
            summary = "Statistiques du dashboard importateur",
            description = "Récupère toutes les statistiques pour le dashboard"
    )
    @GetMapping("/dashboard/stats")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> getDashboardStats(@RequestHeader("Authorization") String authHeader) {
        log.info("========== RÉCUPÉRATION STATISTIQUES DASHBOARD ==========");

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            Map<String, Object> stats = importateurService.getDashboardStats(importateur.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", stats);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Erreur lors de la récupération des statistiques: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/dashboard/rapport")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<byte[]> generateRapport(@RequestHeader("Authorization") String authHeader) {
        ImportateurTunisien importateur = getImportateurFromToken(authHeader);
        byte[] pdf = rapportPDFService.generateRapportPDF(importateur.getId());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "rapport_importation.pdf");

        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }
    // ==================== MÉTHODES PRIVÉES ====================

    /**
     * Extraire l'importateur du token JWT
     */
    private ImportateurTunisien getImportateurFromToken(String authHeader) {
        String token = extractToken(authHeader);
        String email = jwtUtil.extractUsername(token);

        return importateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Importateur non trouvé avec l'email: " + email));
    }

    /**
     * Extraire le token du header Authorization
     */
    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification invalide ou manquant");
        }
        return authHeader.substring(7);
    }


    // ==================== GESTION DES EXCEPTIONS ====================

    @ExceptionHandler(ImportateurException.class)
    public ResponseEntity<?> handleImportateurException(ImportateurException e) {
        log.error("ImportateurException: {} - {}", e.getErrorCode(), e.getMessage());

        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("status", e.getStatus().value());
        errorResponse.put("error", e.getStatus().getReasonPhrase());
        errorResponse.put("message", e.getMessage());
        errorResponse.put("errorCode", e.getErrorCode());
        errorResponse.put("timestamp", System.currentTimeMillis());

        return new ResponseEntity<>(errorResponse, e.getStatus());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericException(Exception e) {
        log.error("Erreur inattendue: {}", e.getMessage(), e);

        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorResponse.put("error", "Erreur Interne du Serveur");
        errorResponse.put("message", "Une erreur inattendue s'est produite");
        errorResponse.put("timestamp", System.currentTimeMillis());

        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // ==================== ENDPOINTS POUR LES STATUTS DES PRODUITS ====================

    @GetMapping("/produits/statuts")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> getProduitsStatuts(@RequestHeader("Authorization") String authHeader) {
        log.info("========== RÉCUPÉRATION DES STATUTS DES PRODUITS ==========");

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            ImportateurStatutsDTO statuts = importateurService.getProduitsStatuts(importateur.getId());

            log.info("Statuts récupérés: acceptés={}, enAttente={}, soumis={}",
                    statuts.getAcceptedProductIds().size(),
                    statuts.getPendingProductIds().size(),
                    statuts.getSubmittedProductIds().size());

            return ResponseEntity.ok(statuts);

        } catch (ImportateurException e) {
            return handleImportateurException(e);
        } catch (Exception e) {
            log.error("ERREUR inattendue: {}", e.getMessage());
            return handleGenericException(e);
        }
    }

}