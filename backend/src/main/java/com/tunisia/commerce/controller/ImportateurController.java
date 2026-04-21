package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.importateur.DemandeImportationRequestDTO;
import com.tunisia.commerce.dto.importateur.ImportateurStatutsDTO;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.exception.ImportateurException;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.ImportateurRepository;
import com.tunisia.commerce.service.ImportateurService;
import com.tunisia.commerce.service.impl.DemandeImportationService;
import com.tunisia.commerce.config.JwtUtil;
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

    private static final String UPLOAD_DIR = "uploads/importateur/documents/";

    // ==================== ENDPOINTS EXISTANTS POUR LA RECHERCHE ====================

    @Operation(
            summary = "Recherche multi-critères d'exportateurs validés",
            description = "Recherche des exportateurs validés (agrément VALIDE) par pays, raison sociale, produit ou code NGP"
    )
    @GetMapping("/exportateurs/recherche")
    public ResponseEntity<?> rechercherExportateurs(
            @Parameter(description = "Terme de recherche (pays, raison sociale, produit, code NGP)")
            @RequestParam(required = false) String q) {

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

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR ImportateurException: Code={}, Message={}", e.getErrorCode(), e.getMessage());
            return handleImportateurException(e);
        } catch (Exception e) {
            log.error("ERREUR inattendue: {}", e.getMessage());
            return handleGenericException(e);
        }
    }


    @Operation(
            summary = "Lister tous les exportateurs validés",
            description = "Récupère la liste de tous les exportateurs avec un agrément VALIDE"
    )
    @GetMapping("/exportateurs")
    public ResponseEntity<?> getAllExportateursValides() {

        log.info("========== LISTE TOUS EXPORTATEURS VALIDÉS ==========");

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> exportateurs = importateurService.getAllExportateursValides();

            long endTime = System.currentTimeMillis();

            log.info("Nombre total d'exportateurs validés: {}", exportateurs.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(exportateurs);

        } catch (ImportateurException e) {
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
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== CRÉATION DEMANDE D'IMPORTATION ==========");

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);

            // Le service retourne maintenant un DTO avec toutes les informations
            DemandeEnregistrementDTO demande = demandeImportationService.createImportationDemande(
                    importateur.getId(),
                    request
            );

            return new ResponseEntity<>(demande, HttpStatus.CREATED);

        } catch (Exception e) {
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
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== UPLOAD DOCUMENT ==========");
        log.info("Demande ID: {}", demandeId);
        log.info("Type de document: {}", documentType);
        log.info("Nom du fichier: {}", file.getOriginalFilename());

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            log.info("Importateur authentifié: ID={}", importateur.getId());

            // Sauvegarder le document en base de données
            DocumentDTO document = demandeImportationService.uploadDocument(
                    demandeId,
                    importateur.getId(),
                    file,
                    documentType
            );

            log.info("Document uploadé avec succès, ID: {}", document.getId());
            log.info("========== FIN UPLOAD ==========");

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
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== SOUMISSION DEMANDE D'IMPORTATION ==========");
        log.info("Demande ID: {}", demandeId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            log.info("Importateur authentifié: ID={}", importateur.getId());

            DemandeEnregistrementDTO demande = demandeImportationService.submitImportationDemande(
                    demandeId,
                    importateur.getId()
            );

            log.info("Demande soumise avec succès, référence: {}", demande.getReference());
            log.info("========== FIN SOUMISSION ==========");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande soumise avec succès pour traitement");
            response.put("demandeId", demande.getId());
            response.put("reference", demande.getReference());
            response.put("status", demande.getStatus());
            response.put("submittedAt", demande.getSubmittedAt());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
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
    public ResponseEntity<?> getMyDemandes(@RequestHeader("Authorization") String authHeader) {
        log.info("========== RÉCUPÉRATION MES DEMANDES POUR TRACKING ==========");

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            log.info("Importateur authentifié: ID={}", importateur.getId());

            List<Map<String, Object>> demandes = demandeImportationService.getDemandesForTracking(importateur.getId());

            log.info("Nombre de demandes trouvées: {}", demandes.size());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("demandes", demandes);
            response.put("count", demandes.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
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
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== RÉCUPÉRATION DOCUMENTS ==========");
        log.info("Demande ID: {}", demandeId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);

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

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("documents", result);
            response.put("count", result.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
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
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== MODIFICATION DEMANDE AVEC DOCUMENTS ==========");
        log.info("Demande ID: {}", demandeId);
        log.info("Documents à supprimer: {}", documentsToDelete);
        log.info("Nouveaux documents: {}", files != null ? files.length : 0);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            log.info("Importateur authentifié: ID={}", importateur.getId());

            // Convertir le tableau de fichiers en Map avec les types de documents
            Map<String, MultipartFile> filesMap = new HashMap<>();
            if (files != null && documentTypes != null) {
                for (int i = 0; i < files.length && i < documentTypes.length; i++) {
                    String documentType = documentTypes[i];
                    MultipartFile file = files[i];
                    filesMap.put(documentType, file);  // ✅ Utilise le type exact envoyé
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

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande modifiée avec succès");
            response.put("demandeId", demande.getId());
            response.put("reference", demande.getReference());
            response.put("status", demande.getStatus());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
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
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== SUPPRESSION DEMANDE D'IMPORTATION ==========");
        log.info("Demande ID: {}", demandeId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            log.info("Importateur authentifié: ID={}", importateur.getId());

            // Appeler le service pour supprimer la demande
            demandeImportationService.deleteImportationDemande(demandeId, importateur.getId());

            log.info("Demande ID: {} supprimée avec succès", demandeId);
            log.info("========== FIN SUPPRESSION ==========");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demande supprimée avec succès");
            response.put("demandeId", demandeId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
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