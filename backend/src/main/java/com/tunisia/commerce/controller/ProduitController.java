package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementRequestDTO;
import com.tunisia.commerce.dto.produits.ProductRequestDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.exception.ProductDeclarationException;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.service.impl.DemandeEnregistrementService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/produits")
@RequiredArgsConstructor
@Tag(name = "Demandes d'enregistrement", description = "API pour la gestion des demandes d'enregistrement des exportateurs")
@CrossOrigin(origins = "*")
public class ProduitController {

    private final DemandeEnregistrementService demandeService;
    private final JwtUtil jwtUtil;
    private final ExportateurRepository exportateurRepository;

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);


    /**
     * Créer une nouvelle demande d'enregistrement
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Créer une nouvelle demande")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> createDemande(
            @RequestPart("demande") @Valid DemandeEnregistrementRequestDTO request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestHeader("Authorization") String authHeader) {

        try {
            System.out.println("*** create demande ***");

            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            request.setExportateurId(exportateur.getId());

            DemandeEnregistrementDTO created = demandeService.createDemande(request);

            if (images != null && !images.isEmpty()) {
                for (int i = 0; i < images.size() && i < created.getProducts().size(); i++) {
                    MultipartFile image = images.get(i);
                    Long productId = created.getProducts().get(i).getId();
                    demandeService.uploadProductImage(created.getId(), productId, image);
                }
            }

            return new ResponseEntity<>(created, HttpStatus.CREATED);

        } catch (ProductDeclarationException e) {
            // Retourner l'exception métier au front-end
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(errorResponse);

        } catch (Exception e) {
            // Retourner l'erreur technique au front-end
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", e.getMessage()); // ← Le message d'erreur complet
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    /**
     * Uploader un document pour une demande
     */
    @PostMapping(value = "/{demandeId}/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Uploader un document")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<DocumentDTO> uploadDocument(
            @Parameter(description = "ID de la demande") @PathVariable Long demandeId,
            @Parameter(description = "Type de document") @RequestParam String documentType,
            @Parameter(description = "ID du produit (optionnel)") @RequestParam(required = false) Long productId,
            @Parameter(description = "Fichier à uploader") @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        DocumentDTO document = demandeService.uploadDocument(demandeId, exportateur.getId(),
                file, documentType, productId);
        return ResponseEntity.ok(document);
    }

    /**
     * Récupérer un document par son ID
     */
    /*@GetMapping("/documents/{documentId}")
    @Operation(summary = "Récupérer un document")
    @PreAuthorize("hasRole('EXPORTATEUR') or hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<DocumentDTO> getDocumentById(
            @Parameter(description = "ID du document") @PathVariable Long documentId,
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        DocumentDTO document = demandeService.getDocumentById(documentId, exportateur.getId());
        return ResponseEntity.ok(document);
    }*/

    /**
     * Télécharger un document
     */
    /*@GetMapping("/documents/{documentId}/telecharger")
    @Operation(summary = "Télécharger un document")
    @PreAuthorize("hasRole('EXPORTATEUR') or hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<Resource> downloadDocument(
            @Parameter(description = "ID du document") @PathVariable Long documentId,
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        Resource resource = demandeService.getDocumentFile(documentId, exportateur.getId());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }*/

    /**
     * Soumettre une demande pour validation
     */
    @PostMapping("/{id}/soumettre")
    @Operation(summary = "Soumettre une demande")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> submitDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        System.out.println("=== DÉBUT submitDemande ===");
        System.out.println("Demande ID reçu: " + id);

        try {
            // 1. Extraire l'exportateur du token
            System.out.println("1. Extraction de l'exportateur depuis le token...");
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            System.out.println("   ✅ Exportateur trouvé - ID: " + exportateur.getId() + ", Email: " + exportateur.getEmail());

            // 2. Appeler le service pour soumettre la demande
            System.out.println("2. Appel du service submitDemande avec demandeId=" + id + ", exportateurId=" + exportateur.getId());
            DemandeEnregistrementDTO demande = demandeService.submitDemande(id, exportateur.getId());

            System.out.println("   ✅ Demande soumise avec succès:");
            System.out.println("      - ID: " + demande.getId());
            System.out.println("      - Référence: " + demande.getReference());
            System.out.println("      - Statut: " + demande.getStatus());
            System.out.println("      - Date de soumission: " + demande.getSubmittedAt());

            System.out.println("=== FIN SUCCÈS submitDemande ===");
            return ResponseEntity.ok(demande);

        } catch (ProductDeclarationException e) {
            // Capturer les exceptions métier et retourner le code HTTP approprié
            System.err.println("=== ProductDeclarationException dans submitDemande ===");
            System.err.println("Error code: " + e.getErrorCode());
            System.err.println("Message: " + e.getMessage());
            System.err.println("Status: " + e.getStatus());
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());

            System.err.println("=== FIN ERREUR METIER submitDemande ===");
            return ResponseEntity.status(e.getStatus()).body(errorResponse);

        } catch (Exception e) {
            // Capturer les erreurs inattendues
            System.err.println("=== ERREUR INATTENDUE dans submitDemande ===");
            System.err.println("Exception type: " + e.getClass().getName());
            System.err.println("Message: " + e.getMessage());
            System.err.println("Cause: " + (e.getCause() != null ? e.getCause().getMessage() : "null"));
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", "Une erreur inattendue s'est produite: " + e.getMessage());
            errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());

            System.err.println("=== FIN ERREUR TECHNIQUE submitDemande ===");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Supprimer une demande en mode brouillon
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une demande en brouillon")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> deleteDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        System.out.println("=== DÉBUT deleteDemande ===");
        System.out.println("Demande ID à supprimer: " + id);

        try {
            // 1. Extraire l'exportateur du token
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            System.out.println("Exportateur ID: " + exportateur.getId());

            // 2. Appeler le service pour supprimer la demande
            demandeService.deleteDemande(id, exportateur.getId());
            System.out.println("✅ Demande supprimée avec succès");

            Map<String, String> response = new HashMap<>();
            response.put("message", "Demande supprimée avec succès");
            response.put("status", "SUCCESS");

            return ResponseEntity.ok(response);

        } catch (ProductDeclarationException e) {
            System.err.println("=== ProductDeclarationException dans deleteDemande ===");
            System.err.println("Error code: " + e.getErrorCode());
            System.err.println("Message: " + e.getMessage());

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(errorResponse);

        } catch (Exception e) {
            System.err.println("=== ERREUR INATTENDUE dans deleteDemande ===");
            System.err.println("Message: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", "Une erreur inattendue s'est produite: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    /**
     * Valider une demande (Agent)
     */
    /*@PostMapping("/{id}/valider")
    @Operation(summary = "Valider une demande")
    @PreAuthorize("hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<DemandeEnregistrementDTO> validateDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @Parameter(description = "Commentaire de validation") @RequestParam String comment,
            @RequestHeader("Authorization") String authHeader) {

        // Pour les agents, il faudrait un mécanisme différent pour obtenir l'ID
        // Pour l'instant, on utilise une valeur par défaut
        Long agentId = 2L; // À remplacer par la vraie logique
        DemandeEnregistrementDTO demande = demandeService.validateDemande(id, comment, agentId);
        return ResponseEntity.ok(demande);
    }*/

    /**
     * Rejeter une demande (Agent)
     */
    /*@PostMapping("/{id}/rejeter")
    @Operation(summary = "Rejeter une demande")
    @PreAuthorize("hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<DemandeEnregistrementDTO> rejectDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @Parameter(description = "Raison du rejet") @RequestParam String reason,
            @RequestHeader("Authorization") String authHeader) {

        // Pour les agents, il faudrait un mécanisme différent pour obtenir l'ID
        Long agentId = 2L; // À remplacer par la vraie logique
        DemandeEnregistrementDTO demande = demandeService.rejectDemande(id, reason, agentId);
        return ResponseEntity.ok(demande);
    }*/

    /**
     * Récupérer une demande par son ID
     */
    /*@GetMapping("/{id}")
    @Operation(summary = "Récupérer une demande")
    @PreAuthorize("hasRole('EXPORTATEUR') or hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<DemandeEnregistrementDTO> getDemandeById(
            @Parameter(description = "ID de la demande") @PathVariable Long id) {

        DemandeEnregistrementDTO demande = demandeService.getDemandeById(id);
        return ResponseEntity.ok(demande);
    }*/

    /**
     * Récupérer les demandes de l'exportateur connecté
     */
    @GetMapping("/mes-demandes")
    @Operation(summary = "Mes demandes")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<List<DemandeEnregistrementDTO>> getMyDemandes(
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        List<DemandeEnregistrementDTO> demandes = demandeService.getDeclarationsProduitsByExportateur(exportateur.getId());

        return ResponseEntity.ok(demandes);
    }

    /**
     * Servir une image de produit
     */
    @GetMapping("/uploads/{demandeId}/products/{productId}/images/{fileName}")
    public ResponseEntity<Resource> getProductImage(
            @PathVariable Long demandeId,
            @PathVariable Long productId,
            @PathVariable String fileName) {

        log.info("=== DÉBUT getProductImage ===");
        try {
            // Chemin où sont stockées les images
            String imagePath = "uploads/produits/" + demandeId + "/products/" + productId + "/images/" + fileName;
            Path filePath = Paths.get(imagePath);

            log.info("=== DÉBUT getProductImage ===");
            log.info("DemandeId: {}", demandeId);
            log.info("ProductId: {}", productId);
            log.info("FileName: {}", fileName);
            log.info("Chemin complet: {}", filePath.toAbsolutePath());
            log.info("Fichier existe: {}", Files.exists(filePath));

            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                // Déterminer le content type en fonction de l'extension
                String contentType = Files.probeContentType(filePath);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(resource);
            } else {
                log.warn("Image non trouvée: {}", imagePath);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Erreur lors du chargement de l'image: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Récupérer les demandes par statut (Agent/Admin)
     */
    /*@GetMapping("/statut/{status}")
    @Operation(summary = "Demandes par statut")
    @PreAuthorize("hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<List<DemandeEnregistrementDTO>> getDemandesByStatus(
            @Parameter(description = "Statut de la demande") @PathVariable DemandeStatus status) {

        List<DemandeEnregistrementDTO> demandes = demandeService.getDemandesByStatus(status);
        return ResponseEntity.ok(demandes);
    }*/

    /**
     * Méthode utilitaire pour extraire l'exportateur du token JWT
     */
    private ExportateurEtranger getExportateurFromToken(String authHeader) {
        try {
            // 1. Extraire le token
            String token = extractToken(authHeader);

            // 2. Valider le token
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
}