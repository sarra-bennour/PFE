package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.config.StorageConfig;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementRequestDTO;
import com.tunisia.commerce.dto.produits.ProduitDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.exception.ProductDeclarationException;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.impl.AuditService;
import com.tunisia.commerce.service.impl.DemandeEnregistrementService;
import com.tunisia.commerce.service.impl.SecureStorageService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
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
    private final UserRepository userRepository;
    private final DemandeEnregistrementRepository demandeEnregistrementRepository;
    private final AuditService auditService;
    private final StorageConfig storageConfig;
    private final SecureStorageService secureStorageService;


    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

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
     * Récupérer tous les produits (catalogue complet) - accessible aux importateurs
     */
    @GetMapping("/catalogue-produits")
    @Operation(summary = "Récupérer le catalogue complet des produits pour les importateurs")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> getAllProductsForImporter(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        System.out.println("=== DÉBUT getAllProductsForImporter ===");

        try {
            User user = getUserFromToken(authHeader);
            userId = user.getId();
            userEmail = user.getEmail();

            System.out.println("Importateur ID: " + user.getId() + ", Email: " + user.getEmail());

            if (!(user instanceof ImportateurTunisien)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "FORBIDDEN", "message", "Accès réservé aux importateurs"));
            }

            List<ProduitDTO> products = demandeService.getAllProductsForImporter();

            System.out.println("✅ " + products.size() + " produit(s) trouvé(s) dans le catalogue");

            // AUDIT: Consultation catalogue produits
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_CATALOGUE_GET_ALL")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation du catalogue complet des produits")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("products_count", products.size())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_CATALOGUE_GET_ALL")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation catalogue produits")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", "Erreur lors de la récupération du catalogue: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Récupérer les produits par type pour l'importateur
     */
    @GetMapping("/catalogue-produits/{productType}")
    @Operation(summary = "Récupérer le catalogue par type de produit")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> getProductsByTypeForImporter(
            @PathVariable String productType,
            @RequestHeader("Authorization") String authHeader) {

        System.out.println("=== DÉBUT getProductsByTypeForImporter ===");
        System.out.println("Type demandé: " + productType);

        try {
            User user = getUserFromToken(authHeader);
            System.out.println("Importateur ID: " + user.getId());

            List<ProduitDTO> products = demandeService.getProductsByTypeForImporter(productType);

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
     * Récupérer tous les produits de l'exportateur connecté (catalogue)
     */
    @GetMapping("/mes-produits")
    @Operation(summary = "Récupérer les produits de l'exportateur")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> getMyProducts(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        System.out.println("=== DÉBUT getMyProducts ===");

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userId = exportateur.getId();
            userEmail = exportateur.getEmail();

            System.out.println("Exportateur ID: " + exportateur.getId());

            List<ProduitDTO> products = demandeService.getProductsByExportateur(exportateur.getId());

            System.out.println("✅ " + products.size() + " produit(s) trouvé(s)");

            // AUDIT: Consultation produits exportateur
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_MES_PRODUITS_GET")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation des produits de l'exportateur")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("products_count", products.size())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_MES_PRODUITS_GET")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation produits exportateur")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

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
     * Rechercher des produits pour exportateur (retourne une liste simple)
     */
    @GetMapping("/mes-produits/recherche")
    @Operation(summary = "Rechercher des produits de l'exportateur")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> searchMyProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String originCountry,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userId = exportateur.getId();
            userEmail = exportateur.getEmail();

            List<ProduitDTO> products;
            String searchType = "all";

            if (keyword != null && !keyword.isEmpty()) {
                products = demandeService.searchProductsByExportateur(exportateur.getId(), keyword);
                searchType = "keyword";
            } else if (productType != null && !productType.isEmpty()) {
                products = demandeService.searchProductsByExportateurAndType(exportateur.getId(), productType);
                searchType = "product_type";
            } else if (category != null && !category.isEmpty()) {
                products = demandeService.searchProductsByExportateurAndCategory(exportateur.getId(), category);
                searchType = "category";
            } else if (originCountry != null && !originCountry.isEmpty()) {
                products = demandeService.searchProductsByExportateurAndOrigin(exportateur.getId(), originCountry);
                searchType = "origin_country";
            } else {
                products = demandeService.getProductsByExportateur(exportateur.getId());
            }

            // AUDIT: Recherche produits exportateur
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_MES_PRODUITS_RECHERCHE")
                            .actionType(ActionType.SEARCH)
                            .description("Recherche dans les produits de l'exportateur")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("search_type", searchType)
                            .detail("keyword", keyword != null ? keyword : "")
                            .detail("results_count", products.size())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_MES_PRODUITS_RECHERCHE")
                            .actionType(ActionType.SEARCH)
                            .description("Échec recherche produits exportateur")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Rechercher des produits pour importateur (retourne une liste simple)
     */
    @GetMapping("/catalogue-produits/recherche")
    @Operation(summary = "Rechercher des produits dans le catalogue")
    @PreAuthorize("hasRole('IMPORTATEUR')")
    public ResponseEntity<?> searchCatalogueProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String originCountry,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        try {
            User user = getUserFromToken(authHeader);
            userId = user.getId();
            userEmail = user.getEmail();

            List<ProduitDTO> products;
            String searchType = "all";

            if (keyword != null && !keyword.isEmpty()) {
                products = demandeService.searchProductsInCatalogue(keyword);
                searchType = "keyword";
            } else if (productType != null && !productType.isEmpty()) {
                products = demandeService.searchProductsInCatalogueByType(productType);
                searchType = "product_type";
            } else if (category != null && !category.isEmpty()) {
                products = demandeService.searchProductsInCatalogueByCategory(category);
                searchType = "category";
            } else if (originCountry != null && !originCountry.isEmpty()) {
                products = demandeService.searchProductsInCatalogueByOrigin(originCountry);
                searchType = "origin_country";
            } else {
                products = demandeService.getAllProductsForImporter();
            }

            // AUDIT: Recherche catalogue
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_CATALOGUE_RECHERCHE")
                            .actionType(ActionType.SEARCH)
                            .description("Recherche dans le catalogue produits")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .success()
                            .detail("search_type", searchType)
                            .detail("keyword", keyword != null ? keyword : "")
                            .detail("results_count", products.size())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_CATALOGUE_RECHERCHE")
                            .actionType(ActionType.SEARCH)
                            .description("Échec recherche catalogue")
                            .user(userId, userEmail, "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

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
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        try {
            System.out.println("*** create demande ***");

            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userId = exportateur.getId();
            userEmail = exportateur.getEmail();

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
                    demandeService.uploadProductImage(created.getId(), productId, image, originalImageName);
                }
            }

            // AUDIT: Création demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_CREER_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Création d'une demande d'enregistrement de produits")
                            .entity(EntityType.DEMANDE, created.getId(), created.getReference())
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("products_count", request.getProducts() != null ? request.getProducts().size() : 0)
                            .detail("ip_address", clientIp)
            );

            return new ResponseEntity<>(created, HttpStatus.CREATED);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_CREER_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Échec création demande d'enregistrement")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", e.getMessage());
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
            @PathVariable Long demandeId,
            @RequestParam String documentType,
            @RequestParam(required = false) Long productId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userId = exportateur.getId();
            userEmail = exportateur.getEmail();

            DocumentDTO document = demandeService.uploadDocument(demandeId, exportateur.getId(), file, documentType, productId);

            // AUDIT: Upload document
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_UPLOAD_DOCUMENT")
                            .actionType(ActionType.UPLOAD)
                            .description("Upload de document pour une demande")
                            .entity(EntityType.DOCUMENT, document.getId(), document.getFileName())
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("demande_id", demandeId)
                            .detail("document_type", documentType)
                            .detail("product_id", productId)
                            .detail("file_name", file.getOriginalFilename())
                            .detail("file_size", file.getSize())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(document);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_UPLOAD_DOCUMENT")
                            .actionType(ActionType.UPLOAD)
                            .description("Échec upload document")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("document_type", documentType)
                            .detail("product_id", productId)
                            .detail("file_name", file.getOriginalFilename())
                            .detail("ip_address", clientIp)
            );

            throw e;
        }
    }

    /**
     * Soumettre une demande pour validation
     */
    @PostMapping("/{id}/soumettre")
    @Operation(summary = "Soumettre une demande")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<?> submitDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;
        String reference = null;

        System.out.println("=== DÉBUT submitDemande ===");

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userId = exportateur.getId();
            userEmail = exportateur.getEmail();

            DemandeEnregistrementDTO demande = demandeService.submitDemande(id, exportateur.getId());
            reference = demande.getReference();

            // AUDIT: Soumission demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_SOUMETTRE_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Soumission d'une demande d'enregistrement")
                            .entity(EntityType.DEMANDE, id, reference)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("demande_id", id)
                            .detail("reference", reference)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(demande);

        } catch (ProductDeclarationException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_SOUMETTRE_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Échec soumission demande")
                            .entity(EntityType.DEMANDE, id, reference)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", id)
                            .detail("error_code", e.getErrorCode())
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(errorResponse);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_SOUMETTRE_DEMANDE")
                            .actionType(ActionType.CREATION)
                            .description("Erreur technique soumission demande")
                            .entity(EntityType.DEMANDE, id, reference)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", id)
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", "Une erreur inattendue s'est produite: " + e.getMessage());
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
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        System.out.println("=== DÉBUT updateDemande ===");

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userId = exportateur.getId();
            userEmail = exportateur.getEmail();

            DemandeEnregistrement demande = demandeEnregistrementRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

            if (!demande.getExportateur().getId().equals(exportateur.getId())) {
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("PRODUITS_UPDATE_DEMANDE")
                                .actionType(ActionType.MODIFICATION)
                                .description("Tentative non autorisée de modification demande")
                                .entity(EntityType.DEMANDE, id, null)
                                .user(userId, userEmail, "EXPORTATEUR")
                                .failure("Utilisateur non autorisé")
                                .detail("ip_address", clientIp)
                );

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "UNAUTHORIZED", "message", "Vous n'êtes pas autorisé à modifier cette demande"));
            }

            request.setExportateurId(exportateur.getId());
            DemandeEnregistrementDTO updatedDemande = demandeService.updateDemandeWithDocuments(id, request);

            // AUDIT: Mise à jour demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_UPDATE_DEMANDE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Mise à jour d'une demande d'enregistrement")
                            .entity(EntityType.DEMANDE, id, updatedDemande.getReference())
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("demande_id", id)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(updatedDemande);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_UPDATE_DEMANDE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec mise à jour demande")
                            .entity(EntityType.DEMANDE, id, null)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", id)
                            .detail("ip_address", clientIp)
            );

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
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        System.out.println("=== DÉBUT deleteDemande ===");

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userId = exportateur.getId();
            userEmail = exportateur.getEmail();

            demandeService.deleteDemande(id, exportateur.getId());

            // AUDIT: Suppression demande
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_DELETE_DEMANDE")
                            .actionType(ActionType.DELETION)
                            .description("Suppression d'une demande d'enregistrement")
                            .entity(EntityType.DEMANDE, id, null)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("demande_id", id)
                            .detail("ip_address", clientIp)
            );

            Map<String, String> response = new HashMap<>();
            response.put("message", "Demande supprimée avec succès");
            response.put("status", "SUCCESS");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_DELETE_DEMANDE")
                            .actionType(ActionType.DELETION)
                            .description("Échec suppression demande")
                            .entity(EntityType.DEMANDE, id, null)
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("demande_id", id)
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", e.getMessage());
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
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        try {
            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            userId = exportateur.getId();
            userEmail = exportateur.getEmail();

            List<DemandeEnregistrementDTO> demandes = demandeService.getDeclarationsProduitsByExportateur(exportateur.getId());

            // AUDIT: Consultation mes demandes
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_MES_DEMANDES_GET")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation des demandes de l'exportateur")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .success()
                            .detail("demandes_count", demandes.size())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(demandes);

        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PRODUITS_MES_DEMANDES_GET")
                            .actionType(ActionType.SEARCH)
                            .description("Échec consultation demandes exportateur")
                            .user(userId, userEmail, "EXPORTATEUR")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            throw e;
        }
    }

    /**
     * Servir une image de produit (avec déchiffrement)
     */
    @GetMapping("/uploads/{demandeId}/products/{productId}/images/{fileName}")
    public ResponseEntity<?> getProductImage(
            @PathVariable Long demandeId,
            @PathVariable Long productId,
            @PathVariable String fileName) {

        log.info("=== DÉBUT getProductImage ===");
        log.info("demandeId: {}, productId: {}, fileName: {}", demandeId, productId, fileName);

        try {
            String basePath = System.getProperty("user.dir");

            // ✅ CORRECTION: Le fichier est directement dans le dossier product, pas dans "images"
            // Chemin correct: uploads/product-declarations/4/products/1/fichier.png
            String relativePath = "uploads/product-declarations/" + demandeId + "/products/" + productId + "/" + fileName;
            Path filePath = Paths.get(basePath, relativePath);

            log.info("Chemin complet: {}", filePath.toAbsolutePath());

            // Vérifier si le fichier existe
            if (!Files.exists(filePath)) {
                log.warn("❌ Image non trouvée au chemin 1: {}", filePath);

                // Fallback: essayer avec le dossier "images"
                String relativePath2 = "uploads/product-declarations/" + demandeId + "/products/" + productId + "/images/" + fileName;
                Path filePath2 = Paths.get(basePath, relativePath2);

                if (Files.exists(filePath2)) {
                    filePath = filePath2;
                    log.info("✅ Image trouvée au chemin 2: {}", filePath2);
                } else {
                    // Fallback: ancien chemin "produits"
                    String relativePath3 = "uploads/produits/" + demandeId + "/products/" + productId + "/" + fileName;
                    Path filePath3 = Paths.get(basePath, relativePath3);

                    if (Files.exists(filePath3)) {
                        filePath = filePath3;
                        log.info("✅ Image trouvée au chemin 3: {}", filePath3);
                    } else {
                        log.error("❌ Image non trouvée dans aucun chemin");
                        return ResponseEntity.notFound().build();
                    }
                }
            }

            // ✅ Lire le fichier
            byte[] fileBytes = Files.readAllBytes(filePath);

            // ✅ DÉCHIFFRER si le chiffrement est activé
            if (storageConfig.isEncryptionEnabled()) {
                try {
                    Path hashPath = Paths.get(filePath.toString() + ".hash");
                    String expectedHash = Files.exists(hashPath) ? Files.readString(hashPath) : null;
                    fileBytes = secureStorageService.retrieveDocument(filePath, expectedHash);
                    log.info("✅ Image déchiffrée avec succès");
                } catch (Exception e) {
                    log.error("Erreur déchiffrement: {}", e.getMessage());
                    // Continuer avec les bytes lus (peut-être non chiffré)
                }
            }

            // Déterminer le content type
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                if (fileName.endsWith(".png")) contentType = "image/png";
                else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) contentType = "image/jpeg";
                else contentType = "application/octet-stream";
            }

            log.info("✅ Image servie: {}, taille: {} bytes", fileName, fileBytes.length);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(fileBytes);

        } catch (Exception e) {
            log.error("Erreur lors du chargement de l'image: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
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

    /**
     * Méthode utilitaire pour extraire l'utilisateur du token JWT (générique)
     */
    private User getUserFromToken(String authHeader) {
        try {
            String token = extractToken(authHeader);

            if (!jwtUtil.validateToken(token)) {
                throw new RuntimeException("Token invalide ou expiré");
            }

            String email = jwtUtil.extractUsername(token);
            if (email == null || email.isEmpty()) {
                throw new RuntimeException("Email non trouvé dans le token");
            }

            return userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Aucun utilisateur trouvé avec l'email: " + email));

        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token expiré. Veuillez vous reconnecter.");
        } catch (MalformedJwtException | SignatureException e) {
            throw new RuntimeException("Token invalide. Veuillez vous reconnecter.");
        } catch (Exception e) {
            throw new RuntimeException("Erreur d'authentification: " + e.getMessage());
        }
    }
}