package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.TypeDemande;
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

    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.exportateur.id = :exportateurId AND d.typeDemande = :typeDemande ORDER BY d.id DESC")
    List<DemandeEnregistrement> findDemandeByExportateurIdetTypeDemande(
            @Param("exportateurId") Long exportateurId,
            @Param("typeDemande") TypeDemande typeDemande
    );


    List<DemandeEnregistrement> findByExportateurId(Long exportateurId);
    @Query("SELECT COUNT(d) FROM DemandeEnregistrement d WHERE d.exportateur.id = :exportateurId AND d.status = :status")
    long countByExportateurIdAndStatus(@Param("exportateurId") Long exportateurId, @Param("status") DemandeStatus status);
    long countByExportateurIdAndStatusIn(Long exportateurId, List<DemandeStatus> statuses);
    List<DemandeEnregistrement> findByImportateurIdAndStatusIn(Long importateurId, List<DemandeStatus> statuses);
    List<DemandeEnregistrement> findByTypeDemande(TypeDemande typeDemande);
    @Query("SELECT DISTINCT d FROM DemandeEnregistrement d " +
            "JOIN d.demandeProduits dp " +
            "WHERE dp.type = :typeDemandeur")
    List<DemandeEnregistrement> findByTypeDemandeur(@Param("typeDemandeur") TypeDemandeur typeDemandeur);

}

