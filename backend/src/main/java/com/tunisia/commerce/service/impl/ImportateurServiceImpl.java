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
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
    private final ImportateurRepository importateurRepository;

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
    @Override
    public Map<String, Object> getDashboardStats(Long importateurId) {
        log.info("Calcul des statistiques dashboard pour importateur ID: {}", importateurId);

        Map<String, Object> stats = new HashMap<>();

        try {
            // 1. Récupérer toutes les demandes de l'importateur
            List<DemandeEnregistrement> demandes = demandeRepository.findByImportateurId(importateurId);

            // 2. Calculer le volume mensuel (dernier mois)
            LocalDateTime unMoisAvant = LocalDateTime.now().minusMonths(1);
            BigDecimal volumeMensuel = demandes.stream()
                    .filter(d -> d.getSubmittedAt() != null && d.getSubmittedAt().isAfter(unMoisAvant))
                    .map(DemandeEnregistrement::getPaymentAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            stats.put("volumeMensuel", volumeMensuel);

            // 3. Calculer le score de performance (taux de validation)
            long totalDemandes = demandes.size();
            long demandesValidees = demandes.stream()
                    .filter(d -> d.getStatus() == DemandeStatus.VALIDEE)
                    .count();

            int performanceScore = totalDemandes > 0 ? (int) ((demandesValidees * 100) / totalDemandes) : 0;
            stats.put("performanceScore", performanceScore);

            // 4. Volume par catégorie de produit
            Map<String, BigDecimal> volumeParCategorie = new HashMap<>();
            Map<String, Integer> countParCategorie = new HashMap<>();

            for (DemandeEnregistrement demande : demandes) {
                List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
                for (DemandeProduit dp : demandeProduits) {
                    Product product = dp.getProduit();
                    String category = product.getProductType();
                    if (category == null) category = "AUTRE";

                    BigDecimal amount = demande.getPaymentAmount() != null ? demande.getPaymentAmount() : BigDecimal.ZERO;
                    volumeParCategorie.merge(category, amount, BigDecimal::add);
                    countParCategorie.merge(category, 1, Integer::sum);
                }
            }

            // Calculer les pourcentages
            BigDecimal totalVolume = volumeParCategorie.values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Map<String, Object>> volumeParCategorieList = new ArrayList<>();
            for (Map.Entry<String, BigDecimal> entry : volumeParCategorie.entrySet()) {
                Map<String, Object> cat = new HashMap<>();
                cat.put("name", getCategoryName(entry.getKey()));
                int percentage = totalVolume.compareTo(BigDecimal.ZERO) > 0 ?
                        entry.getValue().multiply(BigDecimal.valueOf(100)).divide(totalVolume, 0, java.math.RoundingMode.HALF_UP).intValue() : 0;
                cat.put("value", percentage);
                volumeParCategorieList.add(cat);
            }

            // Trier par valeur décroissante
            volumeParCategorieList.sort((a, b) -> ((Integer) b.get("value")).compareTo((Integer) a.get("value")));
            stats.put("volumeParCategorie", volumeParCategorieList);

            // 5. Volume par pays d'origine
            Map<String, BigDecimal> volumeParPays = new HashMap<>();
            for (DemandeEnregistrement demande : demandes) {
                List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
                for (DemandeProduit dp : demandeProduits) {
                    Product product = dp.getProduit();
                    String country = product.getOriginCountry();
                    if (country != null && !country.isEmpty()) {
                        BigDecimal amount = demande.getPaymentAmount() != null ? demande.getPaymentAmount() : BigDecimal.ZERO;
                        volumeParPays.merge(country, amount, BigDecimal::add);
                    }
                }
            }

            List<Map<String, Object>> volumeParPaysList = new ArrayList<>();
            for (Map.Entry<String, BigDecimal> entry : volumeParPays.entrySet()) {
                Map<String, Object> pays = new HashMap<>();
                pays.put("name", entry.getKey());
                pays.put("value", entry.getValue());
                volumeParPaysList.add(pays);
            }

            // Trier par volume décroissant et prendre top 4
            volumeParPaysList.sort((a, b) -> ((BigDecimal) b.get("value")).compareTo((BigDecimal) a.get("value")));
            stats.put("volumeParPays", volumeParPaysList.stream().limit(4).collect(Collectors.toList()));

            // 6. Volume hebdomadaire
            List<Map<String, Object>> volumeHebdomadaire = new ArrayList<>();
            String[] jours = {"Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"};
            LocalDateTime now = LocalDateTime.now();

            for (int i = 6; i >= 0; i--) {
                LocalDateTime jour = now.minusDays(i);
                String jourNom = jours[jour.getDayOfWeek().getValue() - 1];

                BigDecimal volumeJour = demandes.stream()
                        .filter(d -> d.getSubmittedAt() != null &&
                                d.getSubmittedAt().toLocalDate().equals(jour.toLocalDate()))
                        .map(DemandeEnregistrement::getPaymentAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                Map<String, Object> jourData = new HashMap<>();
                jourData.put("name", jourNom);
                jourData.put("volume", volumeJour);
                volumeHebdomadaire.add(jourData);
            }

            stats.put("volumeHebdomadaire", volumeHebdomadaire);

            // 7. Top partenaire message
            if (!volumeParPaysList.isEmpty()) {
                Map<String, Object> topPays = volumeParPaysList.get(0);
                String topCountry = (String) topPays.get("name");

                // Déterminer la catégorie principale du top pays
                String mainCategory = "produits";
                for (DemandeEnregistrement demande : demandes) {
                    List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
                    for (DemandeProduit dp : demandeProduits) {
                        Product product = dp.getProduit();
                        if (topCountry.equals(product.getOriginCountry())) {
                            mainCategory = getCategoryName(product.getProductType());
                            break;
                        }
                    }
                }

                stats.put("topPartenaire", topCountry);
                stats.put("topPartenaireMessage", String.format(
                        "%s reste le partenaire principal pour vos importations de %s.",
                        topCountry, mainCategory.toLowerCase()
                ));
            } else {
                stats.put("topPartenaire", "Aucun");
                stats.put("topPartenaireMessage", "Aucune importation enregistrée pour le moment.");
            }

        } catch (Exception e) {
            log.error("Erreur lors du calcul des statistiques: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors du calcul des statistiques", e);
        }

        return stats;
    }

    @Override
    public byte[] generateRapportPDF(Long importateurId) {
        log.info("Génération du rapport PDF pour importateur ID: {}", importateurId);

        try {
            // Récupérer les données
            Map<String, Object> stats = getDashboardStats(importateurId);
            List<DemandeEnregistrement> demandes = demandeRepository.findByImportateurId(importateurId);
            ImportateurTunisien importateur = importateurRepository.findById(importateurId).orElse(null);

            // Créer un document PDF avec iText
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc, PageSize.A4);

            PdfFont font = PdfFontFactory.createFont("Helvetica");
            PdfFont boldFont = PdfFontFactory.createFont("Helvetica-Bold");



            // En-tête
            document.add(new Paragraph("RAPPORT D'IMPORTATION")
                    .setFont(boldFont)
                    .setFontSize(18)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20));

            document.add(new Paragraph("Généré le: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setFont(font)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(30));

            // Informations importateur
            if (importateur != null) {
                document.add(new Paragraph("INFORMATIONS IMPORTATEUR")
                        .setFont(boldFont)
                        .setFontSize(14)
                        .setMarginBottom(10));

                document.add(new Paragraph("Raison Sociale: " + (importateur.getRaisonSociale() != null ? importateur.getRaisonSociale() : "N/A"))
                        .setFont(font)
                        .setFontSize(11)
                        .setMarginBottom(5));

                document.add(new Paragraph("Email: " + importateur.getEmail())
                        .setFont(font)
                        .setFontSize(11)
                        .setMarginBottom(5));

                document.add(new Paragraph("Téléphone: " + (importateur.getTelephone() != null ? importateur.getTelephone() : "N/A"))
                        .setFont(font)
                        .setFontSize(11)
                        .setMarginBottom(20));
            }

            // Statistiques
            document.add(new Paragraph("STATISTIQUES GLOBALES")
                    .setFont(boldFont)
                    .setFontSize(14)
                    .setMarginBottom(10));

            // Créer un tableau pour les stats
            Table statsTable = new Table(2);
            statsTable.addCell(new Cell().add(new Paragraph("Volume Mensuel").setFont(boldFont)));
            statsTable.addCell(new Cell().add(new Paragraph(stats.get("volumeMensuel") + " TND").setFont(font)));
            statsTable.addCell(new Cell().add(new Paragraph("Score Performance").setFont(boldFont)));
            statsTable.addCell(new Cell().add(new Paragraph(stats.get("performanceScore") + "%").setFont(font)));

            document.add(statsTable);
            document.add(new Paragraph(" "));

            // Liste des demandes
            document.add(new Paragraph("LISTE DES DEMANDES")
                    .setFont(boldFont)
                    .setFontSize(14)
                    .setMarginBottom(10));

            // Créer un tableau pour les demandes
            Table table = new Table(5);
            table.addCell(new Cell().add(new Paragraph("Référence").setFont(boldFont)));
            table.addCell(new Cell().add(new Paragraph("Date").setFont(boldFont)));
            table.addCell(new Cell().add(new Paragraph("Montant").setFont(boldFont)));
            table.addCell(new Cell().add(new Paragraph("Statut").setFont(boldFont)));
            table.addCell(new Cell().add(new Paragraph("Pays Origine").setFont(boldFont)));

            for (DemandeEnregistrement demande : demandes) {
                List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demande.getId());
                String pays = demandeProduits.isEmpty() ? "N/A" :
                        demandeProduits.get(0).getProduit().getOriginCountry();

                table.addCell(new Cell().add(new Paragraph(demande.getReference() != null ? demande.getReference() : "N/A").setFont(font)));
                table.addCell(new Cell().add(new Paragraph(demande.getSubmittedAt() != null ?
                        demande.getSubmittedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A").setFont(font)));
                table.addCell(new Cell().add(new Paragraph(demande.getPaymentAmount() != null ?
                        demande.getPaymentAmount().toString() + " TND" : "0 TND").setFont(font)));
                table.addCell(new Cell().add(new Paragraph(demande.getStatus() != null ?
                        demande.getStatus().toString() : "N/A").setFont(font)));
                table.addCell(new Cell().add(new Paragraph(pays).setFont(font)));
            }

            document.add(table);

            // Pied de page
            document.add(new Paragraph(" ")
                    .setMarginTop(30));
            document.add(new Paragraph("Ce rapport est généré automatiquement. Pour toute question, veuillez contacter le support.")
                    .setFont(font)
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.CENTER));

            // Fermer le document
            document.close();

            byte[] pdfBytes = out.toByteArray();
            log.info("PDF généré avec succès, taille: {} bytes", pdfBytes.length);

            return pdfBytes;

        } catch (Exception e) {
            log.error("Erreur lors de la génération du PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la génération du rapport PDF", e);
        }
    }

    private String getCategoryName(String productType) {
        if (productType == null) return "Autre";
        switch (productType.toLowerCase()) {
            case "alimentaire": return "Alimentaire";
            case "industriel": return "Industriel";
            case "textile": return "Textile";
            case "electronique": return "Électronique";
            case "chimique": return "Chimique";
            default: return "Autre";
        }
    }
}