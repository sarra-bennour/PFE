package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementRequestDTO;
import com.tunisia.commerce.dto.produits.ProduitDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.exception.ProductDeclarationException;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
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
    private final DemandeEnregistrementRepository demandeEnregistrementRepository;

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);


    /**
     * Récupérer tous les produits de l'exportateur connecté (catalogue)
     */
    @GetMapping("/mes-produits")
    @Operation(summary = "Récupérer les produits de l'exportateur")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> getMyProducts(@RequestHeader("Authorization") String authHeader) {

        System.out.println("=== DÉBUT getMyProducts ===");

        try {
            // Extraire l'exportateur du token
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            System.out.println("Exportateur ID: " + exportateur.getId() + ", Email: " + exportateur.getEmail());

            // Récupérer les produits
            List<ProduitDTO> products = demandeService.getProductsByExportateur(exportateur.getId());

            System.out.println("✅ " + products.size() + " produit(s) trouvé(s)");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());

            return ResponseEntity.ok(response);

        } catch (ProductDeclarationException e) {
            System.err.println("❌ ProductDeclarationException: " + e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(errorResponse);

        } catch (Exception e) {
            System.err.println("❌ Erreur inattendue: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", "Erreur lors de la récupération des produits: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Récupérer les produits par type
     */
    @GetMapping("/mes-produits/{productType}")
    @Operation(summary = "Récupérer les produits par type")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> getMyProductsByType(
            @PathVariable String productType,
            @RequestHeader("Authorization") String authHeader) {

        System.out.println("=== DÉBUT getMyProductsByType ===");
        System.out.println("Type demandé: " + productType);

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);

            List<ProduitDTO> products = demandeService.getProductsByExportateurAndType(exportateur.getId(), productType);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());
            response.put("type", productType);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

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
                    String originalImageName = null;
                    if (request.getProducts() != null && i < request.getProducts().size()) {
                        originalImageName = request.getProducts().get(i).getProductImageName();
                    }

                    demandeService.uploadProductImage(created.getId(), productId, image,originalImageName);
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
     * Mettre à jour une demande en mode brouillon (avec documents en base64)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> updateDemande(
            @PathVariable Long id,
            @Valid @RequestBody DemandeEnregistrementRequestDTO request,
            @RequestHeader("Authorization") String authHeader) {

        System.out.println("=== DÉBUT updateDemande ===");
        System.out.println("Demande ID à modifier: " + id);

        try {
            // 1. Extraire l'exportateur du token
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            System.out.println("Exportateur connecté - ID: " + exportateur.getId() + ", Email: " + exportateur.getEmail());

            // 2. Récupérer la demande
            DemandeEnregistrement demande = demandeEnregistrementRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Demande non trouvée"));
            System.out.println("Demande trouvée - ID: " + demande.getId());
            System.out.println("  - Statut: " + demande.getStatus());
            System.out.println("  - Exportateur ID de la demande: " + demande.getExportateur().getId());
            System.out.println("  - Exportateur email: " + demande.getExportateur().getEmail());

            // 3. Comparaison des IDs
            System.out.println("Comparaison: " + demande.getExportateur().getId() + " == " + exportateur.getId() + " ? " +
                    (demande.getExportateur().getId().equals(exportateur.getId())));

            if (!demande.getExportateur().getId().equals(exportateur.getId())) {
                System.err.println("❌ ACCÈS NON AUTORISÉ!");
                System.err.println("  La demande appartient à l'exportateur ID: " + demande.getExportateur().getId());
                System.err.println("  L'utilisateur connecté est ID: " + exportateur.getId());

                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "UNAUTHORIZED");
                errorResponse.put("message", "Vous n'êtes pas autorisé à modifier cette demande");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
            }

            System.out.println("✅ Autorisation OK");

            request.setExportateurId(exportateur.getId());
            DemandeEnregistrementDTO updatedDemande = demandeService.updateDemandeWithDocuments(id, request);

            return ResponseEntity.ok(updatedDemande);

        } catch (Exception e) {
            System.err.println("Exception: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", e.getMessage());
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
            // ✅ CORRECTION : Le chemin dans la BD correspond à la structure des dossiers
            // BD: /uploads/24/products/22/images/file.png
            // Dossier physique: uploads/produits/24/products/22/images/file.png

            String basePath = System.getProperty("user.dir");
            // Construire le chemin avec le dossier "produits"
            String relativePath = "uploads/produits/" + demandeId + "/products/" + productId + "/images/" + fileName;
            Path filePath = Paths.get(basePath, relativePath);

            log.info("Base path: {}", basePath);
            log.info("Relative path: {}", relativePath);
            log.info("Chemin complet: {}", filePath.toAbsolutePath());
            log.info("Fichier existe: {}", Files.exists(filePath));

            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = Files.probeContentType(filePath);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                log.info("✅ Image trouvée: {}", fileName);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(resource);
            } else {
                log.warn("❌ Image non trouvée: {}", filePath);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Erreur lors du chargement de l'image: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }


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