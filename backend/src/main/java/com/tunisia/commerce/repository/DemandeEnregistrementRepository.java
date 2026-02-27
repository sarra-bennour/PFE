package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.enums.DemandeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DemandeEnregistrementRepository extends JpaRepository<DemandeEnregistrement, Long> {

    // Nouvelle méthode pour trouver la demande de conformité (KYC)
    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.exportateur.id = :exportateurId AND d.reference LIKE 'DOS-%' ORDER BY d.id DESC")
    Optional<DemandeEnregistrement> findDossierConformiteByExportateurId(@Param("exportateurId") Long exportateurId);

    // Nouvelle méthode pour trouver la dernière demande de produits
    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.exportateur.id = :exportateurId AND d.reference LIKE 'DEM-%' ORDER BY d.id DESC")
    List<DemandeEnregistrement> findDeclarationsProduitsByExportateurId(@Param("exportateurId") Long exportateurId);

    // Méthode pour trouver toutes les demandes d'un exportateur (si besoin)
    List<DemandeEnregistrement> findAllByExportateurIdOrderByIdDesc(Long exportateurId);

    Optional<DemandeEnregistrement> findByExportateurId(Long exportateurId);
    Optional<DemandeEnregistrement> findByReference(String reference);
    List<DemandeEnregistrement> findByStatus(DemandeStatus status);
    List<DemandeEnregistrement> findByAssignedTo(Long agentId);
    List<DemandeEnregistrement> findByStatusIn(Collection<DemandeStatus> statuses);
    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.status = :status AND d.assignedTo IS NULL")
    List<DemandeEnregistrement> findUnassignedByStatus(DemandeStatus status);
    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.exportateur.id = :exportateurId ORDER BY d.submittedAt DESC")
    List<DemandeEnregistrement> findLatestByExportateur(@Param("exportateurId") Long exportateurId);
    @Query("SELECT COUNT(d) FROM DemandeEnregistrement d WHERE d.exportateur.id = :exportateurId AND d.status = :status")
    long countByExportateurIdAndStatus(@Param("exportateurId") Long exportateurId, @Param("status") DemandeStatus status);
    boolean existsByReference(String reference);
}

