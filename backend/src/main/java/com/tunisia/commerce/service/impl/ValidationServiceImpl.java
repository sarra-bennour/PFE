package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.produits.ProduitDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.dto.validation.ValidationSummaryDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.exception.ValidationException;
import com.tunisia.commerce.repository.*;
import com.tunisia.commerce.service.ValidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final InstanceValidationRepository instanceValidationRepository;
    private final DemandeValidateurRepository demandeValidateurRepository;
    private final StructureCompetenceRepository structureCompetenceRepository;

    // ==================== MÉTHODES PRINCIPALES ====================

    /**
     * Récupérer toutes les demandes (pour ADMIN)
     */
    @Override
    public List<DemandeEnregistrementDTO> getAllDemandes(String type, String status) {
        log.info("Récupération de toutes les demandes - Type: {}, Status: {}", type, status);

        List<DemandeEnregistrement> demandes = getFilteredDemandes(type, status);

        return demandes.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * ✅ NOUVELLE MÉTHODE : Récupérer les demandes assignées à une instance spécifique
     */
    @Override
    public List<DemandeEnregistrementDTO> getDemandesByInstance(Long instanceId, String type, String status) {
        log.info("=== getDemandesByInstance DEBUG ===");
        log.info("instanceId: {}", instanceId);

        // 1. Récupérer l'instance
        InstanceValidation instance = instanceValidationRepository.findById(instanceId)
                .orElseThrow(() -> new ValidationException("INSTANCE_NOT_FOUND", "Instance non trouvée"));

        log.info("Instance structureId: {}", instance.getStructure().getId());

        // 2. Récupérer TOUS les validateurs pour cette instance
        List<DemandeValidateur> myValidations = demandeValidateurRepository.findByInstanceId(instanceId);
        log.info("Nombre de validations trouvées: {}", myValidations.size());

        // 3. Filtrer les demandes
        List<DemandeEnregistrement> demandes = new ArrayList<>();

        for (DemandeValidateur validation : myValidations) {
            DemandeEnregistrement demande = validation.getDemande();
            log.info("--- Traitement demande: {} ---", demande.getReference());
            log.info("  Statut demande: {}", demande.getStatus());
            log.info("  Payment status: {}", demande.getPaymentStatus());
            log.info("  Ma validation status: {}", validation.getValidationStatus());
            log.info("  Mon validation order: {}", validation.getValidationOrder());

            // Vérifier paiement
            if (demande.getPaymentStatus() != PaymentStatus.REUSSI) {
                log.info("  ❌ Rejetée: paiement non réussi");
                continue;
            }

            // Vérifier que je n'ai pas déjà validé
            if (validation.getValidationStatus() == ValidationStatus.VALIDEE) {
                log.info("  ❌ Rejetée: déjà validée par moi");
                continue;
            }

            // Vérifier que la demande n'est pas terminée
            if (demande.getStatus() == DemandeStatus.VALIDEE || demande.getStatus() == DemandeStatus.REJETEE) {
                log.info("  ❌ Rejetée: demande terminée");
                continue;
            }

            // 🔥 CORRECTION IMPORTANTE: Vérifier les validateurs précédents
            List<DemandeValidateur> allValidations = demandeValidateurRepository.findByDemandeId(demande.getId());

            boolean previousValidatorsApproved = true;
            for (DemandeValidateur other : allValidations) {
                // Si c'est un validateur avec un ordre inférieur au mien ET qu'il n'a pas validé
                if (other.getValidationOrder() < validation.getValidationOrder()
                        && other.getValidationStatus() != ValidationStatus.VALIDEE) {
                    previousValidatorsApproved = false;
                    log.info("  ❌ Validateur précédent non validé: order={}, status={}, structure={}",
                            other.getValidationOrder(),
                            other.getValidationStatus(),
                            other.getStructure().getOfficialName());
                    break;
                }
            }

            if (!previousValidatorsApproved) {
                log.info("  ❌ Rejetée: validateur précédent non approuvé");
                continue;
            }

            // ✅ Tous les critères sont remplis
            log.info("  ✅ Demande ajoutée à la liste");
            demandes.add(demande);
        }

        log.info("=== FIN - {} demandes trouvées ===", demandes.size());

        // Appliquer les filtres supplémentaires
        if (status != null && !status.isEmpty() && !"ALL".equals(status)) {
            try {
                DemandeStatus demandeStatus = DemandeStatus.valueOf(status);
                demandes = demandes.stream()
                        .filter(d -> d.getStatus() == demandeStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                log.warn("Statut invalide: {}", status);
            }
        }

        if (type != null && !type.isEmpty() && !"ALL".equals(type)) {
            try {
                TypeDemandeur typeDemandeur = TypeDemandeur.valueOf(type);
                demandes = demandes.stream()
                        .filter(d -> {
                            if (typeDemandeur == TypeDemandeur.EXPORTATEUR) {
                                return d.getExportateur() != null;
                            } else if (typeDemandeur == TypeDemandeur.IMPORTATEUR) {
                                return d.getImportateur() != null;
                            }
                            return true;
                        })
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                log.warn("Type invalide: {}", type);
            }
        }

        // Trier par date de soumission
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
     * Récupère l'ordre de validation pour une structure
     */
    private Integer getValidationOrderForStructure(StructureInterne structure) {
        // Récupérer l'ordre minimum pour cette structure (généralement le même pour toutes les catégories)
        List<StructureCompetence> competences = structureCompetenceRepository
                .findByStructure(structure);

        if (competences.isEmpty()) {
            return 99; // Ordre élevé si aucune compétence trouvée
        }

        // Prendre l'ordre minimum (le plus petit)
        return competences.stream()
                .map(StructureCompetence::getValidationOrder)
                .filter(Objects::nonNull)
                .min(Integer::compareTo)
                .orElse(99);
    }

    /**
     * ✅ NOUVELLE MÉTHODE : Compter les demandes en attente pour une instance
     */
    @Override
    public long countPendingDemandesByInstance(Long instanceId) {
        return demandeValidateurRepository.countByInstanceIdAndValidationStatus(instanceId, ValidationStatus.EN_ATTENTE);
    }

    /**
     * Méthode utilitaire pour filtrer les demandes (utilisée par l'admin)
     */
    private List<DemandeEnregistrement> getFilteredDemandes(String type, String status) {
        List<DemandeEnregistrement> demandes;

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

        // Filtrer par paiement réussi
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
                // Statut invalide
            }
        }

        demandes.sort((d1, d2) -> {
            if (d1.getSubmittedAt() == null && d2.getSubmittedAt() == null) return 0;
            if (d1.getSubmittedAt() == null) return 1;
            if (d2.getSubmittedAt() == null) return -1;
            return d2.getSubmittedAt().compareTo(d1.getSubmittedAt());
        });

        return demandes;
    }

    /**
     * ✅ CORRIGÉ: Approbation d'une demande avec gestion multi-validateurs
     */
    @Override
    @Transactional
    public DemandeEnregistrementDTO approveDemande(Long demandeId, Long agentId, String comment) {
        log.info("Approbation partielle de la demande ID: {} par l'agent ID: {}", demandeId, agentId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new ValidationException("DEMANDE_NOT_FOUND", "Demande non trouvée"));

        InstanceValidation agent = instanceValidationRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND", "Agent non trouvé"));

        DemandeValidateur validation = demandeValidateurRepository
                .findByDemandeIdAndInstanceId(demandeId, agentId)
                .orElseThrow(() -> new ValidationException("VALIDATION_NOT_FOUND",
                        "Cette demande n'est pas assignée à cet agent"));

        if (validation.getValidationStatus() != ValidationStatus.EN_ATTENTE) {
            throw new ValidationException("ALREADY_VALIDATED",
                    "Cette validation a déjà été traitée. Statut actuel: " + validation.getValidationStatus());
        }

        if (demande.getStatus() == DemandeStatus.VALIDEE || demande.getStatus() == DemandeStatus.REJETEE) {
            throw new ValidationException("DEMANDE_ALREADY_CLOSED",
                    "La demande est déjà " + demande.getStatus());
        }

        // ✅ Valider les documents autorisés IMMÉDIATEMENT
        Set<String> allowedDocTypes = getAllowedDocumentTypesForStructure(agent.getStructure());
        validateVisibleDocumentsForDemande(demandeId, agentId, DocumentStatus.VALIDE,
                "Document validé par " + agent.getStructure().getOfficialName() + (comment != null ? ": " + comment : ""),
                allowedDocTypes);

        validation.approve(comment);
        demandeValidateurRepository.save(validation);
        log.info("✅ Agent {} a approuvé la demande {}", agent.getEmail(), demande.getReference());

        boolean allMandatoryApproved = isAllMandatoryValidatorsApproved(demande);
        boolean hasMandatoryRejection = hasMandatoryRejection(demande);

        if (hasMandatoryRejection) {
            demande.setStatus(DemandeStatus.REJETEE);
            demande.setDecisionDate(LocalDateTime.now());
            demande.setDecisionComment("Demande rejetée par " + agent.getStructure().getOfficialName() + ": " + comment);
            log.warn("❌ Demande {} rejetée par validateur obligatoire", demande.getReference());
        }
        else if (allMandatoryApproved) {
            if (demande.getTypeDemande() == TypeDemande.REGISTRATION ||
                    demande.getTypeDemande() == TypeDemande.PRODUCT_DECLARATION) {
                String numeroAgrement = generateAgrementNumber();
                demande.setNumeroAgrement(numeroAgrement);
                demande.setDateAgrement(LocalDateTime.now().toLocalDate());
                log.info("🏆 Agrément généré pour la demande {}: {}", demande.getReference(), numeroAgrement);
            }

            demande.setStatus(DemandeStatus.VALIDEE);
            demande.setDecisionDate(LocalDateTime.now());
            demande.setDecisionComment("Tous les validateurs ont approuvé. " + comment);
            log.info("🎉 Demande {} complètement approuvée !", demande.getReference());
        }
        else {
            demande.setStatus(DemandeStatus.EN_COURS_VALIDATION);
            log.info("⏳ Demande {} en attente d'autres validateurs", demande.getReference());
        }

        demande = demandeRepository.save(demande);
        return mapToDTO(demande);
    }

    /**
     * ✅ CORRIGÉ: Rejet d'une demande par un validateur
     */
    @Override
    @Transactional
    public DemandeEnregistrementDTO rejectDemande(Long demandeId, Long agentId, String reason) {
        log.info("Rejet de la demande ID: {} par l'agent ID: {}", demandeId, agentId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new ValidationException("DEMANDE_NOT_FOUND", "Demande non trouvée"));

        InstanceValidation agent = instanceValidationRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND", "Agent non trouvé"));

        DemandeValidateur validation = demandeValidateurRepository
                .findByDemandeIdAndInstanceId(demandeId, agentId)
                .orElseThrow(() -> new ValidationException("VALIDATION_NOT_FOUND",
                        "Cette demande n'est pas assignée à cet agent"));

        if (validation.getValidationStatus() != ValidationStatus.EN_ATTENTE) {
            throw new ValidationException("ALREADY_VALIDATED",
                    "Cette validation a déjà été traitée");
        }

        validation.reject(reason);
        demandeValidateurRepository.save(validation);
        log.info("❌ Agent {} a rejeté la demande {}", agent.getEmail(), demande.getReference());

        // ✅ Rejeter les documents autorisés
        Set<String> allowedDocTypes = getAllowedDocumentTypesForStructure(agent.getStructure());
        validateVisibleDocumentsForDemande(demandeId, agentId, DocumentStatus.REJETE,
                "Document rejeté par " + agent.getStructure().getOfficialName() + ". Raison: " + reason,
                allowedDocTypes);

        demande.setStatus(DemandeStatus.REJETEE);
        demande.setDecisionDate(LocalDateTime.now());
        demande.setDecisionComment("Rejeté par " + agent.getStructure().getOfficialName() + ": " + reason);

        demande = demandeRepository.save(demande);

        User userAgent = agent;
        addHistory(demande, validation.getValidationStatus().name(), "REJETE",
                "REJET", "Demande rejetée par " + agent.getStructure().getOfficialName() +
                        ": " + reason, userAgent);

        return mapToDTO(demande);
    }

    /**
     * Demander plus d'informations
     */
    @Override
    @Transactional
    public DemandeEnregistrementDTO requestMoreInfo(Long demandeId, Long agentId, String comment) {
        log.info("Demande d'informations pour la demande ID: {} par l'agent ID: {}", demandeId, agentId);

        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new ValidationException("DEMANDE_NOT_FOUND", "Demande non trouvée"));

        InstanceValidation agent = instanceValidationRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND", "Agent non trouvé"));

        DemandeValidateur validation = demandeValidateurRepository
                .findByDemandeIdAndInstanceId(demandeId, agentId)
                .orElseThrow(() -> new ValidationException("VALIDATION_NOT_FOUND",
                        "Cette demande n'est pas assignée à cet agent"));

        validation.setValidationStatus(ValidationStatus.EN_ATTENTE);
        validation.setValidationComment("Informations demandées: " + comment);
        demandeValidateurRepository.save(validation);

        // ✅ Marquer les documents autorisés comme A_COMPLETER
        Set<String> allowedDocTypes = getAllowedDocumentTypesForStructure(agent.getStructure());
        validateVisibleDocumentsForDemande(demandeId, agentId, DocumentStatus.A_COMPLETER,
                "Des informations complémentaires sont requises par " + agent.getStructure().getOfficialName() + ": " + comment,
                allowedDocTypes);

        demande.setStatus(DemandeStatus.EN_ATTENTE_INFO);
        demande.setDecisionComment(comment);
        demande = demandeRepository.save(demande);

        User userAgent = agent;
        addHistory(demande, null, "INFO_REQUISE",
                "INFO_REQUISE", "Informations demandées par " + agent.getStructure().getOfficialName() +
                        ": " + comment, userAgent);

        return mapToDTO(demande);
    }

    /**
     * Valider un document
     */
    @Override
    @Transactional
    public Document validateDocument(Long documentId, Long agentId, String status, String comment) {
        log.info("Validation du document ID: {} par l'agent ID: {}", documentId, agentId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ValidationException("DOCUMENT_NOT_FOUND", "Document non trouvé"));

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ValidationException("AGENT_NOT_FOUND", "Agent non trouvé"));

        DocumentStatus newStatus;
        try {
            newStatus = DocumentStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("INVALID_STATUS", "Statut invalide: " + status);
        }

        document.setStatus(newStatus);
        document.setValidationComment(comment);
        document.setValidatedAt(LocalDateTime.now());
        document.setValidatedBy(agent);

        document = documentRepository.save(document);
        log.info("Document {} validé avec statut: {}", document.getFileName(), newStatus);

        return document;
    }

    // ==================== MÉTHODES UTILITAIRES ====================

    /**
     * Vérifier si tous les validateurs obligatoires ont approuvé
     */
    private boolean isAllMandatoryValidatorsApproved(DemandeEnregistrement demande) {
        List<DemandeValidateur> validateurs = demandeValidateurRepository.findByDemandeId(demande.getId());

        boolean allMandatoryApproved = validateurs.stream()
                .filter(DemandeValidateur::getIsMandatory)
                .allMatch(v -> v.getValidationStatus() == ValidationStatus.VALIDEE);

        log.info("Tous validateurs obligatoires ont approuvé: {}", allMandatoryApproved);
        return allMandatoryApproved;
    }

    /**
     * Vérifier si un validateur obligatoire a rejeté
     */
    private boolean hasMandatoryRejection(DemandeEnregistrement demande) {
        List<DemandeValidateur> validateurs = demandeValidateurRepository.findByDemandeId(demande.getId());

        boolean hasRejection = validateurs.stream()
                .filter(DemandeValidateur::getIsMandatory)
                .anyMatch(v -> v.getValidationStatus() == ValidationStatus.REJETEE);

        if (hasRejection) {
            log.warn("Un validateur obligatoire a rejeté la demande");
        }
        return hasRejection;
    }

    private String generateAgrementNumber() {
        String year = String.valueOf(LocalDateTime.now().getYear());
        String random = String.format("%06d", new Random().nextInt(1000000));
        return "AGR-" + year + "-" + random;
    }

    private void addHistory(DemandeEnregistrement demande, String oldStatus,
                            String newStatus, String action, String comment, User performedBy) {
        DemandeHistory history = DemandeHistory.builder()
                .demande(demande)
                .oldStatus(oldStatus != null ? DemandeStatus.valueOf(oldStatus) : null)
                .newStatus(newStatus != null ? DemandeStatus.valueOf(newStatus) : null)
                .action(action)
                .comment(comment)
                .performedBy(performedBy)
                .performedAt(LocalDateTime.now())
                .build();
        historyRepository.save(history);
    }


    // 1. NOUVELLE MÉTHODE PRIVÉE : Obtenir les types de documents autorisés
    private Set<String> getAllowedDocumentTypesForStructure(StructureInterne structure) {
        String structureName = structure.getOfficialName();
        Set<String> allowedTypes = new HashSet<>();

        // Commerce → null = tous les documents
        if (structureName.contains("Commerce")) {
            return null;
        }

        // Industrie → seulement documents industriels
        if (structureName.contains("Industrie")) {
            allowedTypes.add("CONFORMITY_CERT_ANALYSIS_REPORT");
            return allowedTypes;
        }

        // Santé/INSSPA/ANMPS → seulement documents alimentaires
        if (structureName.contains("Santé") || structureName.contains("INSSPA") || structureName.contains("ANMPS")) {
            allowedTypes.addAll(Arrays.asList(
                    "TECHNICAL_DATA_SHEET", "SANITARY_APPROVAL", "SANITARY_CERT",
                    "FREE_SALE_CERT", "BACTERIO_ANALYSIS", "PHYSICO_CHEM_ANALYSIS",
                    "RADIOACTIVITY_ANALYSIS", "FUMIGATION_CERT", "HACCP_ISO_CERT",
                    "BRAND_LICENSE", "COMPETENT_AUTHORITY_LETTER", "STORAGE_FACILITY_PLAN",
                    "PRODUCTION_FACILITY_PLAN", "MONITORING_PLAN", "PRODUCT_SPECIFICATION",
                    "PRODUCT_LABELS", "COMMISSION_LETTER", "QUALITY_CERT",
                    "PRODUCT_SHEETS", "OFFICIAL_LETTER"
            ));
            return allowedTypes;
        }

        return null;
    }

    // 2. NOUVELLE MÉTHODE PRIVÉE : Valider seulement les documents autorisés
    // Modifiez la méthode validateVisibleDocumentsForDemande
    private void validateVisibleDocumentsForDemande(Long demandeId, Long agentId,
                                                    DocumentStatus targetStatus,
                                                    String defaultComment,
                                                    Set<String> allowedDocTypes) {
        List<Document> pendingDocuments = documentRepository.findByDemandeIdAndStatus(
                demandeId, DocumentStatus.EN_ATTENTE);

        if (pendingDocuments.isEmpty()) return;

        User agent = userRepository.findById(agentId).orElse(null);
        if (agent == null) return;

        for (Document doc : pendingDocuments) {
            boolean shouldValidate = false;

            // Cas 1: allowedDocTypes = null → Commerce voit tout
            if (allowedDocTypes == null) {
                shouldValidate = true;
            }
            // Cas 2: Document sans type
            else if (doc.getDocumentType() == null) {
                log.warn("Document {} sans documentType", doc.getFileName());
                shouldValidate = false;
            }
            // Cas 3: Comparaison enum -> String
            else {
                // Convertir l'enum en String
                String docTypeAsString = doc.getDocumentType().name();
                shouldValidate = allowedDocTypes.contains(docTypeAsString);
            }

            if (shouldValidate) {
                doc.setStatus(targetStatus);
                doc.setValidationComment(defaultComment);
                doc.setValidatedAt(LocalDateTime.now());
                doc.setValidatedBy(agent);
                documentRepository.save(doc);
                log.info("✅ Document {} validé (type: {})", doc.getFileName(), doc.getDocumentType());
            } else {
                log.info("⏭️ Document {} ignoré (type: {}) - hors périmètre", doc.getFileName(), doc.getDocumentType());
            }
        }
    }

    // ==================== MAPPING ====================

    private DemandeEnregistrementDTO mapToDTO(DemandeEnregistrement demande) {
        String applicantName = "";
        String applicantType = "";

        if (demande.getExportateur() != null) {
            applicantName = demande.getExportateur().getRaisonSociale();
            applicantType = "EXPORTATEUR";
        } else if (demande.getImportateur() != null) {
            applicantName = demande.getImportateur().getPrenom() + " " + demande.getImportateur().getNom();
            applicantType = "IMPORTATEUR";
        }

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
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        List<DocumentDTO> documents = new ArrayList<>();
        if (demande.getId() != null) {
            List<Document> docs = documentRepository.findByDemandeId(demande.getId());
            documents = docs.stream()
                    .map(this::convertToDocumentDTO)
                    .collect(Collectors.toList());
        }

        // Récupérer les statuts de validation individuels
        List<Map<String, Object>> validationStatuses = new ArrayList<>();
        if (demande.getId() != null) {
            List<DemandeValidateur> validateurs = demandeValidateurRepository.findByDemandeId(demande.getId());
            validationStatuses = validateurs.stream()
                    .map(v -> {
                        Map<String, Object> statusMap = new HashMap<>();
                        statusMap.put("structureId", v.getStructure().getId());
                        statusMap.put("structureName", v.getStructure().getOfficialName());
                        statusMap.put("validationStatus", v.getValidationStatus().name());
                        statusMap.put("isMandatory", v.getIsMandatory());
                        statusMap.put("validationOrder", v.getValidationOrder());
                        statusMap.put("comment", v.getValidationComment());
                        statusMap.put("validatedAt", v.getValidatedAt());
                        return statusMap;
                    })
                    .collect(Collectors.toList());
        }

        return DemandeEnregistrementDTO.builder()
                .id(demande.getId())
                .reference(demande.getReference())
                .status(demande.getStatus())
                .submittedAt(demande.getSubmittedAt())
                .products(products)
                .documents(documents)
                .validationStatuses(validationStatuses)  // Nouveau champ dans le DTO
                .build();
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
}