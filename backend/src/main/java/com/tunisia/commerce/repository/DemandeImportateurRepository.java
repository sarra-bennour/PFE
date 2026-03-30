package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeImportateur;
import com.tunisia.commerce.enums.DemandeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;

public interface DemandeImportateurRepository extends JpaRepository<DemandeImportateur, Long> {
    List<DemandeImportateur> findByImportateurId(Long importateurId);
    List<DemandeImportateur> findByStatus(DemandeStatus status);

    @Query("SELECT d.id as id, " +
            "d.reference as reference, " +
            "d.status as status, " +
            "d.submittedAt as submittedAt, " +
            "d.amount as amount, " +
            "d.currency as currency, " +
            "d.transportMode as transportMode, " +
            "e.raisonSociale as exportateurName, " +
            "e.paysOrigine as exportateurCountry, " +
            "p.productName as productName, " +
            "p.hsCode as hsCode, " +
            "p.category as category, " +
            "p.originCountry as originCountry " +
            "FROM DemandeImportateur d " +
            "JOIN d.demandeProduits dp " +
            "JOIN dp.produit p " +
            "JOIN d.exportateur e " +
            "WHERE d.importateur.id = :importateurId " +
            "ORDER BY d.submittedAt DESC")
    List<Map<String, Object>> findTrackingDataProjection(@Param("importateurId") Long importateurId);

}