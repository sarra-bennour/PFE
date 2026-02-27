package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.produits.*;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.*;
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
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.UUID;
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

    private static final String REFERENCE_PREFIX = "DEC";
    private static final String UPLOAD_DIR = "uploads/documents/";

    @Transactional
    public DemandeEnregistrementDTO createDemande(DemandeEnregistrementRequestDTO request) {
        log.info("Création d'une nouvelle demande d'enregistrement pour l'exportateur ID: {}", request.getExportateurId());

        // Récupérer l'exportateur
        ExportateurEtranger exportateur = exportateurRepository.findById(request.getExportateurId())
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé avec ID: " + request.getExportateurId()));

        // Vérifier si l'exportateur a déjà une demande en cours
        long pendingDemandes = demandeRepository.countByExportateurIdAndStatus(
                exportateur.getId(), DemandeStatus.EN_ATTENTE);

        if (pendingDemandes > 0) {
            throw new RuntimeException("Vous avez déjà une demande en cours de traitement");
        }

        // Créer la demande
        DemandeEnregistrement demande = DemandeEnregistrement.builder()
                .exportateur(exportateur)
                .reference(generateReference())
                .status(DemandeStatus.BROUILLON)
                .submittedAt(null)
                .paymentStatus(PaymentStatus.EN_ATTENTE)
                .build();

        demande = demandeRepository.save(demande);

        // Sauvegarder les produits avec tous les champs
        for (ProductRequestDTO productRequest : request.getProducts()) {
            Product product = mapToEntity(productRequest, exportateur);
            productRepository.save(product);
        }

        // Ajouter l'historique
        addHistory(demande, null, DemandeStatus.BROUILLON, "CRÉATION",
                "Demande créée avec succès", exportateur);

        log.info("Demande créée avec succès, référence: {}", demande.getReference());
        return mapToDTO(demande);
    }

    /**
     * Map ProductRequestDTO to Product entity
     */
    private Product mapToEntity(ProductRequestDTO dto, ExportateurEtranger exportateur) {
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
                .exportateur(exportateur)
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
                throw new RuntimeException("Type de document invalide: " + documentTypeStr);
            }

            // 5. Récupérer le produit si spécifié
            Product product = null;
            if (productId != null) {
                product = productRepository.findById(productId)
                        .orElseThrow(() -> new RuntimeException("Produit non trouvé avec ID: " + productId));

                // Vérifier que le produit appartient à l'exportateur
                if (!product.getExportateur().getId().equals(exportateurId)) {
                    throw new RuntimeException("Ce produit ne vous appartient pas");
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

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + demandeId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec ID: " + userId));

        // Vérifier que la demande appartient à l'utilisateur
        if (!demande.getExportateur().getId().equals(userId)) {
            throw new RuntimeException("Accès non autorisé");
        }

        // Vérifier que tous les documents obligatoires sont présents et uploadés
        validateRequiredDocuments(demande);

        DemandeStatus oldStatus = demande.getStatus();

        // Mettre à jour le statut
        demande.setStatus(DemandeStatus.SOUMISE);
        demande.setSubmittedAt(LocalDateTime.now());

        demande = demandeRepository.save(demande);

        addHistory(demande, oldStatus, DemandeStatus.SOUMISE, "SOUMISSION",
                "Demande soumise pour validation", user);

        log.info("Demande soumise avec succès, ID: {}", demandeId);
        return mapToDTO(demande);
    }

    @Transactional
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
    }

    @Transactional
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
    }

    public DemandeEnregistrementDTO getDemandeById(Long demandeId) {
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + demandeId));

        return mapToDTO(demande);
    }

    public List<DemandeEnregistrementDTO> getDemandesByExportateur(Long exportateurId) {
        return demandeRepository.findByExportateurId(exportateurId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<DemandeEnregistrementDTO> getDemandesByStatus(DemandeStatus status) {
        return demandeRepository.findByStatus(status).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Récupérer un document par son ID
     */
    public DocumentDTO getDocumentById(Long documentId, Long exportateurId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document non trouvé avec l'ID: " + documentId));

        // Vérifier que le document appartient bien à l'exportateur
        if (!document.getExportateur().getId().equals(exportateurId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à accéder à ce document");
        }

        return convertToDTO(document);
    }

    /**
     * Récupérer le fichier du document
     */
    public org.springframework.core.io.Resource getDocumentFile(Long documentId, Long exportateurId) {
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
    }

    private void validateRequiredDocuments(DemandeEnregistrement demande) {
        List<Document> documents = documentRepository.findByDemandeId(demande.getId());
        List<Product> products = productRepository.findByExportateurId(demande.getExportateur().getId());

        for (Product product : products) {
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

    private String generateAgrementNumber() {
        String year = String.valueOf(LocalDateTime.now().getYear());
        String random = String.format("%06d", new Random().nextInt(1000000));
        return "AGR-" + year + "-" + random;
    }

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
        List<Product> products = productRepository.findByExportateurId(demande.getExportateur().getId());
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
                .exportateur(mapExportateurToDTO(demande.getExportateur()))
                .products(mapProductsToDTO(products))
                .documents(documents.stream().map(this::convertToDTO).collect(Collectors.toList()))
                .history(history.stream().map(this::mapHistoryToDTO).collect(Collectors.toList()))
                .build();
    }

    private UserDTO mapExportateurToDTO(ExportateurEtranger exportateur) {
        UserDTO dto = new UserDTO();
        dto.setId(exportateur.getId());
        dto.setNom(exportateur.getNom());
        dto.setPrenom(exportateur.getPrenom());
        dto.setEmail(exportateur.getEmail());
        dto.setTelephone(exportateur.getTelephone());
        dto.setRole(exportateur.getRole());
        dto.setStatut(exportateur.getStatut());
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
    }

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