package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.importateur.DemandeImportationRequestDTO;
import com.tunisia.commerce.dto.importateur.ImportateurStatutsDTO;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.exception.ImportateurException;
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

    /*@Operation(
            summary = "Recherche d'exportateurs validés par pays",
            description = "Récupère la liste des exportateurs validés filtrée par pays d'origine"
    )
    @GetMapping("/exportateurs/pays/{pays}")
    public ResponseEntity<?> rechercherParPays(
            @Parameter(description = "Pays d'origine", required = true)
            @PathVariable String pays) {

        log.info("========== RECHERCHE PAR PAYS ==========");
        log.info("Pays recherché: '{}'", pays);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherParPays(pays);

            long endTime = System.currentTimeMillis();

            log.info("Résultats trouvés pour le pays '{}': {} exportateur(s)", pays, resultats.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par pays '{}': {}", pays, e.getMessage());
            return handleImportateurException(e);
        }
    }*/

    /*@Operation(
            summary = "Recherche d'exportateurs validés par raison sociale",
            description = "Récupère la liste des exportateurs validés filtrée par raison sociale (nom de l'entreprise)"
    )
    @GetMapping("/exportateurs/raison-sociale/{raisonSociale}")
    public ResponseEntity<?> rechercherParRaisonSociale(
            @Parameter(description = "Raison sociale de l'entreprise", required = true)
            @PathVariable String raisonSociale) {

        log.info("========== RECHERCHE PAR RAISON SOCIALE ==========");
        log.info("Raison sociale recherchée: '{}'", raisonSociale);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherParRaisonSociale(raisonSociale);

            long endTime = System.currentTimeMillis();

            log.info("Résultats trouvés pour '{}': {} exportateur(s)", raisonSociale, resultats.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par raison sociale '{}': {}", raisonSociale, e.getMessage());
            return handleImportateurException(e);
        }
    }*/

    /*@Operation(
            summary = "Recherche d'exportateurs validés par produit",
            description = "Récupère la liste des exportateurs validés qui proposent un produit spécifique"
    )
    @GetMapping("/exportateurs/produit/{produit}")
    public ResponseEntity<?> rechercherParProduit(
            @Parameter(description = "Nom du produit", required = true)
            @PathVariable String produit) {

        log.info("========== RECHERCHE PAR PRODUIT ==========");
        log.info("Produit recherché: '{}'", produit);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherParProduit(produit);

            long endTime = System.currentTimeMillis();

            log.info("Résultats trouvés pour le produit '{}': {} exportateur(s)", produit, resultats.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par produit '{}': {}", produit, e.getMessage());
            return handleImportateurException(e);
        }
    }*/

    /*@Operation(
            summary = "Recherche d'exportateurs validés par code NGP",
            description = "Récupère la liste des exportateurs validés qui proposent des produits avec un code NGP spécifique"
    )
    @GetMapping("/exportateurs/code-ngp/{codeNGP}")
    public ResponseEntity<?> rechercherParCodeNGP(
            @Parameter(description = "Code NGP du produit", required = true)
            @PathVariable String codeNGP) {

        log.info("========== RECHERCHE PAR CODE NGP ==========");
        log.info("Code NGP recherché: '{}'", codeNGP);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherParCodeNGP(codeNGP);

            long endTime = System.currentTimeMillis();

            log.info("Résultats trouvés pour le code NGP '{}': {} exportateur(s)", codeNGP, resultats.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par code NGP '{}': {}", codeNGP, e.getMessage());
            return handleImportateurException(e);
        }
    }*/

    /*@Operation(
            summary = "Récupérer un exportateur validé par ID",
            description = "Récupère les détails complets d'un exportateur validé par son identifiant"
    )
    @GetMapping("/exportateurs/{id}")
    public ResponseEntity<?> getExportateurParId(
            @Parameter(description = "ID de l'exportateur", required = true)
            @PathVariable Long id) {

        log.info("========== RECHERCHE PAR ID ==========");
        log.info("ID recherché: {}", id);

        try {
            long startTime = System.currentTimeMillis();

            UserDTO exportateur = importateurService.getExportateurValideById(id);

            long endTime = System.currentTimeMillis();

            log.info("Exportateur trouvé: ID={}, Nom='{}', Pays='{}'",
                    exportateur.getId(), exportateur.getRaisonSociale(), exportateur.getPaysOrigine());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(exportateur);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par ID {}: {}", id, e.getMessage());
            return handleImportateurException(e);
        }
    }*/

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
     * Récupérer une demande d'importation spécifique par son ID
     */
    /*@Operation(
            summary = "Détails d'une demande d'importation",
            description = "Récupère les détails complets d'une demande d'importation spécifique"
    )
    @GetMapping("/demandes/{demandeId}")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> getDemandeById(
            @Parameter(description = "ID de la demande") @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== RÉCUPÉRATION DEMANDE ID: {} ==========", demandeId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            log.info("Importateur authentifié: ID={}", importateur.getId());

            DemandeEnregistrementDTO demande = demandeImportationService.getDemandeById(
                    demandeId,
                    importateur.getId()
            );

            log.info("Demande trouvée: référence={}, status={}", demande.getReference(), demande.getStatus());
            log.info("========== FIN RÉCUPÉRATION ==========");

            return ResponseEntity.ok(demande);

        } catch (Exception e) {
            log.error("Erreur lors de la récupération de la demande: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "NOT_FOUND");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }
    }*/

    /**
     * Télécharger un document d'une demande d'importation
     */
    /*@Operation(
            summary = "Télécharger un document",
            description = "Télécharge le fichier d'un document spécifique"
    )
    @GetMapping("/demandes/documents/{documentId}/telecharger")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<Resource> downloadDocument(
            @Parameter(description = "ID du document") @PathVariable Long documentId,
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== TÉLÉCHARGEMENT DOCUMENT ID: {} ==========", documentId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            log.info("Importateur authentifié: ID={}", importateur.getId());

            Resource resource = demandeImportationService.getDocumentFile(documentId, importateur.getId());
            DocumentDTO documentInfo = demandeImportationService.getDocumentById(documentId, importateur.getId());

            log.info("Document téléchargé: {}", documentInfo.getFileName());
            log.info("========== FIN TÉLÉCHARGEMENT ==========");

            // Déterminer le Content-Type
            String contentType = determineContentType(documentInfo.getFileType());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + documentInfo.getFileName() + "\"")
                    .body(resource);

        } catch (Exception e) {
            log.error("Erreur lors du téléchargement du document: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }*/

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

    /**
     * Sauvegarder un document
     */
    /*private DocumentDTO saveDocument(Long demandeId, Long importateurId, MultipartFile file, String documentTypeStr)
            throws IOException {

        // Créer le répertoire
        Path uploadPath = Paths.get(UPLOAD_DIR + demandeId);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Sauvegarder le fichier
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        // Ici, vous devriez appeler un service pour enregistrer le document en base
        // Pour l'instant, on retourne un DTO basique
        return DocumentDTO.builder()
                .id(System.currentTimeMillis()) // ID temporaire
                .fileName(file.getOriginalFilename())
                .filePath(filePath.toString())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .documentType(com.tunisia.commerce.enums.DocumentType.valueOf(documentTypeStr))
                .status(com.tunisia.commerce.enums.DocumentStatus.EN_ATTENTE)
                .uploadedAt(java.time.LocalDateTime.now())
                .downloadUrl("/api/importateur/demandes/documents/" + System.currentTimeMillis() + "/telecharger")
                .build();
    }*/

    /**
     * Déterminer le content type en fonction de l'extension du fichier
     */
    /*private String determineContentType(String fileType) {
        if (fileType == null) return "application/octet-stream";

        String type = fileType.toLowerCase();
        if (type.contains("pdf")) return "application/pdf";
        if (type.contains("jpg") || type.contains("jpeg")) return "image/jpeg";
        if (type.contains("png")) return "image/png";
        if (type.contains("gif")) return "image/gif";

        return "application/octet-stream";
    }*/

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

    // Méthode utilitaire pour récupérer la requête HTTP courante
    /*private HttpServletRequest getCurrentHttpRequest() {
        return ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
    }*/

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

    /*@GetMapping("/produits/{produitId}/statut")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> getProduitStatut(
            @PathVariable Long produitId,
            @RequestHeader("Authorization") String authHeader) {

        log.info("========== VÉRIFICATION STATUT PRODUIT ID: {} ==========", produitId);

        try {
            ImportateurTunisien importateur = getImportateurFromToken(authHeader);
            String statut = importateurService.getProduitStatut(importateur.getId(), produitId);

            Map<String, String> response = new HashMap<>();
            response.put("statut", statut);
            response.put("productId", String.valueOf(produitId));

            return ResponseEntity.ok(response);

        } catch (ImportateurException e) {
            return handleImportateurException(e);
        } catch (Exception e) {
            log.error("ERREUR inattendue: {}", e.getMessage());
            return handleGenericException(e);
        }
    }*/

}