package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DemandeRoutingService {

    private final StructureCompetenceRepository competenceRepository;
    private final InstanceValidationRepository instanceValidationRepository;
    private final DemandeValidateurRepository demandeValidateurRepository;
    private final StructureInterneRepository structureRepository;

    /**
     * Point d'entrée principal - Router une demande selon son type
     */
    @Transactional
    public List<DemandeValidateur> assignDemandeToValidators(DemandeEnregistrement demande) {

        log.info("=== ROUTAGE DEMANDE ===");
        log.info("Demande ID: {}, Référence: {}, Type: {}",
                demande.getId(), demande.getReference(), demande.getTypeDemande());

        // 🔥 Routage différent selon le type de demande
        switch (demande.getTypeDemande()) {
            case PRODUCT_DECLARATION:
                return routeProductDeclaration(demande);

            case IMPORT:
                return routeImportDemande(demande);

            case REGISTRATION:
                return routeRegistrationDemande(demande);

            default:
                log.warn("Type de demande non supporté: {}", demande.getTypeDemande());
                return new ArrayList<>();
        }
    }

    /**
     * Route 1: Déclaration de produits - Validation multiple selon les catégories
     */
    private List<DemandeValidateur> routeProductDeclaration(DemandeEnregistrement demande) {
        log.info("🏭 Routage DECLARATION DE PRODUITS - Validation multiple");

        // 1. Extraire toutes les catégories de produits de la demande
        Set<String> requiredCategories = extractProductCategories(demande);

        log.info("Catégories détectées: {}", requiredCategories);

        // 2. Trouver toutes les structures compétentes pour ces catégories
        List<StructureCompetence> competences = competenceRepository
                .findByProductCategories(requiredCategories);

        // 3. Ajouter le validateur par défaut (Ministère du Commerce - compétence 'default')
        List<StructureCompetence> defaultValidators = competenceRepository.findDefaultValidators();
        competences.addAll(defaultValidators);

        // 4. Grouper par structure et assigner
        return assignValidatorsFromCompetences(demande, competences);
    }

    /**
     * Route 2: Demande d'importation - Validation UNIQUEMENT par le Ministère du Commerce
     */
    private List<DemandeValidateur> routeImportDemande(DemandeEnregistrement demande) {
        log.info("📦 Routage IMPORTATION - Validation uniquement par le Ministère du Commerce");

        // Récupérer la structure "Ministère du Commerce"
        StructureInterne commerceStructure = getCommerceStructure();

        if (commerceStructure == null) {
            log.error("⚠️ Ministère du Commerce non trouvé dans la base !");
            return new ArrayList<>();
        }

        log.info("Validateur unique: {}", commerceStructure.getOfficialName());

        // Créer une compétence temporaire pour le Commerce
        StructureCompetence commerceComp = StructureCompetence.builder()
                .structure(commerceStructure)
                .productCategory("import")  // Catégorie spéciale pour l'import
                .isMandatory(true)
                .validationOrder(1)
                .isActive(true)
                .build();

        return assignValidatorsFromCompetences(demande, List.of(commerceComp));
    }

    /**
     * Route 3: Demande d'enregistrement (agrément) - Validation UNIQUEMENT par le Ministère du Commerce
     */
    private List<DemandeValidateur> routeRegistrationDemande(DemandeEnregistrement demande) {
        log.info("📋 Routage ENREGISTREMENT - Validation uniquement par le Ministère du Commerce");

        // Récupérer la structure "Ministère du Commerce"
        StructureInterne commerceStructure = getCommerceStructure();

        if (commerceStructure == null) {
            log.error("⚠️ Ministère du Commerce non trouvé dans la base !");
            return new ArrayList<>();
        }

        log.info("Validateur unique: {}", commerceStructure.getOfficialName());

        // Créer une compétence temporaire pour le Commerce
        StructureCompetence commerceComp = StructureCompetence.builder()
                .structure(commerceStructure)
                .productCategory("registration")  // Catégorie spéciale pour l'enregistrement
                .isMandatory(true)
                .validationOrder(1)
                .isActive(true)
                .build();

        return assignValidatorsFromCompetences(demande, List.of(commerceComp));
    }

    /**
     * Assigner les validateurs à partir d'une liste de compétences
     */
    private List<DemandeValidateur> assignValidatorsFromCompetences(
            DemandeEnregistrement demande,
            List<StructureCompetence> competences) {

        // Grouper par structure
        Map<StructureInterne, List<StructureCompetence>> validatorsMap = competences.stream()
                .filter(sc -> sc.getIsActive())
                .collect(Collectors.groupingBy(StructureCompetence::getStructure));

        List<DemandeValidateur> assignedValidators = new ArrayList<>();

        for (Map.Entry<StructureInterne, List<StructureCompetence>> entry : validatorsMap.entrySet()) {
            StructureInterne structure = entry.getKey();
            List<StructureCompetence> structureCompetences = entry.getValue();

            // Trouver la meilleure instance disponible
            InstanceValidation instance = findBestAvailableInstance(structure);

            if (instance != null) {
                // Déterminer l'ordre de validation (le plus petit order d'abord)
                int minOrder = structureCompetences.stream()
                        .mapToInt(sc -> sc.getValidationOrder() != null ? sc.getValidationOrder() : 0)
                        .min()
                        .orElse(0);

                // Vérifier si au moins une compétence est mandatory
                boolean isMandatory = structureCompetences.stream()
                        .anyMatch(StructureCompetence::getIsMandatory);

                // Catégories à valider
                String categories = structureCompetences.stream()
                        .map(StructureCompetence::getProductCategory)
                        .collect(Collectors.joining(","));

                // Calculer la deadline basée sur le SLA de l'instance
                LocalDateTime deadline = calculateDeadline(instance);

                DemandeValidateur dv = DemandeValidateur.builder()
                        .demande(demande)
                        .instance(instance)
                        .structure(structure)
                        .validationStatus(ValidationStatus.EN_ATTENTE)
                        .validationOrder(minOrder)
                        .isMandatory(isMandatory)
                        .categoriesToValidate(categories)
                        .deadline(deadline)
                        .notifiedAt(LocalDateTime.now())
                        .reminderCount(0)
                        .isCompleted(false)
                        .build();

                assignedValidators.add(dv);
                log.info("✅ Assigné: {} à {} (Mandatory: {}, Ordre: {}, Catégories: {}, Deadline: {})",
                        structure.getOfficialName(),
                        instance.getEmail(),
                        isMandatory,
                        minOrder,
                        categories,
                        deadline);
            } else {
                log.warn("⚠️ Aucune instance active pour la structure: {}", structure.getOfficialName());
            }
        }

        // Sauvegarder les assignments
        if (!assignedValidators.isEmpty()) {
            demandeValidateurRepository.saveAll(assignedValidators);
            demande.setStatus(DemandeStatus.SOUMISE);
        } else {
            log.error("❌ Aucun validateur assigné pour la demande {}", demande.getReference());
        }

        return assignedValidators;
    }

    /**
     * Récupérer la structure "Ministère du Commerce"
     */
    private StructureInterne getCommerceStructure() {
        // Chercher par nom exact
        Optional<StructureInterne> commerce = structureRepository
                .findByOfficialName("Ministère du Commerce");

        if (commerce.isEmpty()) {
            // Chercher par pattern
            List<StructureInterne> structures = structureRepository
                    .findByOfficialNameContaining("Commerce");

            if (!structures.isEmpty()) {
                return structures.get(0);
            }
        }

        return commerce.orElse(null);
    }

    /**
     * Extraire les catégories uniques des produits d'une demande
     */
    private Set<String> extractProductCategories(DemandeEnregistrement demande) {
        Set<String> categories = new HashSet<>();

        if (demande.getDemandeProduits() == null || demande.getDemandeProduits().isEmpty()) {
            log.warn("Aucun produit associé à la demande {}", demande.getReference());
            return categories;
        }

        for (DemandeProduit dp : demande.getDemandeProduits()) {
            Product produit = dp.getProduit();
            if (produit != null && produit.getProductType() != null) {
                String category = mapProductTypeToCategory(produit.getProductType());
                categories.add(category);
                log.info("Produit: {} - Type: {} -> Catégorie: {}",
                        produit.getProductName(), produit.getProductType(), category);
            }
        }

        return categories;
    }

    /**
     * Mapper le type de produit vers une catégorie
     */
    private String mapProductTypeToCategory(String productType) {
        if (productType == null) return "autre";

        switch (productType.toLowerCase()) {
            case "alimentaire":
                return "alimentaire";
            case "industriel":
                return "industriel";
            case "electronique":
                return "electronique";
            case "textile":
                return "textile";
            case "chimique":
                return "chimique";
            case "pharmaceutique":
                return "pharmaceutique";
            default:
                return "autre";
        }
    }

    /**
     * Calculer la deadline basée sur le SLA de l'instance
     */
    private LocalDateTime calculateDeadline(InstanceValidation instance) {
        if (instance.getSlaTraitementJours() == null) {
            return LocalDateTime.now().plusDays(30); // Default 30 jours
        }
        return LocalDateTime.now().plusDays(instance.getSlaTraitementJours());
    }

    /**
     * Trouver l'instance la moins chargée pour une structure
     */
    private InstanceValidation findBestAvailableInstance(StructureInterne structure) {
        List<InstanceValidation> activeInstances = instanceValidationRepository
                .findByStructureAndUserStatut(structure, UserStatus.ACTIF);

        if (activeInstances.isEmpty()) {
            log.warn("Aucune instance active pour la structure: {}", structure.getOfficialName());
            return null;
        }

        // Load balancing: choisir l'instance avec le moins de demandes en attente
        return activeInstances.stream()
                .min(Comparator.comparingInt(this::getCurrentWorkload))
                .orElse(null);
    }

    /**
     * Calculer la charge de travail actuelle d'une instance
     */
    private int getCurrentWorkload(InstanceValidation instance) {
        return (int) demandeValidateurRepository
                .countByInstanceAndValidationStatus(instance, ValidationStatus.EN_ATTENTE);
    }
}