package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.exportateur.*;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.DocumentType;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.service.impl.ExportateurDossierService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exportateur")
@RequiredArgsConstructor
public class ExportateurController {

    private final ExportateurDossierService dossierService;
    private final JwtUtil jwtUtil;
    private final ExportateurRepository exportateurRepository;
    private final DemandeEnregistrementRepository demandeRepository;
    private final DocumentRepository documentRepository;

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
            // Qui commence par "DOS-" dans la référence
            Optional<DemandeEnregistrement> dossierConformiteOpt =
                    demandeRepository.findDossierConformiteByExportateurId(exportateur.getId());

            // 3. Chercher aussi les déclarations de produits (pour info)
            List<DemandeEnregistrement> declarationsProduits =
                    demandeRepository.findDeclarationsProduitsByExportateurId(exportateur.getId());

            System.out.println("📊 Dossier conformité présent: " + dossierConformiteOpt.isPresent());
            System.out.println("📊 Déclarations produits trouvées: " + declarationsProduits.size());

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
                        .declarationsCount(declarationsProduits.size()) // Ajoutez ce champ dans DossierResponseDTO
                        .timestamp(LocalDateTime.now())
                        .build();
            } else {
                // DOSSIER DE CONFORMITÉ EXISTANT
                DemandeEnregistrement dossier = dossierConformiteOpt.get();
                System.out.println("✅ Dossier conformité trouvé ID: " + dossier.getId());
                System.out.println("   - Référence: " + dossier.getReference());
                System.out.println("   - Statut: " + dossier.getStatus());

                response = DossierResponseDTO.builder()
                        .success(true)
                        .hasDossier(true)
                        .demandeId(dossier.getId())
                        .status(dossier.getStatus().name())
                        .reference(dossier.getReference())
                        .submittedAt(dossier.getSubmittedAt())
                        .message(getStatusMessage(dossier.getStatus()))
                        .requiresCompletion(dossier.getStatus() == DemandeStatus.EN_ATTENTE_INFO)
                        .prochainesEtapes(getProchainesEtapes(dossier.getStatus()))
                        .exportateurInfo(ExportateurInfoDTO.fromEntity(exportateur))
                        .documentsCount(getDocumentsCount(exportateur))
                        .declarationsCount(declarationsProduits.size()) // Ajoutez ce champ
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
            @RequestBody CreerDossierRequest request) {

        // DÉBOGAGE : Afficher tout ce qui est reçu
        System.out.println("========== DÉBOGAGE CRÉATION DOSSIER ==========");
        System.out.println("Request reçue: " + (request != null ? "OK" : "NULL"));

        if (request != null) {
            // Utiliser reflection pour voir tous les champs
            try {
                java.lang.reflect.Field[] fields = request.getClass().getDeclaredFields();
                System.out.println("Nombre de champs dans la requête: " + fields.length);

                for (java.lang.reflect.Field field : fields) {
                    field.setAccessible(true);
                    Object value = field.get(request);
                    System.out.println("  - " + field.getName() + " = " + value);
                }
            } catch (Exception e) {
                System.out.println("Erreur reflection: " + e.getMessage());
            }

            // Afficher les produits si présents
            if (request.getProduits() != null) {
                System.out.println("Produits: " + request.getProduits().size());
                request.getProduits().forEach(p -> {
                    System.out.println("  Produit: " + p);
                });
            } else {
                System.out.println("Produits: null");
            }
        }

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            System.out.println("Exportateur trouvé: " + exportateur.getId() + " - " + exportateur.getEmail());

            DemandeEnregistrement demande = dossierService.creerDossier(
                    exportateur.getId(),
                    request
            );

            System.out.println("Dossier créé avec succès: " + demande.getId());
            System.out.println("===============================================");

            return ResponseEntity.ok(DossierResponseDTO.builder()
                    .success(true)
                    .message("Dossier créé avec succès")
                    .demandeId(demande.getId())
                    .reference(demande.getReference())
                    .status(demande.getStatus().name())
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (RuntimeException e) {
            System.err.println("ERREUR création dossier: " + e.getMessage());
            e.printStackTrace();
            System.out.println("===============================================");

            return ResponseEntity.badRequest()
                    .body(DossierResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    @GetMapping("/debug/document-types")
    public ResponseEntity<List<String>> getDocumentTypes() {
        return ResponseEntity.ok(
                Arrays.stream(DocumentType.values())
                        .map(Enum::name)
                        .collect(Collectors.toList())
        );
    }

    /**
     * Télécharger un document pour le dossier
     */
    // Dans ExportateurController.java, modifiez uploadDocument :

    @PostMapping("/dossier/{demandeId}/documents")
    public ResponseEntity<?> uploadDocument(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("demandeId") Long demandeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") String documentType) {

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);

            DocumentDTO doc = dossierService.uploadDocument(
                    demandeId,
                    exportateur.getId(),
                    file,
                    documentType
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
            e.printStackTrace(); // IMPORTANT pour voir l'erreur dans les logs

            // Différencier les types d'erreurs
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
                // Erreur interne du serveur
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(DocumentResponseDTO.builder()
                                .success(false)
                                .message("Erreur interne du serveur: " + e.getMessage())
                                .timestamp(LocalDateTime.now())
                                .build());
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(DocumentResponseDTO.builder()
                            .success(false)
                            .message("Erreur inattendue: " + e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }
    /**
     * Soumettre le dossier pour validation
     */
    @PostMapping("/dossier/{demandeId}/soumettre")
    public ResponseEntity<DossierResponseDTO> soumettreDossier(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long demandeId) {

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);

            DemandeEnregistrement demande = dossierService.soumettreDossier(
                    demandeId,
                    exportateur.getId()
            );

            return ResponseEntity.ok(DossierResponseDTO.builder()
                    .success(true)
                    .message("Dossier soumis avec succès pour validation")
                    .status(demande.getStatus().name())
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(DossierResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Récupérer la liste des documents requis
     */
    @GetMapping("/documents-requis")
    public ResponseEntity<DocumentsRequisResponseDTO> getDocumentsRequis() {
        return ResponseEntity.ok(DocumentsRequisResponseDTO.builder()
                .documents(List.of(
                        DocumentRequisDTO.builder()
                                .type("RC_CERT")
                                .libelle("Registre de Commerce")
                                .obligatoire(true)
                                .description("Certificat de registre de commerce légalisé")
                                .build(),
                        DocumentRequisDTO.builder()
                                .type("TIN_CERT")
                                .libelle("Attestation fiscale")
                                .obligatoire(true)
                                .description("Attestation de numéro d'identification fiscale")
                                .build(),
                        DocumentRequisDTO.builder()
                                .type("SANITARY_CERT")
                                .libelle("Certificat sanitaire")
                                .obligatoire(true)
                                .description("Certificat sanitaire pour les produits alimentaires")
                                .build()
                ))
                .build());
    }


    /**
     * Récupérer un document spécifique par son ID
     */
    @GetMapping("/documents/{documentId}")
    public ResponseEntity<?> getDocument(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long documentId) {

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);

            // Récupérer le document via le service
            DocumentDTO document = dossierService.getDocumentById(documentId, exportateur.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "document", document
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }

    /**
     * Télécharger/Afficher le fichier du document
     */
    @GetMapping("/documents/{documentId}/file")
    public ResponseEntity<?> downloadDocument(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long documentId) {

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);

            // Récupérer le fichier via le service
            org.springframework.core.io.Resource resource = dossierService.getDocumentFile(documentId, exportateur.getId());
            DocumentDTO documentInfo = dossierService.getDocumentById(documentId, exportateur.getId());

            // Déterminer le Content-Type
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
                    case "gif":
                        contentType = "image/gif";
                        break;
                }
            }

            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + documentInfo.getFileName() + "\"")
                    .body(resource);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }

    /**
     * Récupérer tous les documents de l'exportateur
     */
    @GetMapping("/documents")
    public ResponseEntity<?> getAllDocuments(
            @RequestHeader("Authorization") String authHeader) {

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);

            // Récupérer tous les documents via le service
            List<DocumentDTO> documents = dossierService.getAllDocumentsByExportateur(exportateur.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "documents", documents
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
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
            case EN_ATTENTE_PAIEMENT:
                return "Veuillez procéder au paiement des frais de dossier";
            case PAYEE:
                return "Paiement reçu, dossier en cours de validation";
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
            case EN_ATTENTE_PAIEMENT:
                return List.of(
                        "Procéder au paiement en ligne",
                        "Le dossier sera automatiquement soumis après paiement"
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