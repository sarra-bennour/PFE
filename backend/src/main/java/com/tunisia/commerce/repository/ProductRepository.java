package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query("SELECT p FROM Product p WHERE p.id IN (SELECT dp.produit.id FROM DemandeProduit dp WHERE dp.demande.exportateur.id = :exportateurId)")
    List<Product> findByExportateurId(@Param("exportateurId") Long exportateurId);
    @Query("SELECT p FROM Product p WHERE p.id IN (SELECT dp.produit.id FROM DemandeProduit dp WHERE dp.demande.id = :demandeId)")
    List<Product> findByDemandeId(@Param("demandeId") Long demandeId);
    List<Product> findByProductNameContainingIgnoreCase(String productName);
    List<Product> findByHsCodeContainingIgnoreCase(String hsCode);
    List<Product> findByProductNameContainingIgnoreCaseOrHsCodeContainingIgnoreCase(String productName, String hsCode);
    @Query("SELECT p FROM Product p WHERE " +
            "LOWER(p.productName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(p.hsCode) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Product> findByProductNameContainingIgnoreCaseOrHsCodeContaining(
            @Param("searchTerm") String searchTerm
    );
}
