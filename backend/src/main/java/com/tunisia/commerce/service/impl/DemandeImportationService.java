package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.importateur.DemandeImportationRequestDTO;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.produits.ProduitDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DemandeImportationService {

    private final DemandeEnregistrementRepository demandeRepository;
    private final ImportateurRepository importateurRepository;
    private final ExportateurRepository exportateurRepository;
    private final ProductRepository productRepository;
    private final DemandeProduitRepository demandeProduitRepository;
    private final DocumentRepository documentRepository;
    private final DemandeImportateurRepository demandeImportateurRepository;
    private final DemandeRoutingService demandeRoutingService;

    private static final String REFERENCE_PREFIX = "IMP-";

    @Transactional
    public DemandeEnregistrementDTO createImportationDemande(
            Long importateurId,
            DemandeImportationRequestDTO request) {

        log.info("Création d'une demande d'importation pour l'importateur ID: {}", importateurId);

        // 1. Récupérer l'importateur
        ImportateurTunisien importateur = importateurRepository.findById(importateurId)
                .orElseThrow(() -> new RuntimeException("Importateur non trouvé"));

        // 2. Récupérer l'exportateur
        ExportateurEtranger exportateur = null;
        if (request.getExportateurId() != null) {
            exportateur = exportateurRepository.findById(request.getExportateurId())
                    .orElse(null);
        }

        // 3. Récupérer le produit
        Product product = getProduct(request);

        // 4. Créer la demande d'importation spécifique
        DemandeImportateur demande = new DemandeImportateur();

        // Champs hérités de DemandeEnregistrement
        demande.setImportateur(importateur);
        demande.setExportateur(exportateur);
        demande.setReference(generateReference());
        demande.setStatus(DemandeStatus.BROUILLON);
        demande.setTypeDemande(TypeDemande.IMPORT);
        demande.setSubmittedAt(null);
        demande.setPaymentStatus(PaymentStatus.EN_ATTENTE);

        // Champs spécifiques importateur
        demande.setInvoiceNumber(request.getInvoiceNumber());
        if (request.getInvoiceDate() != null) {
            demande.setInvoiceDate(LocalDate.parse(request.getInvoiceDate()));
        }
        demande.setAmount(request.getAmount());
        demande.setCurrency(request.getCurrency());
        demande.setIncoterm(request.getIncoterm());
        demande.setTransportMode(request.getTransportMode());
        demande.setLoadingPort(request.getLoadingPort());
        demande.setDischargePort(request.getDischargePort());
        if (request.getArrivalDate() != null) {
            demande.setArrivalDate(LocalDate.parse(request.getArrivalDate()));
        }

        demande = demandeImportateurRepository.save(demande);

        // 5. Créer l'association produit-demande
        DemandeProduit demandeProduit = DemandeProduit.builder()
                .demande(demande)
                .produit(product)
                .type(TypeDemandeur.IMPORTATEUR)
                .dateAssociation(LocalDateTime.now())
                .build();
        demandeProduitRepository.save(demandeProduit);


        log.info("Demande d'importation créée avec succès, référence: {}", demande.getReference());

        return mapToDTO(demande);
    }

    private Product getProduct(DemandeImportationRequestDTO request) {
        // 1. Priorité 1: Utiliser l'ID du produit s'il est fourni
        if (request.getProduitId() != null) {
            Optional<Product> existingProduct = productRepository.findById(request.getProduitId());
            if (existingProduct.isPresent()) {
                log.info("Produit trouvé par ID: {} - {}", existingProduct.get().getId(), existingProduct.get().getProductName());
                return existingProduct.get();
            } else {
                throw new RuntimeException("Produit non trouvé avec l'ID: " + request.getProduitId());
            }
        }

        // 2. Si l'ID n'est pas fourni, chercher par HS Code
        if (request.getHsCode() != null && !request.getHsCode().isEmpty()) {
            List<Product> products = productRepository.findByHsCode(request.getHsCode());
            if (!products.isEmpty()) {
                log.info("Produit trouvé par HS Code: {} - {}", products.get(0).getHsCode(), products.get(0).getProductName());
                return products.get(0);
            }
        }

        // 3. Si toujours pas trouvé, chercher par nom
        if (request.getProductName() != null && !request.getProductName().isEmpty()) {
            List<Product> products = productRepository.findByProductNameContainingIgnoreCase(request.getProductName());
            if (!products.isEmpty()) {
                log.info("Produit trouvé par nom: {} - {}", products.get(0).getProductName(), products.get(0).getHsCode());
                return products.get(0);
            }
        }

        // 4. Si aucun produit trouvé, on ne crée PAS de nouveau produit
        // On lève une exception car le produit devrait exister
        throw new RuntimeException(
                String.format("Produit non trouvé. Veuillez fournir un ID de produit valide. (Nom: %s, HS Code: %s)",
                        request.getProductName(), request.getHsCode())
        );
    }

    @Transactional
    public DemandeEnregistrementDTO submitImportationDemande(Long demandeId, Long importateurId) {
        log.info("Soumission de la demande d'importation ID: {}", demandeId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        // Vérifier que la demande appartient à l'importateur
        if (demande.getImportateur() == null || !demande.getImportateur().getId().equals(importateurId)) {
            throw new RuntimeException("Accès non autorisé");
        }

        // Vérifier que la demande est en brouillon
        if (demande.getStatus() != DemandeStatus.BROUILLON) {
            throw new RuntimeException("Seules les demandes en brouillon peuvent être soumises");
        }

        // Valider les documents requis
        validateImportationDocuments(demande);

        // Mettre à jour le statut
        demande.setStatus(DemandeStatus.SOUMISE);
        demande.setSubmittedAt(LocalDateTime.now());
        demande = demandeRepository.save(demande);
        demandeRoutingService.assignDemandeToValidators(demande);


        return mapToDTO(demande);
    }

    private void validateImportationDocuments(DemandeEnregistrement demande) {
        List<Document> documents = documentRepository.findByDemandeId(demande.getId());

        // Vérifier que la facture commerciale est présente
        boolean hasInvoice = documents.stream()
                .anyMatch(d -> d.getDocumentType() == DocumentType.INVOICE);

        if (!hasInvoice) {
            throw new RuntimeException("La facture commerciale est obligatoire");
        }

        // Vérifier que le document de transport est présent
        boolean hasTransport = documents.stream()
                .anyMatch(d -> d.getDocumentType() == DocumentType.TRANSPORT_DOCUMENT);

        if (!hasTransport) {
            throw new RuntimeException("Le document de transport est obligatoire");
        }
    }

    /**
     * Modifier une demande d'importation avec ses documents
     * @param demandeId ID de la demande à modifier
     * @param importateurId ID de l'importateur (pour vérification des droits)
     * @param request DTO contenant les nouvelles données
     * @param files Map des nouveaux fichiers à uploader (optionnel)
     * @param documentsToDelete Liste des IDs de documents à supprimer (optionnel)
     * @return La demande modifiée
     */
    @Transactional
    public DemandeEnregistrementDTO updateImportationDemandeWithDocuments(
            Long demandeId,
            Long importateurId,
            DemandeImportationRequestDTO request,
            Map<String, MultipartFile> files,
            List<Long> documentsToDelete) {

        log.info("Modification de la demande d'importation ID: {} avec documents", demandeId);

        // 1. Récupérer la demande
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec l'ID: " + demandeId));

        // 2. Vérifier que la demande appartient à l'importateur
        if (demande.getImportateur() == null || !demande.getImportateur().getId().equals(importateurId)) {
            throw new RuntimeException("Accès non autorisé: cette demande ne vous appartient pas");
        }

        // 3. Vérifier que la demande est en brouillon
        if (demande.getStatus() != DemandeStatus.BROUILLON) {
            throw new RuntimeException("Impossible de modifier une demande qui n'est pas en brouillon. Statut actuel: " + demande.getStatus());
        }

        // 4. Vérifier que la demande est du bon type
        if (!(demande instanceof DemandeImportateur)) {
            throw new RuntimeException("Cette demande n'est pas une demande d'importation modifiable");
        }

        DemandeImportateur demandeImportateur = (DemandeImportateur) demande;

        // 5. Mettre à jour les champs de la demande
        if (request.getInvoiceNumber() != null) {
            demandeImportateur.setInvoiceNumber(request.getInvoiceNumber());
        }
        if (request.getInvoiceDate() != null) {
            demandeImportateur.setInvoiceDate(LocalDate.parse(request.getInvoiceDate()));
        }
        if (request.getAmount() != null) {
            demandeImportateur.setAmount(request.getAmount());
        }
        if (request.getCurrency() != null) {
            demandeImportateur.setCurrency(request.getCurrency());
        }
        if (request.getIncoterm() != null) {
            demandeImportateur.setIncoterm(request.getIncoterm());
        }
        if (request.getTransportMode() != null) {
            demandeImportateur.setTransportMode(request.getTransportMode());
        }
        if (request.getLoadingPort() != null) {
            demandeImportateur.setLoadingPort(request.getLoadingPort());
        }
        if (request.getDischargePort() != null) {
            demandeImportateur.setDischargePort(request.getDischargePort());
        }
        if (request.getArrivalDate() != null) {
            demandeImportateur.setArrivalDate(LocalDate.parse(request.getArrivalDate()));
        }

        // 6. 🔥 NOUVEAU: Pour chaque nouveau fichier, supprimer l'ancien document du même type AVANT d'uploader
        if (files != null && !files.isEmpty()) {
            for (Map.Entry<String, MultipartFile> entry : files.entrySet()) {
                String documentTypeStr = entry.getKey();
                MultipartFile file = entry.getValue();

                if (file != null && !file.isEmpty()) {
                    DocumentType documentType;
                    try {
                        documentType = DocumentType.valueOf(documentTypeStr);
                    } catch (IllegalArgumentException e) {
                        log.warn("Type de document invalide: {}, utilisation de OTHER_DOCUMENT", documentTypeStr);
                        documentType = DocumentType.OTHER_DOCUMENT;
                    }

                    // Chercher et supprimer les documents existants du même type
                    List<Document> existingDocs = documentRepository.findByDemandeIdAndDocumentType(demandeId, documentType);
                    if (!existingDocs.isEmpty()) {
                        for (Document oldDoc : existingDocs) {
                            log.info("Remplacement du document existant ID: {} de type: {} pour la demande: {}",
                                    oldDoc.getId(), documentType, demandeId);
                            deleteDocumentSafely(oldDoc);
                        }
                    }

                    // Uploader le nouveau document
                    uploadDocument(demandeId, importateurId, file, documentTypeStr);
                }
            }
        }

        // 7. Supprimer les documents explicitement demandés (si nécessaire)
        if (documentsToDelete != null && !documentsToDelete.isEmpty()) {
            deleteSpecificDocuments(documentsToDelete, importateurId, demandeId);
        }

        // 8. Sauvegarder les modifications
        demandeImportateur = demandeImportateurRepository.save(demandeImportateur);


        log.info("Demande d'importation ID: {} modifiée avec succès", demandeId);

        return mapToDTO(demandeImportateur);
    }

    /**
     * Supprimer un document en toute sécurité (fichier physique + base de données)
     */
    private void deleteDocumentSafely(Document document) {
        try {
            // Supprimer le fichier physique
            String filePath = document.getFilePath();
            if (filePath != null && !filePath.isEmpty()) {
                Path path = Paths.get(filePath);
                if (Files.exists(path)) {
                    Files.delete(path);
                    log.info("Fichier physique supprimé: {}", filePath);
                } else {
                    log.warn("Fichier physique non trouvé: {}", filePath);
                }
            }
        } catch (IOException e) {
            log.error("Erreur lors de la suppression du fichier {}: {}", document.getFilePath(), e.getMessage());
            // On continue même si la suppression physique échoue
        }

        // Supprimer de la base de données
        documentRepository.delete(document);
        log.info("Document ID: {} supprimé de la base de données", document.getId());
    }

    /**
     * Supprimer des documents spécifiques
     */
    private void deleteSpecificDocuments(List<Long> documentIds, Long importateurId, Long demandeId) {
        for (Long documentId : documentIds) {
            Document document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé avec l'ID: " + documentId));

            // Vérifier que le document appartient à la demande
            if (!document.getDemande().getId().equals(demandeId)) {
                throw new RuntimeException("Le document n'appartient pas à cette demande");
            }

            // Supprimer le fichier physique
            try {
                String filePath = document.getFilePath();
                if (filePath != null && !filePath.isEmpty()) {
                    Path path = Paths.get(filePath);
                    if (Files.exists(path)) {
                        Files.delete(path);
                        log.info("Fichier physique supprimé: {}", filePath);
                    }
                }
            } catch (IOException e) {
                log.error("Erreur lors de la suppression du fichier: {}", e.getMessage());
            }

            // Supprimer de la base de données
            documentRepository.delete(document);
            log.info("Document ID: {} supprimé", documentId);
        }
    }


    /**
     * Supprimer une demande d'importation avec tous ses documents
     * @param demandeId ID de la demande à supprimer
     * @param importateurId ID de l'importateur (pour vérification des droits)
     */
    @Transactional
    public void deleteImportationDemande(Long demandeId, Long importateurId) {
        log.info("Suppression de la demande d'importation ID: {} par l'importateur ID: {}", demandeId, importateurId);

        // 1. Récupérer la demande
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec l'ID: " + demandeId));

        // 2. Vérifier que la demande appartient à l'importateur
        if (demande.getImportateur() == null || !demande.getImportateur().getId().equals(importateurId)) {
            throw new RuntimeException("Accès non autorisé: cette demande ne vous appartient pas");
        }

        // 3. Vérifier que la demande est en brouillon (seules les demandes en brouillon peuvent être supprimées)
        if (demande.getStatus() != DemandeStatus.BROUILLON) {
            throw new RuntimeException("Impossible de supprimer une demande qui n'est pas en brouillon. Statut actuel: " + demande.getStatus());
        }

        // 4. Récupérer et supprimer les documents physiques
        List<Document> documents = documentRepository.findByDemandeId(demandeId);
        deletePhysicalDocuments(documents);

        // 5. Supprimer les documents de la base de données
        if (!documents.isEmpty()) {
            documentRepository.deleteAll(documents);
            log.info("{} documents supprimés de la base de données", documents.size());
        }

        // 6. Supprimer les associations produit-demande
        List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demandeId);
        if (!demandeProduits.isEmpty()) {
            demandeProduitRepository.deleteAll(demandeProduits);
            log.info("{} associations produit-demande supprimées", demandeProduits.size());
        }


        // 8. Supprimer le répertoire des documents physiques
        deleteDocumentDirectory(demandeId);

        // 9. Supprimer la demande de la base de données
        demandeRepository.delete(demande);

        log.info("Demande d'importation ID: {} supprimée avec succès", demandeId);
    }

    /**
     * Supprimer les fichiers physiques des documents
     */
    private void deletePhysicalDocuments(List<Document> documents) {
        for (Document document : documents) {
            try {
                String filePath = document.getFilePath();
                if (filePath != null && !filePath.isEmpty()) {
                    Path path = Paths.get(filePath);
                    if (Files.exists(path)) {
                        Files.delete(path);
                        log.info("Fichier physique supprimé: {}", filePath);
                    } else {
                        log.warn("Fichier physique non trouvé: {}", filePath);
                    }
                }
            } catch (IOException e) {
                log.error("Erreur lors de la suppression du fichier {}: {}", document.getFilePath(), e.getMessage());
                // On continue la suppression même si un fichier pose problème
            }
        }
    }

    /**
     * Supprimer le répertoire des documents de la demande
     */
    private void deleteDocumentDirectory(Long demandeId) {
        String uploadDir = "uploads/importateur/documents/" + demandeId;
        Path uploadPath = Paths.get(uploadDir);

        try {
            if (Files.exists(uploadPath)) {
                // Supprimer récursivement tous les fichiers et sous-répertoires
                Files.walk(uploadPath)
                        .sorted(Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(file -> {
                            if (file.delete()) {
                                log.debug("Supprimé: {}", file.getAbsolutePath());
                            } else {
                                log.warn("Impossible de supprimer: {}", file.getAbsolutePath());
                            }
                        });
                log.info("Répertoire des documents supprimé: {}", uploadDir);
            }
        } catch (IOException e) {
            log.error("Erreur lors de la suppression du répertoire {}: {}", uploadDir, e.getMessage());
        }
    }

    private String generateReference() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uniqueId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return "IMP-" + dateStr + "-" + uniqueId;
    }



    private DemandeEnregistrementDTO mapToDTO(DemandeEnregistrement demande) {
        // Récupérer les produits via DemandeProduit
        List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
        List<ProduitDTO> products = demandeProduits.stream()
                .map(demandeProduit -> {
                    Product product = demandeProduit.getProduit();
                    return ProduitDTO.builder()
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
                            .processingType(product.getProductState())
                            .annualExportCapacity(product.getAnnualQuantityValue() != null &&
                                    product.getAnnualQuantityUnit() != null ?
                                    product.getAnnualQuantityValue() + " " +
                                            product.getAnnualQuantityUnit() : null)
                            .build();
                })
                .collect(Collectors.toList());

        List<Document> documents = documentRepository.findByDemandeId(demande.getId());
        List<DocumentDTO> documentDTOs = documents.stream()
                .map(this::convertToDocumentDTO)
                .collect(Collectors.toList());

        return DemandeEnregistrementDTO.builder()
                .id(demande.getId())
                .reference(demande.getReference())
                .status(demande.getStatus())
                .submittedAt(demande.getSubmittedAt())
                .paymentReference(demande.getPaymentReference())
                .paymentAmount(demande.getPaymentAmount())
                .paymentStatus(demande.getPaymentStatus())
                // CORRECTION: assignedTo attend un Long, pas un InstanceValidation
                .decisionDate(demande.getDecisionDate())
                .decisionComment(demande.getDecisionComment())
                .numeroAgrement(demande.getNumeroAgrement())
                .dateAgrement(demande.getDateAgrement() != null ?
                        demande.getDateAgrement().atStartOfDay() : null)
                .products(products)
                .documents(documentDTOs)
                .build();
    }


    /**
     * Map Document to DocumentDTO
     */
    private DocumentDTO convertToDocumentDTO(Document document) {
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
                .downloadUrl("/api/importateur/demandes/documents/" + document.getId() + "/telecharger")
                .build();
    }

    @Transactional
    public DocumentDTO uploadDocument(Long demandeId, Long importateurId, MultipartFile file, String documentTypeStr) {
        log.info("Upload du document pour la demande ID: {}", demandeId);

        // 1. Vérifier que la demande existe et appartient à l'importateur
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        if (demande.getImportateur() == null || !demande.getImportateur().getId().equals(importateurId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à ajouter des documents à cette demande");
        }

        // 2. Créer le répertoire
        String uploadDir = "uploads/importateur/documents/" + demandeId;
        Path uploadPath = Paths.get(uploadDir);
        try {
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la création du répertoire: " + e.getMessage());
        }

        // 3. Sauvegarder le fichier
        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String fileName = UUID.randomUUID().toString() + "_" + System.currentTimeMillis() + fileExtension;
        Path filePath = uploadPath.resolve(fileName);

        try {
            Files.copy(file.getInputStream(), filePath);
            log.info("Fichier sauvegardé: {}", filePath.toString());
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la sauvegarde du fichier: " + e.getMessage());
        }

        // 4. Convertir le type de document
        DocumentType documentType;
        try {
            documentType = DocumentType.valueOf(documentTypeStr);
        } catch (IllegalArgumentException e) {
            log.warn("Type de document invalide: {}, utilisation de OTHER_DOCUMENT", documentTypeStr);
            documentType = DocumentType.OTHER_DOCUMENT;
        }

        // 5. Récupérer le produit associé à la demande
        List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demandeId);
        Product product = null;
        if (!demandeProduits.isEmpty()) {
            product = demandeProduits.get(0).getProduit();
        }

        // 6. Créer et sauvegarder le document en base de données
        Document document = Document.builder()
                .fileName(originalFileName)
                .filePath(filePath.toString())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .documentType(documentType)
                .status(DocumentStatus.EN_ATTENTE)
                .uploadedAt(LocalDateTime.now())
                .demande(demande)
                .product(product)
                .build();

        if (demande.getExportateur() != null) {
            document.setExportateur(demande.getExportateur());
        }

        document = documentRepository.save(document);
        log.info("Document enregistré en base avec ID: {}", document.getId());

        // 7. Retourner le DTO
        return DocumentDTO.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .filePath(document.getFilePath())
                .fileType(document.getFileType())
                .fileSize(document.getFileSize())
                .documentType(document.getDocumentType())
                .status(document.getStatus())
                .uploadedAt(document.getUploadedAt())
                .downloadUrl("/api/importateur/demandes/documents/" + document.getId() + "/telecharger")
                .build();
    }

    // Ajouter cette méthode pour récupérer les demandes formatées pour le tracking
    public List<Map<String, Object>> getDemandesForTracking(Long importateurId) {
        log.info("Récupération des demandes formatées - Importateur ID: {}", importateurId);

        // Utiliser la version avec projection
        List<Map<String, Object>> results = demandeImportateurRepository
                .findTrackingDataProjection(importateurId);

        log.info("Nombre de demandes trouvées: {}", results.size());
        return results;
    }
}