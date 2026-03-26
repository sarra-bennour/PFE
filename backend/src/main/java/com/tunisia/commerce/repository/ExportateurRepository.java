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
    Optional<ExportateurEtranger> findByResetPasswordToken(String token);

    boolean existsByUsername(String username);
    boolean existsByNumeroOfficielEnregistrement(String numeroOfficielEnregistrement);
    // Recherche par statut d'agrément uniquement
    List<ExportateurEtranger> findByStatutAgrement(StatutAgrement statutAgrement);

    // Recherche par pays et statut d'agrément
    List<ExportateurEtranger> findByPaysOrigineContainingIgnoreCaseAndStatutAgrement(
            String pays,
            StatutAgrement statutAgrement
    );

    // Recherche par raison sociale et statut d'agrément
    List<ExportateurEtranger> findByRaisonSocialeContainingIgnoreCaseAndStatutAgrement(
            String raisonSociale,
            StatutAgrement statutAgrement
    );

    // Recherche par ID avec validation du statut d'agrément
    Optional<ExportateurEtranger> findByIdAndStatutAgrement(
            Long id,
            StatutAgrement statutAgrement
    );

    // Recherche multi-critères avec JPQL (uniquement statut d'agrément)
    @Query("SELECT DISTINCT e FROM ExportateurEtranger e " +
            "LEFT JOIN e.demandes d " +
            "LEFT JOIN d.demandeProduits dp " +
            "LEFT JOIN dp.produit p " +
            "WHERE (LOWER(e.paysOrigine) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(e.raisonSociale) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.hsCode) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<ExportateurEtranger> findBySearchCriteria(@Param("searchTerm") String searchTerm);

}