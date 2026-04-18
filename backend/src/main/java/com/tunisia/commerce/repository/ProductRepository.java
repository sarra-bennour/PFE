package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
      @Query("SELECT p FROM Product p WHERE p.id IN (SELECT dp.produit.id FROM DemandeProduit dp WHERE dp.demande.id = :demandeId)")
    List<Product> findByProductNameContainingIgnoreCase(String productName);
    @Query("SELECT p FROM Product p WHERE " +
            "LOWER(p.productName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.hsCode) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Product> findByProductNameContainingIgnoreCaseOrHsCodeContaining(
            @Param("searchTerm") String searchTerm
    );
    List<Product> findByHsCode(String hsCode);

    // Récupérer tous les produits d'un exportateur via ses demandes
    @Query("SELECT DISTINCT p FROM Product p " +
            "JOIN p.demandeProduits dp " +
            "JOIN dp.demande d " +
            "WHERE d.exportateur.id = :exportateurId")
    List<Product> findProductsByExportateurId(@Param("exportateurId") Long exportateurId);

    // Récupérer les produits par type (alimentaire/industriel)
    @Query("SELECT DISTINCT p FROM Product p " +
            "JOIN p.demandeProduits dp " +
            "JOIN dp.demande d " +
            "WHERE d.exportateur.id = :exportateurId " +
            "AND p.productType = :productType")
    List<Product> findProductsByExportateurIdAndType(@Param("exportateurId") Long exportateurId,
                                                     @Param("productType") String productType);


}
