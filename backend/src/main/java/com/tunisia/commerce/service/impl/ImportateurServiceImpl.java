package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.importateur.ImportateurStatutsDTO;
import com.tunisia.commerce.dto.produits.ProduitDTO;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.exception.ImportateurException;
import com.tunisia.commerce.repository.*;
import com.tunisia.commerce.service.ImportateurService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ImportateurServiceImpl implements ImportateurService {

    private final ExportateurRepository exportateurRepository;
    private final ProductRepository productRepository;
    private final DemandeProduitRepository demandeProduitRepository;
    private final NotificationRepository notificationRepository;
    private final DemandeEnregistrementRepository demandeRepository;

    @Override
    public List<UserDTO> rechercherExportateursValides(String searchTerm) {
        log.info("========== RECHERCHE EXPORTATEURS VALIDÉS ==========");
        log.info("Terme de recherche: '{}'", searchTerm);

        try {
            if (!StringUtils.hasText(searchTerm)) {
                return getAllExportateursValides();
            }

            String searchTermLower = searchTerm.toLowerCase().trim();

            // Recherche dans les exportateurs avec conditions sur les demandes
            List<ExportateurEtranger> exportateurs = exportateurRepository
                    .findBySearchCriteriaWithValidDemandes(searchTermLower);

            log.info("Exportateurs trouvés par recherche directe: {}", exportateurs.size());

            // Si pas de résultats, recherche dans les produits via demandes validées
            if (exportateurs.isEmpty()) {
                List<Product> produits = productRepository.findByProductNameContainingIgnoreCaseOrHsCodeContaining(
                        searchTermLower
                );

                log.info("Produits trouvés par recherche: {}", produits.size());

                exportateurs = produits.stream()
                        .flatMap(product -> demandeProduitRepository.findByProduitId(product.getId()).stream())
                        .map(DemandeProduit::getDemande)
                        .filter(demande -> demande != null &&
                                demande.getExportateur() != null &&
                                demande.getStatus() == DemandeStatus.VALIDEE &&
                                demande.getPaymentStatus() == PaymentStatus.REUSSI)
                        .map(DemandeEnregistrement::getExportateur)
                        .filter(exportateur ->
                                exportateur != null &&
                                        exportateur.getStatutAgrement() == StatutAgrement.VALIDE
                        )
                        .distinct()
                        .collect(Collectors.toList());

                log.info("Exportateurs trouvés via produits: {}", exportateurs.size());
            }

            List<UserDTO> resultats = exportateurs.stream()
                    .map(this::convertToUserDTO)
                    .collect(Collectors.toList());

            log.info("Nombre total de résultats: {}", resultats.size());
            log.info("========== FIN RECHERCHE ==========");

            return resultats;

        } catch (Exception e) {
            log.error("Erreur lors de la recherche d'exportateurs: {}", e.getMessage(), e);
            throw new ImportateurException("Erreur lors de la recherche d'exportateurs", e);
        }
    }

    /*@Override
    public List<UserDTO> rechercherParPays(String pays) {
        log.info("Recherche par pays: {}", pays);

        if (!StringUtils.hasText(pays)) {
            throw ImportateurException.rechercheInvalide("Le pays ne peut pas être vide");
        }

        try {
            List<ExportateurEtranger> exportateurs = exportateurRepository
                    .findByPaysOrigineContainingIgnoreCaseAndStatutAgrement(
                            pays,
                            StatutAgrement.VALIDE
                    );

            return exportateurs.stream()
                    .map(this::convertToUserDTO)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Erreur lors de la recherche par pays: {}", e.getMessage());
            throw new ImportateurException("Erreur lors de la recherche par pays: " + pays, e);
        }
    }*/

    /*@Override
    public List<UserDTO> rechercherParRaisonSociale(String raisonSociale) {
        log.info("Recherche par raison sociale: {}", raisonSociale);

        if (!StringUtils.hasText(raisonSociale)) {
            throw ImportateurException.rechercheInvalide("La raison sociale ne peut pas être vide");
        }

        try {
            List<ExportateurEtranger> exportateurs = exportateurRepository
                    .findByRaisonSocialeContainingIgnoreCaseAndStatutAgrement(
                            raisonSociale,
                            StatutAgrement.VALIDE
                    );

            return exportateurs.stream()
                    .map(this::convertToUserDTO)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Erreur lors de la recherche par raison sociale: {}", e.getMessage());
            throw new ImportateurException("Erreur lors de la recherche par raison sociale: " + raisonSociale, e);
        }
    }*/

    /*@Override
    public List<UserDTO> rechercherParProduit(String produit) {
        log.info("Recherche par produit: {}", produit);

        if (!StringUtils.hasText(produit)) {
            throw ImportateurException.rechercheInvalide("Le nom du produit ne peut pas être vide");
        }

        try {
            List<Product> produits = productRepository
                    .findByProductNameContainingIgnoreCase(produit);

            if (produits.isEmpty()) {
                return Collections.emptyList();
            }

            List<ExportateurEtranger> exportateurs = produits.stream()
                    .flatMap(product -> demandeProduitRepository.findByProduitId(product.getId()).stream())
                    .map(DemandeProduit::getDemande)
                    .filter(demande -> demande != null && demande.getExportateur() != null)
                    .map(DemandeEnregistrement::getExportateur)
                    .filter(exportateur ->
                            exportateur != null &&
                                    exportateur.getStatutAgrement() == StatutAgrement.VALIDE
                    )
                    .distinct()
                    .collect(Collectors.toList());

            return exportateurs.stream()
                    .map(this::convertToUserDTO)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Erreur lors de la recherche par produit: {}", e.getMessage());
            throw new ImportateurException("Erreur lors de la recherche par produit: " + produit, e);
        }
    }*/

    /*@Override
    public List<UserDTO> rechercherParCodeNGP(String codeNGP) {
        log.info("Recherche par code NGP: {}", codeNGP);

        if (!StringUtils.hasText(codeNGP)) {
            throw ImportateurException.rechercheInvalide("Le code NGP ne peut pas être vide");
        }

        try {
            List<Product> produits = productRepository
                    .findByHsCodeContainingIgnoreCase(codeNGP);

            if (produits.isEmpty()) {
                return Collections.emptyList();
            }

            List<ExportateurEtranger> exportateurs = produits.stream()
                    .flatMap(product -> demandeProduitRepository.findByProduitId(product.getId()).stream())
                    .map(DemandeProduit::getDemande)
                    .filter(demande -> demande != null && demande.getExportateur() != null)
                    .map(DemandeEnregistrement::getExportateur)
                    .filter(exportateur ->
                            exportateur != null &&
                                    exportateur.getStatutAgrement() == StatutAgrement.VALIDE
                    )
                    .distinct()
                    .collect(Collectors.toList());

            return exportateurs.stream()
                    .map(this::convertToUserDTO)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Erreur lors de la recherche par code NGP: {}", e.getMessage());
            throw new ImportateurException("Erreur lors de la recherche par code NGP: " + codeNGP, e);
        }
    }*/

    /*@Override
    public UserDTO getExportateurValideById(Long exportateurId) {
        log.info("Récupération de l'exportateur par ID: {}", exportateurId);

        if (exportateurId == null || exportateurId <= 0) {
            throw ImportateurException.rechercheInvalide("ID exportateur invalide: " + exportateurId);
        }

        try {
            ExportateurEtranger exportateur = exportateurRepository
                    .findByIdAndStatutAgrement(
                            exportateurId,
                            StatutAgrement.VALIDE
                    )
                    .orElseThrow(() -> ImportateurException.exportateurNonTrouve(exportateurId));

            return convertToUserDTO(exportateur);

        } catch (ImportateurException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur lors de la récupération de l'exportateur {}: {}", exportateurId, e.getMessage());
            throw new ImportateurException("Erreur lors de la récupération de l'exportateur avec l'ID: " + exportateurId, e);
        }
    }*/

    @Override
    public List<UserDTO> getAllExportateursValides() {
        log.info("========== LISTE TOUS EXPORTATEURS VALIDÉS ==========");

        try {
            List<ExportateurEtranger> exportateurs = exportateurRepository
                    .findByStatutAgrement(
                            StatutAgrement.VALIDE
                    );

            log.info("Exportateurs validés trouvés: {}", exportateurs.size());

            // Debug: Afficher les détails de chaque exportateur
            for (ExportateurEtranger exp : exportateurs) {
                log.info("=== Exportateur ID: {} ===", exp.getId());
                log.info("Raison sociale: {}", exp.getRaisonSociale());
                log.info("Nombre de demandes: {}", exp.getDemandes() != null ? exp.getDemandes().size() : 0);

                if (exp.getDemandes() != null) {
                    for (DemandeEnregistrement demande : exp.getDemandes()) {
                        log.info("  Demande ID: {}, Status: {}", demande.getId(), demande.getStatus());

                        // Récupérer les produits via DemandeProduit
                        List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
                        log.info("  Nombre de produits dans la demande: {}", demandeProduits.size());

                        for (DemandeProduit dp : demandeProduits) {
                            Product product = dp.getProduit();
                            log.info("    Produit: {} (Code NGP: {})",
                                    product.getProductName(), product.getHsCode());
                        }
                    }
                }
            }

            List<UserDTO> resultats = exportateurs.stream()
                    .map(this::convertToUserDTO)
                    .collect(Collectors.toList());

            log.info("Nombre de DTOs générés: {}", resultats.size());
            log.info("========== FIN LISTE ==========");

            return resultats;

        } catch (Exception e) {
            log.error("Erreur lors de la récupération de tous les exportateurs: {}", e.getMessage(), e);
            throw new ImportateurException("Erreur lors de la récupération de la liste des exportateurs", e);
        }
    }

    private UserDTO convertToUserDTO(ExportateurEtranger exportateur) {
        if (exportateur == null) {
            return null;
        }

        try {
            log.info("Conversion de l'exportateur: {} (ID: {})", exportateur.getRaisonSociale(), exportateur.getId());

            // Compter les documents
            int documentsCount = exportateur.getDocuments() != null ? exportateur.getDocuments().size() : 0;

            UserDTO dto = new UserDTO();

            // Champs de base User
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

            // Champs spécifiques aux exportateurs
            dto.setCompanyName(exportateur.getRaisonSociale());
            dto.setCountry(exportateur.getPaysOrigine());
            dto.setTwoFactorEnabled(exportateur.isTwoFactorEnabled());
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
            dto.setDocumentsCount(documentsCount);

            // Autres champs spécifiques
            dto.setUsername(exportateur.getUsername());
            dto.setNumeroOfficielEnregistrement(exportateur.getNumeroOfficielEnregistrement());
            dto.setSiteType(exportateur.getSiteType());
            dto.setRepresentantRole(exportateur.getRepresentantRole());
            dto.setRepresentantEmail(exportateur.getRepresentantEmail());
            dto.setCapaciteAnnuelle(exportateur.getCapaciteAnnuelle());
            dto.setPreKycCompleted(exportateur.isPreKycCompleted());
            dto.setPreKycCompletedAt(exportateur.getPreKycCompletedAt());

            // 🔥 CORRECTION : Utiliser un Map pour éviter les doublons par ID produit
            Map<Long, ProduitDTO> produitsMap = new HashMap<>();

            if (exportateur.getDemandes() != null) {
                log.info("Nombre de demandes pour cet exportateur: {}", exportateur.getDemandes().size());

                for (DemandeEnregistrement demande : exportateur.getDemandes()) {
                    log.info("Traitement de la demande ID: {}", demande.getId());

                    // Récupérer les produits associés à cette demande via DemandeProduit
                    List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());

                    if (demandeProduits != null && !demandeProduits.isEmpty()) {
                        log.info("Cette demande a {} produits associés", demandeProduits.size());

                        for (DemandeProduit dp : demandeProduits) {
                            Product product = dp.getProduit();

                            // 🔥 Vérifier si ce produit n'a pas déjà été ajouté
                            if (!produitsMap.containsKey(product.getId())) {
                                log.info("  - Ajout du produit: {} (ID: {}), Code NGP: {}",
                                        product.getProductName(), product.getId(), product.getHsCode());

                                ProduitDTO produitDTO = ProduitDTO.builder()
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
                                        .build();

                                produitsMap.put(product.getId(), produitDTO);
                            } else {
                                log.info("  - Produit déjà ajouté (doublon ignoré): {} (ID: {})",
                                        product.getProductName(), product.getId());
                            }
                        }
                    } else {
                        log.info("La demande {} n'a pas de produits associés", demande.getId());
                    }
                }
            } else {
                log.warn("L'exportateur {} n'a pas de demandes", exportateur.getRaisonSociale());
            }

            // Convertir le Map en List
            List<ProduitDTO> produitsDTO = new ArrayList<>(produitsMap.values());

            dto.setProduits(produitsDTO);
            log.info("Total produits UNIQUES trouvés pour {}: {} (avant dédoublonnage: {})",
                    exportateur.getRaisonSociale(), produitsDTO.size(), produitsMap.size());

            return dto;

        } catch (Exception e) {
            log.error("Erreur lors de la conversion de l'exportateur en DTO: {}", e.getMessage(), e);
            throw new ImportateurException("Erreur lors de la conversion des données de l'exportateur", e);
        }
    }

    /**
     * Récupère les statuts des produits pour un importateur
     * @param importateurId L'ID de l'importateur
     * @return ImportateurStatutsDTO contenant les listes d'IDs par statut
     */
    @Override
    @Transactional(readOnly = true)
    public ImportateurStatutsDTO getProduitsStatuts(Long importateurId) {
        log.info("Récupération des statuts des produits pour l'importateur ID: {}", importateurId);

        List<Long> acceptedProductIds = new ArrayList<>();
        List<Long> pendingProductIds = new ArrayList<>();
        List<Long> submittedProductIds = new ArrayList<>();

        try {
            // 1. Récupérer les produits pour lesquels l'importateur a déjà soumis une demande
            List<DemandeEnregistrement> demandesSoumises = demandeRepository.findByImportateurIdAndStatusIn(
                    importateurId,
                    List.of(DemandeStatus.SOUMISE, DemandeStatus.EN_COURS_VALIDATION, DemandeStatus.VALIDEE)
            );

            for (DemandeEnregistrement demande : demandesSoumises) {
                List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
                for (DemandeProduit dp : demandeProduits) {
                    Long productId = dp.getProduit().getId();
                    if (!submittedProductIds.contains(productId)) {
                        submittedProductIds.add(productId);
                    }
                }
            }

            log.info("Produits déjà soumis: {}", submittedProductIds.size());

            // 2. Récupérer les produits pour lesquels l'exportateur a accepté la notification
            List<Notification> notificationsAcceptees = notificationRepository.findBySenderIdAndActionAndStatus(
                    importateurId,
                    NotificationAction.ACCEPT,
                    NotificationStatus.LU
            );

            for (Notification notif : notificationsAcceptees) {
                if ("PRODUCT".equals(notif.getTargetEntityType())) {
                    Long productId = notif.getTargetEntityId();
                    // Ne pas inclure si déjà soumis
                    if (!submittedProductIds.contains(productId) && !acceptedProductIds.contains(productId)) {
                        acceptedProductIds.add(productId);
                    }
                }
            }

            log.info("Produits acceptés: {}", acceptedProductIds.size());

            // 3. Récupérer les produits pour lesquels une notification est en attente (PENDING)
            List<Notification> notificationsEnAttente = notificationRepository.findBySenderIdAndActionAndStatus(
                    importateurId,
                    NotificationAction.PENDING,
                    NotificationStatus.NON_LU
            );

            for (Notification notif : notificationsEnAttente) {
                if ("PRODUCT".equals(notif.getTargetEntityType())) {
                    Long productId = notif.getTargetEntityId();
                    // Ne pas inclure si déjà soumis ou accepté
                    if (!submittedProductIds.contains(productId) && !acceptedProductIds.contains(productId) && !pendingProductIds.contains(productId)) {
                        pendingProductIds.add(productId);
                    }
                }
            }

            log.info("Produits en attente: {}", pendingProductIds.size());

        } catch (Exception e) {
            log.error("Erreur lors de la récupération des statuts des produits: {}", e.getMessage(), e);
        }

        return ImportateurStatutsDTO.builder()
                .acceptedProductIds(acceptedProductIds)
                .pendingProductIds(pendingProductIds)
                .submittedProductIds(submittedProductIds)
                .build();
    }

    /**
     * Vérifie le statut d'un produit spécifique
     * @param importateurId L'ID de l'importateur
     * @param productId L'ID du produit
     * @return Le statut du produit
     */
    /*@Override
    @Transactional(readOnly = true)
    public String getProduitStatut(Long importateurId, Long productId) {
        log.info("Vérification du statut du produit ID: {} pour importateur ID: {}", productId, importateurId);

        // 1. Vérifier si une demande a déjà été soumise
        boolean hasDemande = demandeRepository.existsByImportateurIdAndProduitIdAndStatusIn(
                importateurId,
                productId,
                List.of(DemandeStatus.SOUMISE, DemandeStatus.EN_COURS_VALIDATION, DemandeStatus.VALIDEE)
        );

        if (hasDemande) {
            log.info("Produit {}: DEMANDE_SOUMISE", productId);
            return "DEMANDE_SOUMISE";
        }

        // 2. Vérifier si l'exportateur a accepté la notification
        boolean isAccepted = notificationRepository.existsBySenderIdAndTargetEntityIdAndActionAndStatus(
                importateurId,
                productId,
                NotificationAction.ACCEPT,
                NotificationStatus.LU
        );

        if (isAccepted) {
            log.info("Produit {}: ACCEPTE", productId);
            return "ACCEPTE";
        }

        // 3. Vérifier si une notification est en attente
        boolean isPending = notificationRepository.existsBySenderIdAndTargetEntityIdAndActionAndStatus(
                importateurId,
                productId,
                NotificationAction.PENDING,
                NotificationStatus.NON_LU
        );

        if (isPending) {
            log.info("Produit {}: EN_ATTENTE", productId);
            return "EN_ATTENTE";
        }

        log.info("Produit {}: AUCUNE", productId);
        return "AUCUNE";
    }*/
}