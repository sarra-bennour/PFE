package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.TypeDemandeur;
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
    List<DemandeEnregistrement> findByExportateurId(Long exportateurId);
    @Query("SELECT COUNT(d) FROM DemandeEnregistrement d WHERE d.exportateur.id = :exportateurId AND d.status = :status")
    long countByExportateurIdAndStatus(@Param("exportateurId") Long exportateurId, @Param("status") DemandeStatus status);
    long countByExportateurIdAndStatusIn(Long exportateurId, List<DemandeStatus> statuses);
    List<DemandeEnregistrement> findByImportateurIdAndStatusIn(Long importateurId, List<DemandeStatus> statuses);
    List<DemandeEnregistrement> findByTypeDemandeur(TypeDemandeur typeDemandeur);

}

