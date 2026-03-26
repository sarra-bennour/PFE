package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.produits.ProduitDTO;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.StatutAgrement;
import com.tunisia.commerce.exception.ImportateurException;
import com.tunisia.commerce.repository.DemandeProduitRepository;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.repository.ProductRepository;
import com.tunisia.commerce.service.ImportateurService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ImportateurServiceImpl implements ImportateurService {

    private final ExportateurRepository exportateurRepository;
    private final ProductRepository productRepository;
    private final DemandeProduitRepository demandeProduitRepository;

    @Override
    public List<UserDTO> rechercherExportateursValides(String searchTerm) {
        log.info("========== RECHERCHE EXPORTATEURS VALIDÉS ==========");
        log.info("Terme de recherche: '{}'", searchTerm);

        try {
            if (!StringUtils.hasText(searchTerm)) {
                return getAllExportateursValides();
            }

            String searchTermLower = searchTerm.toLowerCase().trim();

            // Recherche dans les exportateurs
            List<ExportateurEtranger> exportateurs = exportateurRepository
                    .findBySearchCriteria(
                            searchTermLower
                    );

            log.info("Exportateurs trouvés par recherche directe: {}", exportateurs.size());

            // Si pas de résultats, recherche dans les produits via DemandeProduit
            if (exportateurs.isEmpty()) {
                List<Product> produits = productRepository.findByProductNameContainingIgnoreCaseOrHsCodeContaining(
                        searchTermLower
                );

                log.info("Produits trouvés par recherche: {}", produits.size());

                exportateurs = produits.stream()
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

    @Override
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
    }

    @Override
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
    }

    @Override
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
    }

    @Override
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
    }

    @Override
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
    }

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

            // RÉCUPÉRATION DES PRODUITS via DemandeProduit
            List<ProduitDTO> produitsDTO = new ArrayList<>();

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
                            log.info("  - Produit: {}, Code NGP: {}",
                                    product.getProductName(), product.getHsCode());

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

                            produitsDTO.add(produitDTO);
                        }
                    } else {
                        log.info("La demande {} n'a pas de produits associés", demande.getId());
                    }
                }
            } else {
                log.warn("L'exportateur {} n'a pas de demandes", exportateur.getRaisonSociale());
            }

            dto.setProduits(produitsDTO);
            log.info("Total produits trouvés pour {}: {}", exportateur.getRaisonSociale(), produitsDTO.size());

            return dto;

        } catch (Exception e) {
            log.error("Erreur lors de la conversion de l'exportateur en DTO: {}", e.getMessage(), e);
            throw new ImportateurException("Erreur lors de la conversion des données de l'exportateur", e);
        }
    }
}