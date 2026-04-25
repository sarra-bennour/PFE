package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.archive.ArchiveDemandeDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArchiveService {

    private final DemandeEnregistrementRepository demandeRepository;
    private final Logger logger = Logger.getLogger(getClass().getName());

    // 1. Archivage automatique (tous les jours à 2h du matin)
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void automaticArchive() {
        logger.info("=== DÉBUT ARCHIVAGE AUTOMATIQUE ===");

        // Scénario 1: Demandes validées ou rejetées depuis +90 jours
        archiveCompletedDemandes();

        // Scénario 2: Demandes avec paiement échoué depuis +30 jours
        archiveFailedPaymentDemandes();

        // Scénario 3: Demandes avec agrément expiré depuis +12 mois
        archiveExpiredAgrementDemandes();

        logger.info("=== FIN ARCHIVAGE AUTOMATIQUE ===");
    }

    // 2. Archivage manuel par l'admin
    @Transactional
    public void manualArchive(Long demandeId, String adminEmail, String reason) {
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        // Vérifier que la demande n'est pas déjà archivée
        if (demande.isArchived()) {
            throw new RuntimeException("Cette demande est déjà archivée");
        }

        archiveDemande(demande, ArchiveType.MANUAL_ADMIN, adminEmail, reason);
        logger.info("Demande " + demandeId + " archivée manuellement par " + adminEmail);
    }

    // 3. Archivage par l'utilisateur (exportateur/importateur)
    @Transactional
    public void userArchiveRequest(Long demandeId, String userEmail) {
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        // Vérifier que l'utilisateur est propriétaire de la demande
        boolean isOwner = (demande.getExportateur() != null && demande.getExportateur().getEmail().equals(userEmail)) ||
                (demande.getImportateur() != null && demande.getImportateur().getEmail().equals(userEmail));

        if (!isOwner) {
            throw new RuntimeException("Non autorisé à archiver cette demande");
        }

        if (demande.isArchived()) {
            throw new RuntimeException("Cette demande est déjà archivée");
        }

        archiveDemande(demande, ArchiveType.USER_REQUEST, userEmail, "Demande d'archivage par l'utilisateur");
        logger.info("Demande " + demandeId + " archivée à la demande de " + userEmail);
    }

    // 4. Archivage multiple par l'admin
    @Transactional
    public void bulkArchive(List<Long> demandeIds, String adminEmail, String reason) {
        int archivedCount = 0;
        for (Long id : demandeIds) {
            try {
                manualArchive(id, adminEmail, reason);
                archivedCount++;
            } catch (Exception e) {
                logger.warning("Erreur lors de l'archivage de la demande " + id + ": " + e.getMessage());
            }
        }
        logger.info(archivedCount + " demandes archivées sur " + demandeIds.size());
    }

    // 5. Restauration d'une demande archivée
    @Transactional
    public void restoreDemande(Long demandeId, String adminEmail) {
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        if (!demande.isArchived()) {
            throw new RuntimeException("Cette demande n'est pas archivée");
        }

        if (!demande.isCanBeRestored()) {
            throw new RuntimeException("Cette demande ne peut pas être restaurée");
        }

        demande.setArchived(false);
        demande.setArchivedAt(null);
        demande.setArchivedBy(null);
        demande.setArchiveReason(null);
        demande.setArchiveType(null);
        demande.setCanBeRestored(true);

        demandeRepository.save(demande);
        logger.info("Demande " + demandeId + " restaurée par " + adminEmail);
    }

    // 6. Récupérer toutes les demandes archivées
    public List<DemandeEnregistrement> getArchivedDemandes() {
        return demandeRepository.findByArchivedTrue();
    }

    // 7. Récupérer les demandes archivées par utilisateur
    public List<ArchiveDemandeDTO> getArchivedDemandesByUser(String userEmail, String userRole) {
        logger.info("Recherche des demandes archivées pour: " + userEmail + " avec rôle: " + userRole);

        List<DemandeEnregistrement> allArchived = demandeRepository.findByArchivedTrue();

        List<DemandeEnregistrement> filteredDemandes = new ArrayList<>();

        for (DemandeEnregistrement demande : allArchived) {
            if ("EXPORTATEUR".equals(userRole)) {
                // L'exportateur voit ses propres demandes, mais PAS les demandes d'importation
                boolean isOwnDemande = demande.getExportateur() != null &&
                        userEmail.equals(demande.getExportateur().getEmail()) &&
                        demande.getTypeDemande() != TypeDemande.IMPORT;  // ← Exclure IMPORT

                if (isOwnDemande) {
                    filteredDemandes.add(demande);
                    logger.info("✅ Demande " + demande.getId() + " ajoutée pour exportateur (type: " + demande.getTypeDemande() + ")");
                } else {
                    logger.info("❌ Demande " + demande.getId() + " ignorée pour exportateur (type: " + demande.getTypeDemande() + ")");
                }

            } else if ("IMPORTATEUR".equals(userRole)) {
                // L'importateur voit ses propres demandes d'importation
                boolean isOwnImport = demande.getImportateur() != null &&
                        userEmail.equals(demande.getImportateur().getEmail());

                if (isOwnImport) {
                    filteredDemandes.add(demande);
                    logger.info("✅ Demande " + demande.getId() + " ajoutée pour importateur (type: " + demande.getTypeDemande() + ")");
                }
            }
        }

        logger.info("Total demandes filtrées pour " + userRole + ": " + filteredDemandes.size());

        return filteredDemandes.stream()
                .map(this::convertToArchiveDTO)
                .collect(Collectors.toList());
    }

    // Méthodes privées d'archivage
    private void archiveCompletedDemandes() {
        LocalDateTime thresholdDate = LocalDateTime.now().minusDays(90);
        List<DemandeEnregistrement> demandes = demandeRepository.findByStatusInAndDecisionDateBefore(
                List.of(DemandeStatus.VALIDEE, DemandeStatus.REJETEE),
                thresholdDate
        );

        for (DemandeEnregistrement demande : demandes) {
            if (!demande.isArchived()) {
                archiveDemande(demande, ArchiveType.AUTOMATIC, "SYSTEM",
                        "Archivage automatique après 90 jours");
            }
        }
        logger.info(demandes.size() + " demandes terminées archivées");
    }

    private void archiveFailedPaymentDemandes() {
        LocalDateTime thresholdDate = LocalDateTime.now().minusDays(30);
        List<DemandeEnregistrement> demandes = demandeRepository.findByPaymentStatusAndSubmittedAtBefore(
                PaymentStatus.ECHEC,
                thresholdDate
        );

        for (DemandeEnregistrement demande : demandes) {
            if (!demande.isArchived()) {
                archiveDemande(demande, ArchiveType.AUTOMATIC, "SYSTEM",
                        "Archivage automatique - paiement échoué depuis 30 jours");
            }
        }
        logger.info(demandes.size() + " demandes à paiement échoué archivées");
    }

    private void archiveExpiredAgrementDemandes() {
        LocalDate expiryDate = LocalDate.now().minusMonths(12);
        List<DemandeEnregistrement> demandes = demandeRepository.findByStatusAndDateAgrementBefore(
                DemandeStatus.VALIDEE,
                expiryDate
        );

        for (DemandeEnregistrement demande : demandes) {
            if (!demande.isArchived()) {
                archiveDemande(demande, ArchiveType.EXPIRED_AGRMENT, "SYSTEM",
                        "Archivage automatique - agrément expiré depuis plus d'un an");
            }
        }
        logger.info(demandes.size() + " demandes avec agrément expiré archivées");
    }

    // Ajoute cette méthode dans ArchiveService

    // 8. Vérifier si une demande est archivée
    public boolean isDemandeArchived(Long demandeId) {
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec l'id: " + demandeId));

        return demande.isArchived();
    }

    private void archiveDemande(DemandeEnregistrement demande, ArchiveType type, String archivedBy, String reason) {
        demande.setArchived(true);
        demande.setArchivedAt(LocalDateTime.now());
        demande.setArchivedBy(archivedBy);
        demande.setArchiveReason(reason);
        demande.setArchiveType(type);
        demande.setCanBeRestored(true);  // Les archives manuelles peuvent être restaurées

        demandeRepository.save(demande);
    }


    private ArchiveDemandeDTO convertToArchiveDTO(DemandeEnregistrement demande) {
        ArchiveDemandeDTO.ArchiveDemandeDTOBuilder builder = ArchiveDemandeDTO.builder()
                .id(demande.getId())
                .reference(demande.getReference())
                .status(demande.getStatus())
                .submittedAt(demande.getSubmittedAt())
                .paymentReference(demande.getPaymentReference())
                .paymentAmount(demande.getPaymentAmount())
                .paymentStatus(demande.getPaymentStatus())
                .decisionDate(demande.getDecisionDate())
                .decisionComment(demande.getDecisionComment())
                .numeroAgrement(demande.getNumeroAgrement())
                .dateAgrement(demande.getDateAgrement())
                .type(demande.getTypeDemande())
                // Champs d'archivage
                .archived(demande.isArchived())
                .archivedAt(demande.getArchivedAt())
                .archivedBy(demande.getArchivedBy())
                .archiveReason(demande.getArchiveReason())
                .archiveType(demande.getArchiveType())
                .canBeRestored(demande.isCanBeRestored());

        // 🔥 CORRECTION: Déterminer le type de demandeur
        // Si la demande a un exportateur -> EXPORTATEUR
        // Si la demande a un importateur -> IMPORTATEUR
        if (demande.getExportateur() != null) {
            builder.applicantType(TypeDemandeur.EXPORTATEUR);
            builder.exportateurId(demande.getExportateur().getId())
                    .exportateurNom(demande.getExportateur().getRaisonSociale())
                    .exportateurPays(demande.getExportateur().getPaysOrigine())
                    .exportateurEmail(demande.getExportateur().getEmail());
        } else if (demande.getImportateur() != null) {
            builder.applicantType(TypeDemandeur.IMPORTATEUR);
            builder.importateurId(demande.getImportateur().getId())
                    .importateurNom(demande.getImportateur().getRaisonSociale())
                    .importateurEmail(demande.getImportateur().getEmail());
        }

        return builder.build();
    }
}