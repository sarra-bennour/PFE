package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.produits.*;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.exception.ProductDeclarationException;
import com.tunisia.commerce.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DemandeEnregistrementService {

    private final DemandeEnregistrementRepository demandeRepository;
    private final ExportateurRepository exportateurRepository;
    private final ProductRepository productRepository;
    private final DocumentRepository documentRepository;
    private final DemandeHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final DemandeProduitRepository demandeProduitRepository;

    private static final String REFERENCE_PREFIX = "DEC";
    private static final String UPLOAD_DIR = "uploads/produits/";

    private static final int MAX_SUBMITTED_DEMANDES = 3;


    @Transactional
    public DemandeEnregistrementDTO createDemande(DemandeEnregistrementRequestDTO request) {
        log.info("Création d'une nouvelle demande d'enregistrement pour l'exportateur ID: {}", request.getExportateurId());

        try {
            // Récupérer l'exportateur
            ExportateurEtranger exportateur = exportateurRepository.findById(request.getExportateurId())
                    .orElseThrow(() -> ProductDeclarationException.exportateurNotFound(request.getExportateurId()));

            // Vérifier si l'exportateur a déjà une demande en cours
            /*long pendingDemandes = demandeRepository.countByExportateurIdAndStatus(
                    exportateur.getId(), DemandeStatus.SOUMISE);

            if (pendingDemandes > MAX_SUBMITTED_DEMANDES) {
                throw ProductDeclarationException.maxPendingDemandesExceeded(MAX_SUBMITTED_DEMANDES);
            }*/

            // Créer la demande
            DemandeEnregistrement demande = DemandeEnregistrement.builder()
                    .exportateur(exportateur)
                    .reference(generateReference())
                    .status(DemandeStatus.BROUILLON)
                    .submittedAt(null)
                    .paymentStatus(PaymentStatus.EN_ATTENTE)
                    .typeDemandeur(TypeDemandeur.EXPORTATEUR)
                    .build();

            demande = demandeRepository.save(demande);

            // Sauvegarder les produits et les lier via DemandeProduit
            for (ProductRequestDTO productRequest : request.getProducts()) {
                Product product = mapToEntity(productRequest);
                product = productRepository.save(product);

                // Créer l'association via DemandeProduit
                DemandeProduit demandeProduit = DemandeProduit.builder()
                        .demande(demande)
                        .produit(product)
                        .type(TypeDemandeur.EXPORTATEUR)
                        .build();
                demandeProduitRepository.save(demandeProduit);
            }

            // Ajouter l'historique
            addHistory(demande, null, DemandeStatus.BROUILLON, "CRÉATION",
                    "Demande créée avec succès", exportateur);

            log.info("Demande créée avec succès, référence: {}", demande.getReference());
            return mapToDTO(demande);

        } catch (ProductDeclarationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur inattendue lors de la création de la demande: {}", e.getMessage());
            throw ProductDeclarationException.demandeCreationFailed(e.getMessage());
        }
    }

    /**
     * Uploader une image pour un produit
     */
    @Transactional
    public String uploadProductImage(Long demandeId, Long productId, MultipartFile file, String originalFileName) {
        log.info("Upload de l'image pour le produit ID: {}, demande ID: {}", productId, demandeId);

        try {
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Produit non trouvé avec ID: " + productId));

            boolean isAssociated = demandeProduitRepository.existsByDemandeIdAndProduitId(demandeId, productId);
            if (!isAssociated) {
                throw new RuntimeException("Ce produit n'appartient pas à cette demande");
            }

            String uploadDir = UPLOAD_DIR + demandeId + "/products/" + productId + "/images/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                log.info("Répertoire créé: {}", uploadDir);
            }

            // ✅ Utiliser le nom original s'il est fourni
            String fileName;
            if (originalFileName != null && !originalFileName.isEmpty()) {
                fileName = cleanFileName(originalFileName);
            } else {
                String extension = "";
                String originalFilename = file.getOriginalFilename();
                if (originalFilename != null && originalFilename.contains(".")) {
                    extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                }
                fileName = "product_" + productId + "_" + System.currentTimeMillis() + extension;
            }

            // ✅ Vérifier si le fichier existe déjà et ajouter un compteur
            Path filePath = uploadPath.resolve(fileName);
            String finalFileName = fileName;
            int counter = 1;

            while (Files.exists(filePath)) {
                String nameWithoutExt = fileName;
                String extension = "";
                int lastDot = fileName.lastIndexOf('.');
                if (lastDot > 0) {
                    nameWithoutExt = fileName.substring(0, lastDot);
                    extension = fileName.substring(lastDot);
                }
                finalFileName = nameWithoutExt + "_" + counter + extension;
                filePath = uploadPath.resolve(finalFileName);
                counter++;
            }

            Files.copy(file.getInputStream(), filePath);
            log.info("Fichier sauvegardé: {}", filePath.toString());

            // Supprimer l'ancienne image si elle existe
            if (product.getProductImage() != null && !product.getProductImage().isEmpty()) {
                try {
                    // Extraire le nom du fichier depuis l'URL
                    String oldFilePath = product.getProductImage().replace("\\", "/");
                    Path oldImagePath = Paths.get("." + oldFilePath);
                    if (Files.exists(oldImagePath)) {
                        Files.delete(oldImagePath);
                        log.info("Ancienne image supprimée: {}", oldImagePath);
                    }
                } catch (Exception e) {
                    log.warn("Impossible de supprimer l'ancienne image: {}", e.getMessage());
                }
            }

            // ✅ URL avec le nom original
            String imageUrl = "/uploads/" + demandeId + "/products/" + productId + "/images/" + finalFileName;
            product.setProductImage(imageUrl);
            productRepository.save(product);

            log.info("Image uploadée avec succès - URL: {}", imageUrl);
            return imageUrl;

        } catch (IOException e) {
            log.error("Erreur lors de l'upload de l'image: {}", e.getMessage());
            throw new RuntimeException("Erreur lors de l'upload: " + e.getMessage());
        }
    }

    /**
     * Nettoie le nom du fichier
     */
    private String cleanFileName(String fileName) {
        if (fileName == null) return "image.jpg";
        String cleaned = fileName.replaceAll("\\s+", "_");
        cleaned = cleaned.replaceAll("[^a-zA-Z0-9._-]", "");
        if (cleaned.length() > 100) {
            String extension = "";
            int lastDot = cleaned.lastIndexOf('.');
            if (lastDot > 0) {
                extension = cleaned.substring(lastDot);
                cleaned = cleaned.substring(0, 80);
            }
            cleaned = cleaned + extension;
        }
        return cleaned.isEmpty() ? "image.jpg" : cleaned;
    }
    /**
     * Map ProductRequestDTO to Product entity
     */
    private Product mapToEntity(ProductRequestDTO dto) {
        return Product.builder()
                .productType(dto.getProductType())
                .category(dto.getCategory())
                .hsCode(dto.getHsCode())
                .productName(dto.getProductName())
                .isLinkedToBrand(dto.getIsLinkedToBrand())
                .brandName(dto.getBrandName())
                .isBrandOwner(dto.getIsBrandOwner())
                .hasBrandLicense(dto.getHasBrandLicense())
                .productState(dto.getProductState())
                .originCountry(dto.getOriginCountry())
                .annualQuantityValue(dto.getAnnualQuantityValue())
                .annualQuantityUnit(dto.getAnnualQuantityUnit())
                .commercialBrandName(dto.getCommercialBrandName())
                .build();
    }

    /**
     * Uploader un document pour une demande
     */
    @Transactional
    public DocumentDTO uploadDocument(Long demandeId, Long exportateurId,
                                      MultipartFile file, String documentTypeStr,
                                      @RequestParam(required = false) Long productId) {

        log.info("Upload du document pour la demande ID: {}, type: {}, productId: {}",
                demandeId, documentTypeStr, productId);

        try {
            // 1. Chercher la demande
            DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                    .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

            // 2. Vérifier l'autorisation
            if (!demande.getExportateur().getId().equals(exportateurId)) {
                throw new RuntimeException("Accès non autorisé");
            }

            // 3. Vérifier que la demande est en BROUILLON
            if (demande.getStatus() != DemandeStatus.BROUILLON) {
                throw new RuntimeException("Impossible d'uploader des documents sur une demande déjà soumise");
            }

            // 4. Vérifier le type de document
            DocumentType documentType;
            try {
                documentType = DocumentType.valueOf(documentTypeStr);
            } catch (IllegalArgumentException e) {
                throw ProductDeclarationException.invalidDocumentType(e.getMessage());
            }

            // 5. Récupérer le produit si spécifié
            Product product = null;
            if (productId != null) {
                product = productRepository.findById(productId)
                        .orElseThrow(() -> new RuntimeException("Produit non trouvé avec ID: " + productId));

                // Vérifier que le produit est bien associé à cette demande via DemandeProduit
                boolean isAssociated = demandeProduitRepository.existsByDemandeIdAndProduitId(demandeId, productId);
                if (!isAssociated) {
                    throw new RuntimeException("Ce produit n'appartient pas à cette demande");
                }
            }

            // 6. Créer le répertoire
            Path uploadPath = Paths.get(UPLOAD_DIR + demandeId + "/" +
                    (productId != null ? "product_" + productId : "global"));
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 7. Sauvegarder le fichier
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath);

            // 8. Créer l'entité Document
            Document document = Document.builder()
                    .fileName(file.getOriginalFilename())
                    .filePath(filePath.toString())
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .documentType(documentType)
                    .status(DocumentStatus.EN_ATTENTE)
                    .uploadedAt(LocalDateTime.now())
                    .exportateur(demande.getExportateur())
                    .demande(demande)
                    .product(product)
                    .build();

            document = documentRepository.save(document);

            log.info("Document uploadé avec succès, ID: {}", document.getId());
            return convertToDTO(document);

        } catch (IOException e) {
            log.error("Erreur lors de l'upload du document: {}", e.getMessage());
            throw new RuntimeException("Erreur lors du téléchargement: " + e.getMessage());
        }
    }

    @Transactional
    public DemandeEnregistrementDTO submitDemande(Long demandeId, Long userId) {
        log.info("Soumission de la demande ID: {}", demandeId);

        try {
            DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                    .orElseThrow(() -> ProductDeclarationException.demandeNotFound(demandeId));

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> ProductDeclarationException.userNotFound(userId));

            // Vérifier que la demande appartient à l'utilisateur
            if (!demande.getExportateur().getId().equals(userId)) {
                throw ProductDeclarationException.unauthorizedAccess();
            }

            // Vérifier que la demande est en BROUILLON
            if (demande.getStatus() != DemandeStatus.BROUILLON) {
                throw ProductDeclarationException.invalidDemandeStatusForSubmission(demande.getStatus());
            }

            // Vérifier que tous les documents obligatoires sont présents et uploadés
            try {
                validateRequiredDocuments(demande);
            } catch (RuntimeException e) {
                throw ProductDeclarationException.missingRequiredDocuments(e.getMessage());
            }

            // Vérifier la limite de demandes soumises (non validées)
            long submittedDemandesCount = demandeRepository.countByExportateurIdAndStatusIn(
                    userId,
                    List.of(DemandeStatus.SOUMISE)
            );

            if (submittedDemandesCount > MAX_SUBMITTED_DEMANDES) {
                throw ProductDeclarationException.maxSubmittedDemandesExceeded(MAX_SUBMITTED_DEMANDES);
            }

            DemandeStatus oldStatus = demande.getStatus();

            // Mettre à jour le statut
            demande.setStatus(DemandeStatus.SOUMISE);
            demande.setSubmittedAt(LocalDateTime.now());

            demande = demandeRepository.save(demande);

            addHistory(demande, oldStatus, DemandeStatus.SOUMISE, "SOUMISSION",
                    "Demande soumise pour validation", user);

            log.info("Demande soumise avec succès, ID: {}. Nombre de demandes en cours: {}/{}",
                    demandeId, submittedDemandesCount + 1, MAX_SUBMITTED_DEMANDES);

            return mapToDTO(demande);

        } catch (ProductDeclarationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur inattendue lors de la soumission de la demande: {}", e.getMessage());
            throw ProductDeclarationException.demandeSubmissionFailed(e.getMessage());
        }
    }


    /**
     * Mettre à jour une demande avec ses documents
     */
    @Transactional
    public DemandeEnregistrementDTO updateDemandeWithDocuments(Long demandeId, DemandeEnregistrementRequestDTO request) {
        log.info("=== DÉBUT updateDemandeWithDocuments ===");
        log.info("Demande ID: {}", demandeId);
        log.info("Exportateur ID: {}", request.getExportateurId());

        try {
            // 1. Vérifier que la demande existe
            log.info("1. Recherche de la demande ID: {}", demandeId);
            DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                    .orElseThrow(() -> {
                        log.error("Demande non trouvée avec ID: {}", demandeId);
                        return ProductDeclarationException.demandeNotFound(demandeId);
                    });
            log.info("   ✅ Demande trouvée - Référence: {}, Statut: {}", demande.getReference(), demande.getStatus());

            // 2. Vérifier l'autorisation
            log.info("2. Vérification de l'autorisation...");
            log.info("   Exportateur de la demande: {}", demande.getExportateur().getId());
            log.info("   Exportateur connecté: {}", request.getExportateurId());

            if (!demande.getExportateur().getId().equals(request.getExportateurId())) {
                log.error("Accès non autorisé!");
                throw ProductDeclarationException.unauthorizedAccess();
            }
            log.info("   ✅ Autorisation OK");

            // 3. Vérifier que la demande est en BROUILLON
            log.info("3. Vérification du statut...");
            log.info("   Statut actuel: {}", demande.getStatus());
            if (demande.getStatus() != DemandeStatus.BROUILLON) {
                log.error("Statut invalide pour modification. Attendu: BROUILLON, Obtenu: {}", demande.getStatus());
                throw ProductDeclarationException.invalidDemandeStatusForUpdate(demande.getStatus());
            }
            log.info("   ✅ Statut valide pour modification");

            // 4. Mettre à jour les produits
            log.info("4. Mise à jour des produits...");
            log.info("   Nombre de produits reçus: {}", request.getProducts() != null ? request.getProducts().size() : 0);
            updateProducts(demande, request.getProducts());
            log.info("   ✅ Produits mis à jour");

            // 5. Mettre à jour les documents
            log.info("5. Mise à jour des documents...");
            log.info("   Nombre de documents reçus: {}", request.getDocuments() != null ? request.getDocuments().size() : 0);
            if (request.getDocuments() != null && !request.getDocuments().isEmpty()) {
                updateDocuments(demande, request.getDocuments());
            }
            log.info("   ✅ Documents mis à jour");

            // 6. Ajouter l'historique
            log.info("6. Ajout de l'historique...");
            User user = userRepository.findById(request.getExportateurId())
                    .orElseThrow(() -> {
                        log.error("Utilisateur non trouvé avec ID: {}", request.getExportateurId());
                        return ProductDeclarationException.userNotFound(request.getExportateurId());
                    });

            addHistory(demande, demande.getStatus(), DemandeStatus.BROUILLON, "MODIFICATION",
                    "Demande mise à jour avec produits et documents", user);
            log.info("   ✅ Historique ajouté");

            log.info("=== FIN SUCCÈS updateDemandeWithDocuments ===");
            return mapToDTO(demande);

        } catch (ProductDeclarationException e) {
            log.error("Erreur métier: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Erreur technique: {}", e.getMessage(), e);
            throw ProductDeclarationException.demandeUpdateFailed(e.getMessage());
        }
    }

    /**
     * Mettre à jour les documents d'une demande
     */
    private void updateDocuments(DemandeEnregistrement demande, List<DocumentRequestDTO> documentUploads) {
        for (DocumentRequestDTO docUpload : documentUploads) {
            try {
                // Vérifier si le document existe déjà
                Document existingDoc = documentRepository.findByDemandeIdAndProductIdAndDocumentType(
                                demande.getId(), docUpload.getProductId(), docUpload.getDocumentType())
                        .orElse(null);

                // Convertir base64 en fichier
                byte[] fileBytes = java.util.Base64.getDecoder().decode(docUpload.getFileContent());

                // Créer le répertoire
                String uploadDir = UPLOAD_DIR + demande.getId() + "/" +
                        (docUpload.getProductId() != null ? "product_" + docUpload.getProductId() : "global");
                Path uploadPath = Paths.get(uploadDir);
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }

                // Générer le nom du fichier
                String fileName = UUID.randomUUID().toString() + "_" + docUpload.getFileName();
                Path filePath = uploadPath.resolve(fileName);

                // Sauvegarder le fichier
                Files.write(filePath, fileBytes);

                if (existingDoc != null) {
                    // Supprimer l'ancien fichier
                    Path oldPath = Paths.get(existingDoc.getFilePath());
                    if (Files.exists(oldPath)) {
                        Files.deleteIfExists(oldPath);
                    }
                    // Mettre à jour le document existant
                    existingDoc.setFileName(docUpload.getFileName());
                    existingDoc.setFilePath(filePath.toString());
                    existingDoc.setFileType(docUpload.getFileType());
                    existingDoc.setUploadedAt(LocalDateTime.now());
                    documentRepository.save(existingDoc);
                } else {
                    // Créer un nouveau document
                    Product product = null;
                    if (docUpload.getProductId() != null) {
                        product = productRepository.findById(docUpload.getProductId()).orElse(null);
                    }

                    Document document = Document.builder()
                            .fileName(docUpload.getFileName())
                            .filePath(filePath.toString())
                            .fileType(docUpload.getFileType())
                            .fileSize((long) fileBytes.length)
                            .documentType(docUpload.getDocumentType())
                            .status(DocumentStatus.EN_ATTENTE)
                            .uploadedAt(LocalDateTime.now())
                            .exportateur(demande.getExportateur())
                            .demande(demande)
                            .product(product)
                            .build();
                    documentRepository.save(document);
                }

                log.info("Document {} mis à jour pour le produit {}", docUpload.getDocumentType(), docUpload.getProductId());

            } catch (Exception e) {
                log.error("Erreur lors de la mise à jour du document: {}", e.getMessage());
                throw new RuntimeException("Erreur lors de la mise à jour du document: " + e.getMessage());
            }
        }
    }

    /**
     * Mettre à jour les produits d'une demande
     */
    private List<Product> updateProducts(DemandeEnregistrement demande, List<ProductRequestDTO> productRequests) {
        // Récupérer les produits existants
        List<DemandeProduit> existingDemandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
        List<Product> existingProducts = existingDemandeProduits.stream()
                .map(DemandeProduit::getProduit)
                .collect(Collectors.toList());

        Map<Long, Product> existingProductMap = existingProducts.stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        List<Product> productsToKeep = new ArrayList<>();
        List<Product> productsToCreate = new ArrayList<>();

        for (ProductRequestDTO productRequest : productRequests) {
            if (productRequest.getId() != null && existingProductMap.containsKey(productRequest.getId())) {
                // Produit existant
                Product existingProduct = existingProductMap.get(productRequest.getId());

                // Mettre à jour les champs texte
                updateProductEntity(existingProduct, productRequest);

                // ✅ Gérer la nouvelle image si elle est en Base64
                if (productRequest.getProductImage() != null &&
                        productRequest.getProductImage().startsWith("data:image")) {

                    log.info("Nouvelle image Base64 détectée pour le produit ID: {}", existingProduct.getId());

                    // Sauvegarder l'image et obtenir le chemin
                    String imagePath = saveImageFromBase64(
                            productRequest.getProductImage(),
                            demande.getId(),
                            existingProduct.getId(),
                            productRequest.getProductImageName()
                    );

                    // ✅ CRUCIAL: Mettre à jour le produit avec le nouveau chemin
                    if (imagePath != null) {
                        existingProduct.setProductImage(imagePath);
                        log.info("Image mise à jour avec le chemin: {}", imagePath);
                    }
                }

                productsToKeep.add(existingProduct);
            } else {
                // Nouveau produit
                Product newProduct = mapToEntity(productRequest);
                productsToCreate.add(newProduct);
            }
        }

        // Sauvegarder les produits existants
        productRepository.saveAll(productsToKeep);

        // Créer et sauvegarder les nouveaux produits
        List<Product> savedNewProducts = new ArrayList<>();
        for (Product newProduct : productsToCreate) {
            Product savedProduct = productRepository.save(newProduct);

            // ✅ Pour les nouveaux produits, sauvegarder aussi l'image
            // Trouver le DTO correspondant
            ProductRequestDTO matchingDto = productRequests.stream()
                    .filter(dto -> dto.getId() == null &&
                            dto.getProductName() != null &&
                            dto.getProductName().equals(newProduct.getProductName()))
                    .findFirst()
                    .orElse(null);

            if (matchingDto != null && matchingDto.getProductImage() != null &&
                    matchingDto.getProductImage().startsWith("data:image")) {

                String imagePath = saveImageFromBase64(
                        matchingDto.getProductImage(),
                        demande.getId(),
                        savedProduct.getId(),
                        matchingDto.getProductImageName()
                );

                if (imagePath != null) {
                    savedProduct.setProductImage(imagePath);
                    productRepository.save(savedProduct);
                    log.info("Nouvelle image sauvegardée pour le produit ID: {}, chemin: {}", savedProduct.getId(), imagePath);
                }
            }

            savedNewProducts.add(savedProduct);

            // Créer l'association
            DemandeProduit demandeProduit = DemandeProduit.builder()
                    .demande(demande)
                    .produit(savedProduct)
                    .type(TypeDemandeur.EXPORTATEUR)
                    .dateAssociation(LocalDateTime.now())
                    .build();
            demandeProduitRepository.save(demandeProduit);
        }

        // Supprimer les produits qui ne sont plus dans la liste
        List<Long> productIdsToKeep = productRequests.stream()
                .filter(r -> r.getId() != null)
                .map(ProductRequestDTO::getId)
                .collect(Collectors.toList());

        List<Product> productsToDelete = existingProducts.stream()
                .filter(p -> !productIdsToKeep.contains(p.getId()))
                .collect(Collectors.toList());

        for (Product productToDelete : productsToDelete) {
            demandeProduitRepository.deleteByDemandeIdAndProduitId(demande.getId(), productToDelete.getId());
            productRepository.delete(productToDelete);
            log.info("Produit ID: {} supprimé", productToDelete.getId());
        }

        List<Product> allProducts = new ArrayList<>();
        allProducts.addAll(productsToKeep);
        allProducts.addAll(savedNewProducts);

        return allProducts;
    }

    /**
     * Sauvegarder une image encodée en Base64
     */
    private String saveImageFromBase64(String base64Image, Long demandeId, Long productId, String originalFileName) {
        try {
            String[] parts = base64Image.split(",");
            String header = parts[0];
            String base64Data = parts[1];

            String extension = "jpg";
            if (header.contains("image/png")) {
                extension = "png";
            } else if (header.contains("image/jpeg")) {
                extension = "jpg";
            } else if (header.contains("image/gif")) {
                extension = "gif";
            }

            byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);

            String uploadDir = UPLOAD_DIR + demandeId + "/products/" + productId + "/images/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String fileName;
            if (originalFileName != null && !originalFileName.isEmpty()) {
                fileName = cleanFileName(originalFileName);
                if (!fileName.endsWith("." + extension)) {
                    String nameWithoutExt = fileName;
                    int lastDot = fileName.lastIndexOf('.');
                    if (lastDot > 0) {
                        nameWithoutExt = fileName.substring(0, lastDot);
                    }
                    fileName = nameWithoutExt + "." + extension;
                }
            } else {
                fileName = "product_" + productId + "_" + System.currentTimeMillis() + "." + extension;
            }

            Path filePath = uploadPath.resolve(fileName);
            String finalFileName = fileName;
            int counter = 1;

            while (Files.exists(filePath)) {
                String nameWithoutExt = fileName;
                String ext = "." + extension;
                int lastDot = fileName.lastIndexOf('.');
                if (lastDot > 0) {
                    nameWithoutExt = fileName.substring(0, lastDot);
                    ext = fileName.substring(lastDot);
                }
                finalFileName = nameWithoutExt + "_" + counter + ext;
                filePath = uploadPath.resolve(finalFileName);
                counter++;
            }

            Files.write(filePath, imageBytes);
            log.info("Image sauvegardée: {}", finalFileName);

            return "/uploads/" + demandeId + "/products/" + productId + "/images/" + finalFileName;

        } catch (Exception e) {
            log.error("Erreur lors de la sauvegarde de l'image: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Mettre à jour une entité Product existante
     */
    private void updateProductEntity(Product product, ProductRequestDTO dto) {
        product.setProductType(dto.getProductType());
        product.setCategory(dto.getCategory());
        product.setHsCode(dto.getHsCode());
        product.setProductName(dto.getProductName());
        product.setIsLinkedToBrand(dto.getIsLinkedToBrand());
        product.setBrandName(dto.getBrandName());
        product.setIsBrandOwner(dto.getIsBrandOwner());
        product.setHasBrandLicense(dto.getHasBrandLicense());
        product.setProductState(dto.getProductState());
        product.setOriginCountry(dto.getOriginCountry());
        product.setAnnualQuantityValue(dto.getAnnualQuantityValue());
        product.setAnnualQuantityUnit(dto.getAnnualQuantityUnit());
        product.setCommercialBrandName(dto.getCommercialBrandName());
    }


    /**
     * Supprimer une demande en mode brouillon
     * @param demandeId ID de la demande à supprimer
     * @param exportateurId ID de l'exportateur connecté
     */
    @Transactional
    public void deleteDemande(Long demandeId, Long exportateurId) {
        log.info("Tentative de suppression de la demande ID: {} par l'exportateur ID: {}", demandeId, exportateurId);

        try {
            // 1. Vérifier que la demande existe
            DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                    .orElseThrow(() -> ProductDeclarationException.demandeNotFound(demandeId));

            // 2. Vérifier que la demande appartient à l'exportateur
            if (!demande.getExportateur().getId().equals(exportateurId)) {
                log.error("Accès non autorisé: la demande {} n'appartient pas à l'exportateur {}", demandeId, exportateurId);
                throw ProductDeclarationException.unauthorizedAccess();
            }

            // 3. Vérifier que la demande est en mode BROUILLON (seules les demandes en brouillon peuvent être supprimées)
            if (demande.getStatus() != DemandeStatus.BROUILLON) {
                log.error("Impossible de supprimer la demande {}: statut actuel = {}, seul BROUILLON est autorisé",
                        demandeId, demande.getStatus());
                throw ProductDeclarationException.invalidDemandeStatusForDeletion(demande.getStatus());
            }

            // 4. Supprimer les fichiers physiques (documents et images)
            deletePhysicalFiles(demande);

            // 5. Supprimer les associations DemandeProduit
            List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demandeId);
            demandeProduitRepository.deleteAll(demandeProduits);
            log.info("Supprimé {} associations produit(s) pour la demande {}", demandeProduits.size(), demandeId);

            // 6. Supprimer les produits associés
            for (DemandeProduit dp : demandeProduits) {
                Product product = dp.getProduit();
                if (product != null) {
                    productRepository.delete(product);
                    log.info("Produit ID: {} supprimé", product.getId());
                }
            }

            // 7. Supprimer les documents
            List<Document> documents = documentRepository.findByDemandeId(demandeId);
            documentRepository.deleteAll(documents);
            log.info("Supprimé {} document(s) pour la demande {}", documents.size(), demandeId);

            // 8. Supprimer l'historique
            List<DemandeHistory> histories = historyRepository.findByDemandeIdOrderByPerformedAtDesc(demandeId);
            historyRepository.deleteAll(histories);
            log.info("Supprimé {} historique(s) pour la demande {}", histories.size(), demandeId);

            // 9. Supprimer la demande elle-même
            demandeRepository.delete(demande);
            log.info("Demande ID: {} supprimée avec succès", demandeId);

        } catch (ProductDeclarationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur inattendue lors de la suppression de la demande: {}", e.getMessage());
            throw ProductDeclarationException.demandeDeletionFailed(e.getMessage());
        }
    }

    /**
     * Supprimer les fichiers physiques associés à une demande
     */
    private void deletePhysicalFiles(DemandeEnregistrement demande) {
        try {
            // Chemin du répertoire de la demande
            String demandeDir = UPLOAD_DIR + demande.getId();
            Path demandePath = Paths.get(demandeDir);

            if (Files.exists(demandePath)) {
                // Supprimer récursivement tous les fichiers et dossiers
                Files.walk(demandePath)
                        .sorted((path1, path2) -> path2.compareTo(path1)) // Supprimer les fichiers avant les dossiers
                        .forEach(path -> {
                            try {
                                Files.deleteIfExists(path);
                                log.info("Fichier supprimé: {}", path);
                            } catch (IOException e) {
                                log.warn("Impossible de supprimer le fichier: {}", path, e);
                            }
                        });
                log.info("Répertoire de la demande supprimé: {}", demandeDir);
            }
        } catch (IOException e) {
            log.warn("Erreur lors de la suppression des fichiers physiques: {}", e.getMessage());
        }
    }

    /*@Transactional
    public DemandeEnregistrementDTO validateDemande(Long demandeId, String decisionComment, Long agentId) {
        log.info("Validation de la demande ID: {} par l'agent ID: {}", demandeId, agentId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + demandeId));

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé avec ID: " + agentId));

        // Vérifier que la demande est soumise
        if (demande.getStatus() != DemandeStatus.SOUMISE) {
            throw new RuntimeException("Seules les demandes soumises peuvent être validées");
        }

        // Générer le numéro d'agrément
        String numeroAgrement = generateAgrementNumber();

        DemandeStatus oldStatus = demande.getStatus();

        demande.setStatus(DemandeStatus.VALIDEE);
        demande.setDecisionDate(LocalDateTime.now());
        demande.setDecisionComment(decisionComment);
        demande.setAssignedTo(agentId);
        demande.setNumeroAgrement(numeroAgrement);
        demande.setDateAgrement(LocalDateTime.now().toLocalDate());

        // Mettre à jour le statut de l'exportateur
        ExportateurEtranger exportateur = demande.getExportateur();
        exportateur.setStatutAgrement(StatutAgrement.VALIDE);
        exportateur.setNumeroAgrement(numeroAgrement);
        exportateur.setDateAgrement(LocalDateTime.now().toLocalDate());
        exportateurRepository.save(exportateur);

        demande = demandeRepository.save(demande);

        addHistory(demande, oldStatus, DemandeStatus.VALIDEE, "VALIDATION",
                "Agrément N° " + numeroAgrement + " attribué. " + decisionComment, agent);

        log.info("Demande validée avec succès, agrément N°: {}", numeroAgrement);
        return mapToDTO(demande);
    }*/

/*    @Transactional
    public DemandeEnregistrementDTO rejectDemande(Long demandeId, String rejectionReason, Long agentId) {
        log.info("Rejet de la demande ID: {} par l'agent ID: {}", demandeId, agentId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + demandeId));

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé avec ID: " + agentId));

        // Vérifier que la demande est soumise
        if (demande.getStatus() != DemandeStatus.SOUMISE) {
            throw new RuntimeException("Seules les demandes soumises peuvent être rejetées");
        }

        DemandeStatus oldStatus = demande.getStatus();

        demande.setStatus(DemandeStatus.REJETEE);
        demande.setDecisionDate(LocalDateTime.now());
        demande.setDecisionComment(rejectionReason);
        demande.setAssignedTo(agentId);

        demande = demandeRepository.save(demande);

        addHistory(demande, oldStatus, DemandeStatus.REJETEE, "REJET",
                rejectionReason, agent);

        log.info("Demande rejetée, ID: {}", demandeId);
        return mapToDTO(demande);
    }*/

    /*public DemandeEnregistrementDTO getDemandeById(Long demandeId) {
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + demandeId));

        return mapToDTO(demande);
    }*/

    /**
     * Récupérer UNIQUEMENT les déclarations de produits (DEM-)
     */
    public List<DemandeEnregistrementDTO> getDeclarationsProduitsByExportateur(Long exportateurId) {
        log.info("Récupération des déclarations de produits pour l'exportateur ID: {}", exportateurId);

        List<DemandeEnregistrement> demandes = demandeRepository
                .findDeclarationsProduitsByExportateurId(exportateurId);

        return demandes.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }


    /*public List<DemandeEnregistrementDTO> getDemandesByStatus(DemandeStatus status) {
        return demandeRepository.findByStatus(status).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }*/

    /**
     * Récupérer un document par son ID
     */
    /*public DocumentDTO getDocumentById(Long documentId, Long exportateurId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document non trouvé avec l'ID: " + documentId));

        // Vérifier que le document appartient bien à l'exportateur
        if (!document.getExportateur().getId().equals(exportateurId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à accéder à ce document");
        }

        return convertToDTO(document);
    }*/

    /**
     * Récupérer le fichier du document
     */
    /*public org.springframework.core.io.Resource getDocumentFile(Long documentId, Long exportateurId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document non trouvé avec l'ID: " + documentId));

        // Vérifier que le document appartient bien à l'exportateur
        if (!document.getExportateur().getId().equals(exportateurId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à accéder à ce document");
        }

        try {
            Path filePath = Paths.get(document.getFilePath());
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Le fichier n'existe pas ou n'est pas accessible");
            }
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la lecture du fichier: " + e.getMessage());
        }
    }*/

    private void validateRequiredDocuments(DemandeEnregistrement demande) {
        List<Document> documents = documentRepository.findByDemandeId(demande.getId());
        List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());

        for (DemandeProduit dp : demandeProduits) {
            Product product = dp.getProduit();
            if ("alimentaire".equals(product.getProductType())) {
                validateFoodProductDocuments(documents, product);
            } else if ("industriel".equals(product.getProductType())) {
                validateIndustrialProductDocuments(documents, product);
            }
        }
    }

    private void validateFoodProductDocuments(List<Document> documents, Product product) {
        // Documents obligatoires pour tous les produits alimentaires
        checkRequiredDocument(documents, product, DocumentType.SANITARY_APPROVAL,
                "Certificat d'agrément/enregistrement de sécurité sanitaire");
        checkRequiredDocument(documents, product, DocumentType.SANITARY_CERT,
                "Certificat sanitaire");
        checkRequiredDocument(documents, product, DocumentType.FREE_SALE_CERT,
                "Certificat de libre vente");
        checkRequiredDocument(documents, product, DocumentType.TECHNICAL_DATA_SHEET,
                "Fiche technique");
        checkRequiredDocument(documents, product, DocumentType.BACTERIO_ANALYSIS,
                "Rapport d'analyse bactériologique");
        checkRequiredDocument(documents, product, DocumentType.PHYSICO_CHEM_ANALYSIS,
                "Rapport d'analyse physico-chimique");
        checkRequiredDocument(documents, product, DocumentType.RADIOACTIVITY_ANALYSIS,
                "Rapport d'analyse de radioactivité");
        checkRequiredDocument(documents, product, DocumentType.FUMIGATION_CERT,
                "Certificat de fumigation");
        checkRequiredDocument(documents, product, DocumentType.OFFICIAL_LETTER,
                "Lettre officielle");
        checkRequiredDocument(documents, product, DocumentType.PRODUCT_SHEETS,
                "Fiches produits");

        // Document conditionnel : Licence pour exploiter la marque
        if (Boolean.TRUE.equals(product.getHasBrandLicense())) {
            checkRequiredDocument(documents, product, DocumentType.BRAND_LICENSE,
                    "Licence pour exploiter la marque");
        }
    }

    private void validateIndustrialProductDocuments(List<Document> documents, Product product) {
        checkRequiredDocument(documents, product, DocumentType.CONFORMITY_CERT_ANALYSIS_REPORT,
                "Certificat de conformité ou rapport d'analyse");
    }

    private void checkRequiredDocument(List<Document> documents, Product product,
                                       DocumentType docType, String docName) {
        boolean hasDocument = documents.stream()
                .anyMatch(d -> d.getDocumentType() == docType &&
                        d.getProduct() != null &&
                        d.getProduct().getId().equals(product.getId()));

        if (!hasDocument) {
            throw new RuntimeException("Le document '" + docName + "' est obligatoire pour le produit: " +
                    product.getProductName());
        }

        // Vérifier que le fichier est uploadé
        boolean fileUploaded = documents.stream()
                .filter(d -> d.getDocumentType() == docType &&
                        d.getProduct() != null &&
                        d.getProduct().getId().equals(product.getId()))
                .allMatch(d -> d.getFilePath() != null && !d.getFilePath().isEmpty());

        if (!fileUploaded) {
            throw new RuntimeException("Le fichier pour le document '" + docName +
                    "' doit être téléversé pour le produit: " + product.getProductName());
        }
    }

    private String generateReference() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uniqueId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return "DEM-" + dateStr + "-" + uniqueId;
    }

    /*private String generateAgrementNumber() {
        String year = String.valueOf(LocalDateTime.now().getYear());
        String random = String.format("%06d", new Random().nextInt(1000000));
        return "AGR-" + year + "-" + random;
    }*/

    private void addHistory(DemandeEnregistrement demande, DemandeStatus oldStatus,
                            DemandeStatus newStatus, String action, String comment, User performedBy) {
        DemandeHistory history = DemandeHistory.builder()
                .demande(demande)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .action(action)
                .comment(comment)
                .performedBy(performedBy)
                .performedAt(LocalDateTime.now())
                .build();

        historyRepository.save(history);
    }

    private DemandeEnregistrementDTO mapToDTO(DemandeEnregistrement demande) {
        // Récupérer les produits via DemandeProduit
        List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
        List<Product> products = demandeProduits.stream()
                .map(DemandeProduit::getProduit)
                .collect(Collectors.toList());

        List<Document> documents = documentRepository.findByDemandeId(demande.getId());
        List<DemandeHistory> history = historyRepository.findByDemandeIdOrderByPerformedAtDesc(demande.getId());

        return DemandeEnregistrementDTO.builder()
                .id(demande.getId())
                .reference(demande.getReference())
                .status(demande.getStatus())
                .submittedAt(demande.getSubmittedAt())
                .paymentReference(demande.getPaymentReference())
                .paymentAmount(demande.getPaymentAmount())
                .paymentStatus(demande.getPaymentStatus())
                .assignedTo(demande.getAssignedTo())
                .decisionDate(demande.getDecisionDate())
                .decisionComment(demande.getDecisionComment())
                .numeroAgrement(demande.getNumeroAgrement())
                .dateAgrement(demande.getDateAgrement() != null ?
                        demande.getDateAgrement().atStartOfDay() : null)
                .products(mapProductsToDTO(products))
                .documents(documents.stream().map(this::convertToDTO).collect(Collectors.toList()))
                .history(history.stream().map(this::mapHistoryToDTO).collect(Collectors.toList()))
                .build();
    }

    /*private UserDTO mapExportateurToDTO(ExportateurEtranger exportateur) {
        UserDTO dto = new UserDTO();
        dto.setId(exportateur.getId());
        dto.setNom(exportateur.getNom());
        dto.setPrenom(exportateur.getPrenom());
        dto.setEmail(exportateur.getEmail());
        dto.setTelephone(exportateur.getTelephone());
        dto.setRole(exportateur.getRole());
        dto.setStatut(exportateur.getUserStatut());
        dto.setDateCreation(exportateur.getDateCreation());
        dto.setLastLogin(exportateur.getLastLogin());
        dto.setEmailVerified(exportateur.isEmailVerified());
        dto.setTwoFactorEnabled(exportateur.isTwoFactorEnabled());

        // Champs spécifiques exportateur
        dto.setPaysOrigine(exportateur.getPaysOrigine());
        dto.setRaisonSociale(exportateur.getRaisonSociale());
        dto.setNumeroRegistreCommerce(exportateur.getNumeroRegistreCommerce());
        dto.setAdresseLegale(exportateur.getAdresseLegale());
        dto.setVille(exportateur.getVille());
        dto.setSiteWeb(exportateur.getSiteWeb());
        dto.setRepresentantLegal(exportateur.getRepresentantLegal());
        dto.setNumeroTVA(exportateur.getNumeroTVA());
        dto.setStatutAgrement(exportateur.getStatutAgrement());
        dto.setNumeroAgrement(exportateur.getNumeroAgrement());
        dto.setDateAgrement(exportateur.getDateAgrement());
        dto.setCompanyName(exportateur.getRaisonSociale());
        dto.setCountry(exportateur.getPaysOrigine());

        dto.setDocumentsCount(documentRepository.countByExportateurId(exportateur.getId()));

        return dto;
    }*/

    private List<ProduitDTO> mapProductsToDTO(List<Product> products) {
        return products.stream()
                .map(product -> ProduitDTO.builder()
                        .id(product.getId())
                        .productType(product.getProductType())
                        .category(product.getCategory())
                        .hsCode(product.getHsCode())
                        .productName(product.getProductName())
                        .isLinkedToBrand(product.getIsLinkedToBrand())
                        .brandName(product.getBrandName())
                        .isBrandOwner(product.getIsBrandOwner())
                        .hasBrandLicense(product.getHasBrandLicense())
                        .productState(product.getProductState())
                        .originCountry(product.getOriginCountry())
                        .annualQuantityValue(product.getAnnualQuantityValue())
                        .annualQuantityUnit(product.getAnnualQuantityUnit())
                        .commercialBrandName(product.getCommercialBrandName())
                        .productImage(product.getProductImage())

                        // For backward compatibility
                        .processingType(product.getProductState())
                        .annualExportCapacity(product.getAnnualQuantityValue() != null &&
                                product.getAnnualQuantityUnit() != null ?
                                product.getAnnualQuantityValue() + " " +
                                        product.getAnnualQuantityUnit() : null)
                        .build())
                .collect(Collectors.toList());
    }

    private DocumentDTO convertToDTO(Document document) {
        if (document == null) return null;

        return DocumentDTO.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .filePath(document.getFilePath())
                .fileType(document.getFileType())
                .fileSize(document.getFileSize())
                .documentType(document.getDocumentType())
                .status(document.getStatus())
                .validationComment(document.getValidationComment())
                .uploadedAt(document.getUploadedAt())
                .validatedAt(document.getValidatedAt())
                .validatedBy(document.getValidatedBy() != null ?
                        document.getValidatedBy().getNom() + " " + document.getValidatedBy().getPrenom() : null)
                .downloadUrl("/api/demandes/documents/" + document.getId() + "/telecharger")
                .build();
    }

    private DemandeHistoryDTO mapHistoryToDTO(DemandeHistory history) {
        return DemandeHistoryDTO.builder()
                .id(history.getId())
                .action(history.getAction())
                .comment(history.getComment())
                .oldStatus(history.getOldStatus())
                .newStatus(history.getNewStatus())
                .performedBy(history.getPerformedBy() != null ?
                        history.getPerformedBy().getNom() + " " + history.getPerformedBy().getPrenom() : null)
                .performedAt(history.getPerformedAt())
                .build();
    }
}