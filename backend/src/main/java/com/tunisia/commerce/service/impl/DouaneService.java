package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.admin.DouaneVerificationResponse;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.DemandeProduit;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.Product;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.TypeDemande;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DouaneService {

    private static final Logger log = LoggerFactory.getLogger(DouaneService.class);

    private final DemandeEnregistrementRepository demandeRepository;

    /**
     * Vérifie une référence de dossier (Demande d'enregistrement exportateur ou Déclaration produit)
     * Accessible par ADMIN et DOUANE
     * Ne retourne que les dossiers validés (status = VALIDEE)
     */
    @Transactional(readOnly = true)
    public DouaneVerificationResponse verifyReference(String reference) {
        log.info("=== VÉRIFICATION RÉFÉRENCE DOUANE: {} ===", reference);

        // Rechercher la demande par référence
        DemandeEnregistrement demande = demandeRepository.findByReference(reference)
                .orElse(null);

        // Vérifier si la demande existe et est validée
        if (demande == null) {
            log.warn("Référence non trouvée: {}", reference);
            return null;
        }

        if (demande.getStatus() != DemandeStatus.VALIDEE) {
            log.warn("Demande trouvée mais non validée. Statut actuel: {}", demande.getStatus());
            return null;
        }

        // Vérifier que le type est REGISTRATION ou PRODUCT_DECLARATION
        if (demande.getTypeDemande() != TypeDemande.REGISTRATION &&
                demande.getTypeDemande() != TypeDemande.PRODUCT_DECLARATION) {
            log.warn("Type de demande non supporté: {}", demande.getTypeDemande());
            return null;
        }

        // Construire la réponse
        return buildResponse(demande);
    }

    /**
     * Construit la réponse selon le type de demande
     */
    private DouaneVerificationResponse buildResponse(DemandeEnregistrement demande) {
        ExportateurEtranger exportateur = demande.getExportateur();

        DouaneVerificationResponse.DouaneVerificationResponseBuilder builder = DouaneVerificationResponse.builder()
                .reference(demande.getReference())
                .typeDemande(demande.getTypeDemande().name())
                .status(demande.getStatus().name())
                .numeroAgrement(demande.getNumeroAgrement())
                .dateAgrement(demande.getDateAgrement())
                .submittedAt(demande.getSubmittedAt())
                .decisionDate(demande.getDecisionDate())
                .decisionComment(demande.getDecisionComment());

        // Ajouter les informations de l'exportateur
        if (exportateur != null) {
            builder.exportateurRaisonSociale(exportateur.getRaisonSociale())
                    .exportateurNom(exportateur.getNom())
                    .exportateurPrenom(exportateur.getPrenom())
                    .exportateurRepresentantLegal(exportateur.getRepresentantLegal())
                    .exportateurPaysOrigine(exportateur.getPaysOrigine())
                    .exportateurNumeroRegistreCommerce(exportateur.getNumeroRegistreCommerce())
                    .exportateurVille(exportateur.getVille())
                    .exportateurAdresseLegale(exportateur.getAdresseLegale())
                    .exportateurEmail(exportateur.getEmail())
                    .exportateurTelephone(exportateur.getTelephone());
        }

        // Si c'est une déclaration produit, ajouter les produits
        if (demande.getTypeDemande() == TypeDemande.PRODUCT_DECLARATION) {
            builder.products(buildProductsInfo(demande));
        }

        return builder.build();
    }

    /**
     * Construit la liste des produits associés à la demande
     */
    private java.util.List<DouaneVerificationResponse.ProductInfo> buildProductsInfo(DemandeEnregistrement demande) {
        if (demande.getDemandeProduits() == null || demande.getDemandeProduits().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return demande.getDemandeProduits().stream()
                .map(demandeProduit -> {
                    Product product = demandeProduit.getProduit();
                    if (product == null) return null;

                    return DouaneVerificationResponse.ProductInfo.builder()
                            .id(product.getId())
                            .productName(product.getProductName())
                            .productType(product.getProductType())
                            .hsCode(product.getHsCode())
                            .category(product.getCategory())
                            .originCountry(product.getOriginCountry())
                            .brandName(product.getBrandName())
                            .annualQuantityValue(product.getAnnualQuantityValue())
                            .annualQuantityUnit(product.getAnnualQuantityUnit())
                            .build();
                })
                .filter(p -> p != null)
                .collect(Collectors.toList());
    }
}