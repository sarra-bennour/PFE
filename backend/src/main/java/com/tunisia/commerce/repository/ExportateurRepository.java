package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.enums.StatutAgrement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExportateurRepository extends JpaRepository<ExportateurEtranger, Long> {
    Optional<ExportateurEtranger> findByEmail(String email);
    boolean existsByNumeroRegistreCommerce(String numeroRegistreCommerce);
    @Query("SELECT e FROM ExportateurEtranger e WHERE e.verificationToken = :token")
    Optional<ExportateurEtranger> findByVerificationToken(@Param("token") String token);
    boolean existsByUsername(String username);
    // Recherche par statut d'agrément uniquement
    List<ExportateurEtranger> findByStatutAgrement(StatutAgrement statutAgrement);
    // Recherche multi-critères avec JPQL (uniquement statut d'agrément)
    // Dans ExportateurRepository
    @Query("SELECT DISTINCT e FROM ExportateurEtranger e " +
            "LEFT JOIN e.demandes d " +
            "LEFT JOIN d.demandeProduits dp " +
            "LEFT JOIN dp.produit p " +
            "WHERE (LOWER(e.paysOrigine) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(e.raisonSociale) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.hsCode) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND d.status = 'VALIDEE' " +
            "AND d.paymentStatus = 'REUSSI'")
    List<ExportateurEtranger> findBySearchCriteriaWithValidDemandes(@Param("searchTerm") String searchTerm);
    Optional<ExportateurEtranger> findByResetPasswordToken(String token);


}