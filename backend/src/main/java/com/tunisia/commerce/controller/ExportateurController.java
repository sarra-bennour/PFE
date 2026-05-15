package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.exportateur.*;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.DemandeValidateurRepository;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.service.impl.AuditService;
import com.tunisia.commerce.service.impl.ExportateurDossierService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exportateur")
@RequiredArgsConstructor
public class ExportateurController {

    private final ExportateurDossierService dossierService;
    private final JwtUtil jwtUtil;
    private final ExportateurRepository exportateurRepository;
    private final DemandeEnregistrementRepository demandeRepository;
    private final DemandeValidateurRepository demandeValidateurRepository;
    private final AuditService auditService;


    private static final Logger logger = Logger.getLogger(ExportateurDossierService.class.getName());

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
     * Récupérer le statut du dossier de l'exportateur connecté
     */
    @GetMapping("/dossier/statut")
    public ResponseEntity<DossierResponseDTO> getDossierStatut(
            @RequestHeader("Authorization") String authHeader) {

        System.out.println("\n========== DÉBUT getDossierStatut ==========");

        try {
            // 1. Valider le token et récupérer l'exportateur
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            System.out.println("✅ Exportateur trouvé ID: " + exportateur.getId());

            // 2. RECHERCHER UNIQUEMENT LE DOSSIER DE CONFORMITÉ (KYC)
            List<DemandeEnregistrement> dossierConformiteOpt =
                    demandeRepository.findDemandeByExportateurIdetTypeDemande(exportateur.getId(), TypeDemande.REGISTRATION);
            System.out.println("***dossier"+dossierConformiteOpt);
            // 3. Chercher aussi les déclarations de produits (pour info)
            List<DemandeEnregistrement> declarationsProduits =
                    demandeRepository.findDemandeByExportateurIdetTypeDemande(exportateur.getId(),TypeDemande.PRODUCT_DECLARATION);


            System.out.println("📊 Dossier conformité présent: " + dossierConformiteOpt.isEmpty());
            System.out.println("📊 Déclarations produits trouvées: " + dossierConformiteOpt.size());

            DossierResponseDTO response;


            if (dossierConformiteOpt.isEmpty()) {
                // PAS DE DOSSIER DE CONFORMITÉ
                System.out.println("ℹ️ Aucun dossier de conformité trouvé");

                response = DossierResponseDTO.builder()
                        .success(true)
                        .hasDossier(false)
                        .status("NOUVEAU")
                        .message("Bienvenue ! Veuillez compléter votre dossier de conformité")
                        .requiresCompletion(true)
                        .exportateurInfo(ExportateurInfoDTO.fromEntity(exportateur))
                        .prochainesEtapes(List.of(
                                "Compléter les informations de l'entreprise",
                                "Télécharger les documents requis",
                                "Soumettre le dossier pour validation"
                        ))
                        .declarationsCount(dossierConformiteOpt.size())
                        .timestamp(LocalDateTime.now())
                        .build();
            } else {
                // DOSSIER DE CONFORMITÉ EXISTANT
                DemandeEnregistrement dossier = dossierConformiteOpt.get(0);
                System.out.println("✅ Dossier conformité trouvé ID: " + dossier.getId());
                System.out.println("   - Référence: " + dossier.getReference());
                System.out.println("   - Statut: " + dossier.getStatus());
                System.out.println("   - Payment Status: " + dossier.getPaymentStatus()); // AJOUTER CE LOG

                response = DossierResponseDTO.builder()
                        .success(true)
                        .hasDossier(true)
                        .demandeId(dossier.getId())
                        .status(dossier.getStatus().name())
                        .paymentStatus(dossier.getPaymentStatus().name())
                        .reference(dossier.getReference())
                        .submittedAt(dossier.getSubmittedAt())
                        .message(getStatusMessage(dossier.getStatus()))
                        .requiresCompletion(dossier.getStatus() == DemandeStatus.EN_ATTENTE_INFO)
                        .prochainesEtapes(getProchainesEtapes(dossier.getStatus()))
                        .exportateurInfo(ExportateurInfoDTO.fromEntity(exportateur))
                        .documentsCount(getDocumentsCount(exportateur))
                        .declarationsCount(dossierConformiteOpt.size())
                        .timestamp(LocalDateTime.now())
                        .build();
            }

            System.out.println("✅ Réponse construite avec succès");
            System.out.println("========== FIN getDossierStatut ==========\n");

            return ResponseEntity.ok(response);

        } catch (ExpiredJwtException e) {
            System.err.println("❌ Token expiré: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(DossierResponseDTO.error("Token expiré. Veuillez vous reconnecter."));
        } catch (Exception e) {
            System.err.println("❌ Erreur: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(DossierResponseDTO.error("Erreur technique: " + e.getMessage()));
        }
    }
    /**
     * Créer un nouveau dossier de conformité
     */
    @PostMapping("/dossier/creer")
    public ResponseEntity<DossierResponseDTO> creerDossier(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreerDossierRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        System.out.println("========== DÉBOGAGE CRÉATION DOSSIER ==========");

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userEmail = exportateur.getEmail();
            userId = exportateur.getId();

            System.out.println("Exportateur trouvé: " + exportateur.getId() + " - " + exportateur.getEmail());

            DemandeEnregistrement demande = dossierService.creerDossier(
                    exportateur.getId(),
                    request
            );

            System.out.println("Dossier créé avec succès: " + demande.getId());

            // AUDIT: Création dossier
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_CREER_DOSSIER")
                            .actionType(ActionType.CREATION)
                            .description("Création d'un nouveau dossier de conformité")
                            .entity(EntityType.DEMANDE, demande.getId(), demande.getReference())
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("produits_count", request.getProduits() != null ? request.getProduits().size() : 0)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(DossierResponseDTO.builder()
                    .success(true)
                    .message("Dossier créé avec succès")
                    .demandeId(demande.getId())
                    .reference(demande.getReference())
                    .status(demande.getStatus().name())
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_CREER_DOSSIER")
                            .actionType(ActionType.CREATION)
                            .description("Échec création dossier")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            System.err.println("ERREUR création dossier: " + e.getMessage());
            e.printStackTrace();

            return ResponseEntity.badRequest()
                    .body(DossierResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Télécharger un document pour le dossier
     */

    @PostMapping("/dossier/{demandeId}/documents")
    public ResponseEntity<?> uploadDocument(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("demandeId") Long demandeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") String documentType,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userEmail = exportateur.getEmail();
            userId = exportateur.getId();

            DocumentDTO doc = dossierService.uploadDocument(
                    demandeId,
                    exportateur.getId(),
                    file,
                    documentType
            );

            // AUDIT: Upload document
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_UPLOAD_DOCUMENT")
                            .actionType(ActionType.UPLOAD)
                            .description("Téléchargement d'un document pour le dossier")
                            .entity(EntityType.DOCUMENT, doc.getId(), doc.getFileName())
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("demande_id", demandeId)
                            .detail("document_type", documentType)
                            .detail("file_name", file.getOriginalFilename())
                            .detail("file_size", file.getSize())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(DocumentResponseDTO.builder()
                    .success(true)
                    .message("Document téléchargé avec succès")
                    .documentId(doc.getId())
                    .fileName(doc.getFileName())
                    .documentType(doc.getDocumentType().name())
                    .status(doc.getStatus().name())
                    .fileSize(doc.getFileSize())
                    .uploadedAt(doc.getUploadedAt())
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_UPLOAD_DOCUMENT")
                            .actionType(ActionType.UPLOAD)
                            .description("Échec upload document")
                            .entity(EntityType.DEMANDE, demandeId, null)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("document_type", documentType)
                            .detail("file_name", file.getOriginalFilename())
                            .detail("ip_address", clientIp)
            );

            e.printStackTrace();

            if (e.getMessage().contains("non trouvé") || e.getMessage().contains("autorisation")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(DocumentResponseDTO.builder()
                                .success(false)
                                .message(e.getMessage())
                                .timestamp(LocalDateTime.now())
                                .build());
            } else if (e.getMessage().contains("type de document")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(DocumentResponseDTO.builder()
                                .success(false)
                                .message(e.getMessage())
                                .timestamp(LocalDateTime.now())
                                .build());
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(DocumentResponseDTO.builder()
                                .success(false)
                                .message("Erreur interne du serveur: " + e.getMessage())
                                .timestamp(LocalDateTime.now())
                                .build());
            }
        }
    }
    /**
     * Soumettre le dossier pour validation
     */
    @PostMapping("/dossier/{demandeId}/soumettre")
    public ResponseEntity<DossierResponseDTO> soumettreDossier(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long demandeId,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userEmail = exportateur.getEmail();
            userId = exportateur.getId();

            DemandeEnregistrement demande = dossierService.soumettreDossier(
                    demandeId,
                    exportateur.getId()
            );

            // AUDIT: Soumission dossier
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_SOUMETTRE_DOSSIER")
                            .actionType(ActionType.CREATION)
                            .description("Soumission du dossier de conformité")
                            .entity(EntityType.DEMANDE, demande.getId(), demande.getReference())
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("demande_id", demandeId)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(DossierResponseDTO.builder()
                    .success(true)
                    .message("Dossier soumis avec succès pour validation")
                    .status(demande.getStatus().name())
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_SOUMETTRE_DOSSIER")
                            .actionType(ActionType.CREATION)
                            .description("Échec soumission dossier")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest()
                    .body(DossierResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }


    /**
     * Suggérer des noms d'utilisateur basés sur le nom de l'entreprise
     */
    @GetMapping("/pre-kyc/suggerer-usernames")
    public ResponseEntity<?> suggererUsernames(
            @RequestHeader("Authorization") String authHeader) {

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);

            String companyName = exportateur.getRaisonSociale(); // ou getCompanyName() selon votre DTO
            String email = exportateur.getEmail();

            List<String> suggestions = dossierService.suggererUsernames(companyName, email);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("suggestions", suggestions);
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.severe("Erreur lors de la génération des suggestions "+ e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Vérifier si un username est disponible
     */
    @GetMapping("/pre-kyc/verifier-username")
    public ResponseEntity<?> verifierUsername(
            @RequestParam String username) {

        try {
            boolean estDisponible = !exportateurRepository.existsByUsername(username);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("username", username);
            response.put("disponible", estDisponible);
            response.put("message", estDisponible ?
                    "Nom d'utilisateur disponible" :
                    "Ce nom d'utilisateur est déjà pris");
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Télécharger/Afficher le fichier du document
     */
    /*@GetMapping("/documents/{documentId}/file")
    public ResponseEntity<?> downloadDocument(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long documentId,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userEmail = exportateur.getEmail();
            userId = exportateur.getId();

            org.springframework.core.io.Resource resource = dossierService.getDocumentFile(documentId, exportateur.getId());
            DocumentDTO documentInfo = dossierService.getDocumentById(documentId, exportateur.getId());

            // AUDIT: Téléchargement document
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_DOWNLOAD_DOCUMENT")
                            .actionType(ActionType.DOWNLOAD)
                            .description("Téléchargement d'un document")
                            .entity(EntityType.DOCUMENT, documentId, documentInfo.getFileName())
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("document_type", documentInfo.getDocumentType().name())
                            .detail("file_size", documentInfo.getFileSize())
                            .detail("ip_address", clientIp)
            );

            String contentType = "application/octet-stream";
            if (documentInfo.getFileType() != null) {
                switch (documentInfo.getFileType().toLowerCase()) {
                    case "pdf":
                        contentType = "application/pdf";
                        break;
                    case "jpg":
                    case "jpeg":
                        contentType = "image/jpeg";
                        break;
                    case "png":
                        contentType = "image/png";
                        break;
                }
            }

            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + documentInfo.getFileName() + "\"")
                    .body(resource);

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_DOWNLOAD_DOCUMENT")
                            .actionType(ActionType.DOWNLOAD)
                            .description("Échec téléchargement document")
                            .entity(EntityType.DOCUMENT, documentId, null)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("document_id", documentId)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }*/
    @GetMapping("/documents/{documentId}/file")
    public ResponseEntity<?> downloadDocument(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long documentId,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userEmail = exportateur.getEmail();
            userId = exportateur.getId();

            // ✅ Utiliser la méthode qui déchiffre le document
            byte[] fileData = dossierService.downloadDocument(documentId, exportateur.getId());
            DocumentDTO documentInfo = dossierService.getDocumentById(documentId, exportateur.getId());

            // AUDIT: Téléchargement document
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_DOWNLOAD_DOCUMENT")
                            .actionType(ActionType.DOWNLOAD)
                            .description("Téléchargement d'un document")
                            .entity(EntityType.DOCUMENT, documentId, documentInfo.getFileName())
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("document_type", documentInfo.getDocumentType().name())
                            .detail("file_size", documentInfo.getFileSize())
                            .detail("ip_address", clientIp)
            );

            // Déterminer le content type
            String contentType = determineContentType(documentInfo.getFileType());

            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + documentInfo.getFileName() + "\"")
                    .body(fileData);

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_DOWNLOAD_DOCUMENT")
                            .actionType(ActionType.DOWNLOAD)
                            .description("Échec téléchargement document")
                            .entity(EntityType.DOCUMENT, documentId, null)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("document_id", documentId)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }

    // ✅ Ajouter cette méthode helper
    private String determineContentType(String fileType) {
        if (fileType == null) return "application/octet-stream";
        if (fileType.toLowerCase().contains("pdf")) return "application/pdf";
        if (fileType.toLowerCase().contains("jpg") || fileType.toLowerCase().contains("jpeg"))
            return "image/jpeg";
        if (fileType.toLowerCase().contains("png")) return "image/png";
        return "application/octet-stream";
    }

    /**
     * Récupérer tous les documents de l'exportateur
     */
    @GetMapping("/documents")
    public ResponseEntity<?> getAllDocuments(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userEmail = exportateur.getEmail();
            userId = exportateur.getId();

            List<DocumentDTO> documents = dossierService.getDossierAgrementByExportateur(exportateur.getId());

            // AUDIT: Consultation tous documents
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_GET_ALL_DOCUMENTS")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation de tous les documents")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("documents_count", documents.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "documents", documents
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_GET_ALL_DOCUMENTS")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation documents")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }

    /**
     * Compléter le Pré-KYC (première étape avant le dossier de conformité)
     */
    @PostMapping("/pre-kyc/completer")
    public ResponseEntity<?> completePreKyc(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody PreKycRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        String userEmail = null;
        Long userId = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userEmail = exportateur.getEmail();
            userId = exportateur.getId();

            ExportateurEtranger updatedExportateur = dossierService.completePreKyc(exportateur.getEmail(), request);

            ExportateurInfoDTO exportateurInfo = ExportateurInfoDTO.fromEntity(updatedExportateur);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Informations préalables enregistrées avec succès");
            response.put("exportateur", exportateurInfo);
            response.put("preKycCompleted", updatedExportateur.isPreKycCompleted());
            response.put("timestamp", LocalDateTime.now());

            // AUDIT: Complétion Pre-KYC
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_COMPLETE_PRE_KYC")
                            .actionType(ActionType.MODIFICATION)
                            .description("Complétion des informations Pré-KYC")
                            .entity(EntityType.USER, userId, userEmail)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("username", request.getUsername())
                            .detail("site_type", request.getSiteType())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            logger.severe("Erreur lors du Pré-KYC: " + e.getMessage());

            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_COMPLETE_PRE_KYC")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec complétion Pré-KYC")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            logger.severe("Erreur interne lors du Pré-KYC: " + e);

            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("EXPORTATEUR_COMPLETE_PRE_KYC")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur interne Pré-KYC")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur interne: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }


    // Ajoutez dans ExportateurController.java

    @GetMapping("/declarations")
    @Operation(summary = "Récupérer toutes les déclarations de l'exportateur connecté")
    public ResponseEntity<?> getUserDeclarations(@RequestHeader("Authorization") String authHeader) {
        try {
            System.out.println("***pipeline***");
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);

            // Récupérer toutes les demandes de l'exportateur
            List<DemandeEnregistrement> demandes = demandeRepository.findByExportateurId(exportateur.getId());

            // Transformer en DTO avec les infos nécessaires
            List<Map<String, Object>> result = demandes.stream().map(demande -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", demande.getId());
                map.put("reference", demande.getReference());
                map.put("status", demande.getStatus().name());
                map.put("submittedAt", demande.getSubmittedAt());
                map.put("paymentAmount", demande.getPaymentAmount());

                // Ajouter les produits
                List<Map<String, Object>> products = new ArrayList<>();
                if (demande.getDemandeProduits() != null) {
                    for (DemandeProduit dp : demande.getDemandeProduits()) {
                        Product p = dp.getProduit();
                        Map<String, Object> productMap = new HashMap<>();
                        productMap.put("id", p.getId());
                        productMap.put("productName", p.getProductName());
                        productMap.put("category", p.getCategory());
                        productMap.put("hsCode", p.getHsCode());
                        productMap.put("originCountry", p.getOriginCountry());
                        productMap.put("annualQuantityValue", p.getAnnualQuantityValue());
                        productMap.put("annualQuantityUnit", p.getAnnualQuantityUnit());
                        products.add(productMap);
                    }
                }
                map.put("products", products);

                // Ajouter les statuts de validation
                List<DemandeValidateur> validateurs = demandeValidateurRepository.findByDemandeId(demande.getId());
                List<Map<String, Object>> validationStatuses = validateurs.stream().map(v -> {
                    Map<String, Object> vsMap = new HashMap<>();
                    vsMap.put("structureId", v.getStructure().getId());
                    vsMap.put("structureName", v.getStructure().getOfficialName());
                    vsMap.put("validationStatus", v.getValidationStatus().name());
                    return vsMap;
                }).collect(Collectors.toList());
                map.put("validationStatuses", validationStatuses);

                return map;
            }).collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", result);
            response.put("count", result.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.severe("Erreur lors de la récupération des déclarations: {}"+ e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ==================== MÉTHODES PRIVÉES CORRIGÉES ====================

    private ExportateurEtranger getExportateurFromToken(String authHeader) {
        try {
            // 1. Extraire le token
            String token = extractToken(authHeader);

            // 2. Valider le token d'abord
            if (!jwtUtil.validateToken(token)) {
                throw new RuntimeException("Token invalide ou expiré");
            }

            // 3. Extraire l'email
            String email = jwtUtil.extractUsername(token);
            if (email == null || email.isEmpty()) {
                throw new RuntimeException("Email non trouvé dans le token");
            }

            // 4. Chercher l'exportateur
            return exportateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Aucun exportateur trouvé avec l'email: " + email));

        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token expiré. Veuillez vous reconnecter.");
        } catch (MalformedJwtException | SignatureException e) {
            throw new RuntimeException("Token invalide. Veuillez vous reconnecter.");
        } catch (Exception e) {
            throw new RuntimeException("Erreur d'authentification: " + e.getMessage());
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || authHeader.isEmpty()) {
            throw new RuntimeException("En-tête d'authentification manquant");
        }

        if (!authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Format d'authentification invalide. Utilisez 'Bearer [token]'");
        }

        String token = authHeader.substring(7);
        if (token.isEmpty()) {
            throw new RuntimeException("Token vide");
        }

        return token;
    }

    private String getStatusMessage(DemandeStatus status) {
        switch (status) {
            case BROUILLON:
                return "Votre dossier est en cours de saisie";
            case SOUMISE:
                return "Votre dossier a été soumis et est en attente de validation";
            case EN_COURS_VALIDATION:
                return "Votre dossier est en cours d'examen par nos services";
            case EN_ATTENTE_INFO:
                return "Des informations complémentaires sont requises";
            case VALIDEE:
                return "Félicitations ! Votre dossier a été validé";
            case REJETEE:
                return "Votre dossier a été rejeté";
            default:
                return "Statut inconnu";
        }
    }

    private List<String> getProchainesEtapes(DemandeStatus status) {
        switch (status) {
            case BROUILLON:
                return List.of(
                        "Compléter toutes les sections du formulaire",
                        "Télécharger tous les documents requis",
                        "Soumettre le dossier"
                );
            case EN_ATTENTE_INFO:
                return List.of(
                        "Consulter les commentaires de l'agent",
                        "Fournir les documents/informations demandés"
                );
            default:
                return List.of("Aucune action requise pour le moment");
        }
    }

    private int getDocumentsCount(ExportateurEtranger exportateur) {
        if (exportateur.getDocuments() != null) {
            return exportateur.getDocuments().size();
        }
        return 0;
    }
}