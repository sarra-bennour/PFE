package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.produits.ProduitDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.dto.validation.ValidationSummaryDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.DocumentStatus;
import com.tunisia.commerce.enums.PaymentStatus;
import com.tunisia.commerce.enums.TypeDemandeur;
import com.tunisia.commerce.exception.ValidationException;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.DemandeHistoryRepository;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.ValidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
public class ValidationServiceImpl implements ValidationService {

    private final DemandeEnregistrementRepository demandeRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DemandeHistoryRepository historyRepository;

    /**
     * Récupérer toutes les demandes avec filtres
     */
    @Override
    public List<DemandeEnregistrementDTO> getAllDemandes(String type, String status) {
        log.info("Récupération des demandes - Type: {}, Status: {}", type, status);

        List<DemandeEnregistrement> demandes;

        // Filtrer par type de demandeur (EXPORTATEUR ou IMPORTATEUR)
        if (type != null && !type.isEmpty() && !"ALL".equals(type)) {
            try {
                TypeDemandeur typeDemandeur = TypeDemandeur.valueOf(type);
                demandes = demandeRepository.findByTypeDemandeur(typeDemandeur);
            } catch (IllegalArgumentException e) {
                demandes = demandeRepository.findAll();
            }
        } else {
            demandes = demandeRepository.findAll();
        }

        // 🔥 FILTRER PAR STATUT DE PAIEMENT - Garder uniquement les paiements valides
        demandes = demandes.stream()
                .filter(d -> d.getPaymentStatus() == PaymentStatus.REUSSI)
                .collect(Collectors.toList());

        // Filtrer par statut de la demande
        if (status != null && !status.isEmpty() && !"ALL".equals(status)) {
            try {
                DemandeStatus demandeStatus = DemandeStatus.valueOf(status);
                demandes = demandes.stream()
                        .filter(d -> d.getStatus() == demandeStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                // Statut invalide, garder tous
            }
        }

        // Trier par date de soumission (plus récent en premier)
        demandes.sort((d1, d2) -> {
            if (d1.getSubmittedAt() == null && d2.getSubmittedAt() == null) return 0;
            if (d1.getSubmittedAt() == null) return 1;
            if (d2.getSubmittedAt() == null) return -1;
            return d2.getSubmittedAt().compareTo(d1.getSubmittedAt());
        });

        return demandes.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Récupérer les demandes par type (DOS-, DEM-, IMP-)
     */
    @Override
    public List<DemandeEnregistrementDTO> getDemandesByReferencePrefix(String prefix, String status) {
        log.info("Récupération des demandes avec préfixe: {}, status: {}", prefix, status);

        List<DemandeEnregistrement> demandes = demandeRepository.findAll();

        // Filtrer par préfixe de référence
        demandes = demandes.stream()
                .filter(d -> d.getReference() != null && d.getReference().startsWith(prefix))
                .collect(Collectors.toList());

        // Filtrer par statut
        if (status != null && !status.isEmpty() && !"ALL".equals(status)) {
            try {
                DemandeStatus demandeStatus = DemandeStatus.valueOf(status);
                demandes = demandes.stream()
                        .filter(d -> d.getStatus() == demandeStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                // Statut invalide
            }
        }

        return demandes.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Récupérer une demande par son ID
     */
    @Override
    public DemandeEnregistrementDTO getDemandeById(Long id) {
        log.info("Récupération de la demande ID: {}", id);

        DemandeEnregistrement demande = demandeRepository.findById(id)
                .orElseThrow(() -> new ValidationException("DEMANDE_NOT_FOUND", "Demande non trouvée avec l'ID: " + id));

        return mapToDTO(demande);
    }

    /**
     * Approuver une demande
     */
    @Override
    @Transactional
    public DemandeEnregistrementDTO approveDemande(Long demandeId, Long agentId, String comment) {
        log.info("Approbation de la demande ID: {} par l'agent ID: {}", demandeId, agentId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new ValidationException("DEMANDE_NOT_FOUND", "Demande non trouvée avec l'ID: " + demandeId));

        // Vérifier que la demande est en statut SOUMISE
        if (demande.getStatus() != DemandeStatus.SOUMISE && demande.getStatus() != DemandeStatus.EN_ATTENTE_INFO) {
            throw new ValidationException("INVALID_STATUS",
                    "Seules les demandes soumises ou en attente d'informations peuvent être approuvées. Statut actuel: " + demande.getStatus());
        }

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND", "Agent non trouvé avec l'ID: " + agentId));

        DemandeStatus oldStatus = demande.getStatus();

        // Générer le numéro d'agrément pour les demandes exportateur
        if (demande.getTypeDemandeur() == TypeDemandeur.EXPORTATEUR) {
            String numeroAgrement = generateAgrementNumber();
            demande.setNumeroAgrement(numeroAgrement);
            demande.setDateAgrement(LocalDateTime.now().toLocalDate());
            log.info("Agrément généré pour la demande {}: {}", demande.getReference(), numeroAgrement);
        }

        // 🔥 NOUVEAU : Valider automatiquement tous les documents en attente
        validatePendingDocumentsForDemande(demandeId, agentId, DocumentStatus.VALIDE,
                "Document automatiquement validé suite à l'approbation de la demande");

        // Mettre à jour la demande
        demande.setStatus(DemandeStatus.VALIDEE);
        demande.setDecisionDate(LocalDateTime.now());
        demande.setDecisionComment(comment);
        demande.setAssignedTo(agentId);

        demande = demandeRepository.save(demande);

        // Ajouter l'historique
        addHistory(demande, oldStatus, DemandeStatus.VALIDEE, "APPROUVE",
                "Demande approuvée. " + (comment != null ? comment : ""), agent);

        log.info("Demande {} approuvée avec succès", demande.getReference());

        return mapToDTO(demande);
    }

    /**
     * Rejeter une demande
     */
    @Override
    @Transactional
    public DemandeEnregistrementDTO rejectDemande(Long demandeId, Long agentId, String reason) {
        log.info("Rejet de la demande ID: {} par l'agent ID: {}", demandeId, agentId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new ValidationException("DEMANDE_NOT_FOUND", "Demande non trouvée avec l'ID: " + demandeId));

        // Vérifier que la demande est en statut SOUMISE
        if (demande.getStatus() != DemandeStatus.SOUMISE) {
            throw new ValidationException("INVALID_STATUS",
                    "Seules les demandes soumises peuvent être rejetées. Statut actuel: " + demande.getStatus());
        }

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND", "Agent non trouvé avec l'ID: " + agentId));

        DemandeStatus oldStatus = demande.getStatus();

        // 🔥 NOUVEAU : Rejeter automatiquement tous les documents en attente
        validatePendingDocumentsForDemande(demandeId, agentId, DocumentStatus.REJETE,
                "Document automatiquement rejeté suite au rejet de la demande. Raison: " + reason);

        // Mettre à jour la demande
        demande.setStatus(DemandeStatus.REJETEE);
        demande.setDecisionDate(LocalDateTime.now());
        demande.setDecisionComment(reason);
        demande.setAssignedTo(agentId);

        demande = demandeRepository.save(demande);

        // Ajouter l'historique
        addHistory(demande, oldStatus, DemandeStatus.REJETEE, "REJETE",
                "Demande rejetée. Raison: " + reason, agent);

        log.info("Demande {} rejetée", demande.getReference());

        return mapToDTO(demande);
    }

    /**
     * Demander plus d'informations pour une demande
     */
    @Override
    @Transactional
    public DemandeEnregistrementDTO requestMoreInfo(Long demandeId, Long agentId, String comment) {
        log.info("Demande d'informations supplémentaires pour la demande ID: {} par l'agent ID: {}", demandeId, agentId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new ValidationException("DEMANDE_NOT_FOUND", "Demande non trouvée avec l'ID: " + demandeId));

        // Vérifier que la demande est en statut SOUMISE
        if (demande.getStatus() != DemandeStatus.SOUMISE) {
            throw new ValidationException("INVALID_STATUS",
                    "Seules les demandes soumises peuvent être mises en attente d'informations. Statut actuel: " + demande.getStatus());
        }

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND", "Agent non trouvé avec l'ID: " + agentId));

        DemandeStatus oldStatus = demande.getStatus();

        // 🔥 NOUVEAU : Marquer tous les documents en attente comme "A_COMPLETER"
        validatePendingDocumentsForDemande(demandeId, agentId, DocumentStatus.A_COMPLETER,
                "Des informations complémentaires sont requises: " + comment);

        // Mettre à jour la demande
        demande.setStatus(DemandeStatus.EN_ATTENTE_INFO);
        demande.setDecisionComment(comment);
        demande.setAssignedTo(agentId);

        demande = demandeRepository.save(demande);

        // Ajouter l'historique
        addHistory(demande, oldStatus, DemandeStatus.EN_ATTENTE_INFO, "INFO_REQUISE",
                "Informations complémentaires requises: " + comment, agent);

        log.info("Demande d'informations envoyée pour la demande {}", demande.getReference());

        return mapToDTO(demande);
    }

    /**
     * Valider un document individuel
     */
    @Override
    @Transactional
    public Document validateDocument(Long documentId, Long agentId, String status, String comment) {
        log.info("Validation du document ID: {} par l'agent ID: {} - Statut: {}", documentId, agentId, status);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ValidationException("DOCUMENT_NOT_FOUND", "Document non trouvé avec l'ID: " + documentId));

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND", "Agent non trouvé avec l'ID: " + agentId));

        DocumentStatus newStatus;
        try {
            newStatus = DocumentStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("INVALID_STATUS", "Statut de document invalide: " + status);
        }

        document.setStatus(newStatus);
        document.setValidationComment(comment);
        document.setValidatedAt(LocalDateTime.now());
        document.setValidatedBy(agent);

        document = documentRepository.save(document);

        log.info("Document {} validé avec statut: {}", document.getFileName(), newStatus);

        return document;
    }

    /**
     * Récupérer les statistiques de validation
     */
    @Override
    public ValidationSummaryDTO getValidationSummary() {
        log.info("Récupération du résumé des validations");

        List<DemandeEnregistrement> allDemandes = demandeRepository.findAll();

        long totalDemandes = allDemandes.size();
        long pendingDemandes = allDemandes.stream()
                .filter(d -> d.getStatus() == DemandeStatus.SOUMISE)
                .count();
        long approvedDemandes = allDemandes.stream()
                .filter(d -> d.getStatus() == DemandeStatus.VALIDEE)
                .count();
        long rejectedDemandes = allDemandes.stream()
                .filter(d -> d.getStatus() == DemandeStatus.REJETEE)
                .count();
        long moreInfoDemandes = allDemandes.stream()
                .filter(d -> d.getStatus() == DemandeStatus.EN_ATTENTE_INFO)
                .count();

        // Statistiques par type de demande
        long exportateurDemandes = allDemandes.stream()
                .filter(d -> d.getTypeDemandeur() == TypeDemandeur.EXPORTATEUR)
                .count();
        long importateurDemandes = allDemandes.stream()
                .filter(d -> d.getTypeDemandeur() == TypeDemandeur.IMPORTATEUR)
                .count();

        // Statistiques par préfixe
        long dossierConformite = allDemandes.stream()
                .filter(d -> d.getReference() != null && d.getReference().startsWith("DOS-"))
                .count();
        long declarationProduits = allDemandes.stream()
                .filter(d -> d.getReference() != null && d.getReference().startsWith("DEM-"))
                .count();
        long demandeImportation = allDemandes.stream()
                .filter(d -> d.getReference() != null && d.getReference().startsWith("IMP-"))
                .count();

        return ValidationSummaryDTO.builder()
                .totalDemandes(totalDemandes)
                .pendingDemandes(pendingDemandes)
                .approvedDemandes(approvedDemandes)
                .rejectedDemandes(rejectedDemandes)
                .moreInfoDemandes(moreInfoDemandes)
                .exportateurDemandes(exportateurDemandes)
                .importateurDemandes(importateurDemandes)
                .dossierConformite(dossierConformite)
                .declarationProduits(declarationProduits)
                .demandeImportation(demandeImportation)
                .build();
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private String generateAgrementNumber() {
        String year = String.valueOf(LocalDateTime.now().getYear());
        String random = String.format("%06d", new Random().nextInt(1000000));
        return "AGR-" + year + "-" + random;
    }

    private void addHistory(DemandeEnregistrement demande, DemandeStatus oldStatus,
                            DemandeStatus newStatus, String action, String comment, User performedBy) {
        com.tunisia.commerce.entity.DemandeHistory history =
                com.tunisia.commerce.entity.DemandeHistory.builder()
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
        // Récupérer le nom du demandeur à partir de l'entité
        String applicantName = "";
        String applicantType = "";

        if (demande.getExportateur() != null) {
            applicantName = demande.getExportateur().getRaisonSociale();
            applicantType = "EXPORTATEUR";
        } else if (demande.getImportateur() != null) {
            applicantName = demande.getImportateur().getPrenom() + " " + demande.getImportateur().getNom();
            applicantType = "IMPORTATEUR";
        }

        // Déterminer le préfixe pour déterminer le type de demande
        String reference = demande.getReference();
        String requestType = "REGISTRATION"; // DOS- par défaut
        if (reference != null) {
            if (reference.startsWith("DEM-")) {
                requestType = "PRODUCT_DECLARATION";
            } else if (reference.startsWith("IMP-")) {
                requestType = "IMPORT";
            }
        }

        // Récupérer les détails spécifiques pour les demandes d'importation
        String invoiceNumber = null;
        LocalDate invoiceDate = null;
        BigDecimal amount = null;
        String currency = null;
        String incoterm = null;
        String transportMode = null;
        String loadingPort = null;
        String dischargePort = null;
        LocalDate arrivalDate = null;

        if (demande instanceof DemandeImportateur) {
            DemandeImportateur impDemande = (DemandeImportateur) demande;
            invoiceNumber = impDemande.getInvoiceNumber();
            invoiceDate = impDemande.getInvoiceDate();
            amount = impDemande.getAmount();
            currency = impDemande.getCurrency();
            incoterm = impDemande.getIncoterm();
            transportMode = impDemande.getTransportMode();
            loadingPort = impDemande.getLoadingPort();
            dischargePort = impDemande.getDischargePort();
            arrivalDate = impDemande.getArrivalDate();
        }

        // Récupérer les produits
        List<ProduitDTO> products = new ArrayList<>();
        if (demande.getDemandeProduits() != null) {
            products = demande.getDemandeProduits().stream()
                    .map(dp -> {
                        Product p = dp.getProduit();
                        return ProduitDTO.builder()
                                .id(p.getId())
                                .productType(p.getProductType())
                                .category(p.getCategory())
                                .hsCode(p.getHsCode())
                                .productName(p.getProductName())
                                .brandName(p.getBrandName())
                                .originCountry(p.getOriginCountry())
                                .commercialBrandName(p.getCommercialBrandName())
                                .productState(p.getProductState())
                                .annualQuantityValue(p.getAnnualQuantityValue())
                                .annualQuantityUnit(p.getAnnualQuantityUnit())
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        // Récupérer les documents
        List<DocumentDTO> documents = new ArrayList<>();
        if (demande.getId() != null) {
            List<Document> docs = documentRepository.findByDemandeId(demande.getId());
            documents = docs.stream()
                    .map(this::convertToDocumentDTO)
                    .collect(Collectors.toList());
        }

        // Construire le DTO
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
                .dateAgrement(demande.getDateAgrement() != null ? demande.getDateAgrement().atStartOfDay() : null)
                // Champs importation
                .invoiceNumber(invoiceNumber)
                .invoiceDate(invoiceDate)
                .amount(amount)
                .currency(currency)
                .incoterm(incoterm)
                .transportMode(transportMode)
                .loadingPort(loadingPort)
                .dischargePort(dischargePort)
                .arrivalDate(arrivalDate)
                // Lists
                .products(products)
                .documents(documents)
                .build();
    }

    @Override
    public org.springframework.core.io.Resource getDocumentFile(Long documentId, Long agentId) {
        log.info("Récupération du fichier du document ID: {} pour l'agent ID: {}", documentId, agentId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ValidationException("DOCUMENT_NOT_FOUND", "Document non trouvé avec l'ID: " + documentId));

        // Vérifier que l'agent a accès à ce document (optionnel)
        // Vous pouvez ajouter des vérifications ici

        try {
            Path filePath = Paths.get(document.getFilePath());
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ValidationException("FILE_NOT_FOUND", "Le fichier n'existe pas ou n'est pas accessible");
            }
        } catch (Exception e) {
            throw new ValidationException("FILE_READ_ERROR", "Erreur lors de la lecture du fichier: " + e.getMessage());
        }
    }

    @Override
    public DocumentDTO getDocumentDTOById(Long documentId, Long agentId) {
        log.info("Récupération des infos du document ID: {} pour l'agent ID: {}", documentId, agentId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ValidationException("DOCUMENT_NOT_FOUND", "Document non trouvé avec l'ID: " + documentId));

        return convertToDocumentDTO(document);
    }

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
                .downloadUrl("/api/validation/documents/" + document.getId() + "/telecharger")
                .build();
    }

    /**
     * Valide tous les documents en attente pour une demande donnée
     * @param demandeId ID de la demande
     * @param agentId ID de l'agent qui effectue la validation
     * @param targetStatus Statut à appliquer aux documents en attente
     * @param defaultComment Commentaire par défaut
     */
    private void validatePendingDocumentsForDemande(Long demandeId, Long agentId,
                                                    DocumentStatus targetStatus,
                                                    String defaultComment) {
        log.info("Validation automatique des documents en attente pour la demande {} vers le statut {}",
                demandeId, targetStatus);

        // 🔥 Récupérer UNIQUEMENT les documents EN_ATTENTE (PENDING)
        List<Document> pendingDocuments = documentRepository.findByDemandeIdAndStatus(
                demandeId, DocumentStatus.EN_ATTENTE);

        if (pendingDocuments.isEmpty()) {
            log.info("Aucun document en attente pour la demande {}", demandeId);
            return;
        }

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND",
                        "Agent non trouvé avec l'ID: " + agentId));

        for (Document doc : pendingDocuments) {
            // 🔥 Vérifier que le document est toujours EN_ATTENTE avant de le modifier
            if (doc.getStatus() == DocumentStatus.EN_ATTENTE) {
                doc.setStatus(targetStatus);
                doc.setValidationComment(defaultComment);
                doc.setValidatedAt(LocalDateTime.now());
                doc.setValidatedBy(agent);
                documentRepository.save(doc);
                log.info("Document {} (ID: {}) automatiquement passé en statut {}",
                        doc.getFileName(), doc.getId(), targetStatus);
            } else {
                log.info("Document {} (ID: {}) déjà en statut {}, ignoré",
                        doc.getFileName(), doc.getId(), doc.getStatus());
            }
        }
    }
}