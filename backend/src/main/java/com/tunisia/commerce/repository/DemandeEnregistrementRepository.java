package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.PaymentStatus;
import com.tunisia.commerce.enums.TypeDemande;
import com.tunisia.commerce.enums.TypeDemandeur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DemandeEnregistrementRepository extends JpaRepository<DemandeEnregistrement, Long> {

    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.exportateur.id = :exportateurId AND d.typeDemande = :typeDemande ORDER BY d.id DESC")
    List<DemandeEnregistrement> findDemandeByExportateurIdetTypeDemande(
            @Param("exportateurId") Long exportateurId,
            @Param("typeDemande") TypeDemande typeDemande
    );


    List<DemandeEnregistrement> findByExportateurId(Long exportateurId);
    long countByExportateurIdAndStatusIn(Long exportateurId, List<DemandeStatus> statuses);
    List<DemandeEnregistrement> findByImportateurIdAndStatusIn(Long importateurId, List<DemandeStatus> statuses);
    @Query("SELECT DISTINCT d FROM DemandeEnregistrement d " +
            "JOIN d.demandeProduits dp " +
            "WHERE dp.type = :typeDemandeur")
    List<DemandeEnregistrement> findByTypeDemandeur(@Param("typeDemandeur") TypeDemandeur typeDemandeur);

    // Pour l'archivage automatique
    List<DemandeEnregistrement> findByStatusInAndDecisionDateBefore(
            List<DemandeStatus> statuses,
            LocalDateTime date
    );

    List<DemandeEnregistrement> findByPaymentStatusAndSubmittedAtBefore(
            PaymentStatus paymentStatus,
            LocalDateTime date
    );

    List<DemandeEnregistrement> findByStatusAndDateAgrementBefore(
            DemandeStatus status,
            LocalDate date
    );

    // Pour la gestion des archives
    List<DemandeEnregistrement> findByArchivedTrue();

    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.archived = true AND d.exportateur.email = :email")
    List<DemandeEnregistrement> findArchivedByExportateurEmail(@Param("email") String email);

    // Pour IMPORTATEUR : ne retourner que les demandes où il est l'importateur
    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.archived = true AND d.importateur.email = :email")
    List<DemandeEnregistrement> findArchivedByImportateurEmail(@Param("email") String email);

    // Nouvelle méthode pour les demandes actives
    List<DemandeEnregistrement> findByArchivedFalse();
    Optional<DemandeEnregistrement> findByReference(String reference);

}

