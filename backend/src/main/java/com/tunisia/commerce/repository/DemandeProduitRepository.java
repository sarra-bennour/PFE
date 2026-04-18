package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeHistory;
import com.tunisia.commerce.entity.DemandeProduit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DemandeProduitRepository extends JpaRepository<DemandeProduit, Long> {
    List<DemandeProduit> findByDemandeId(Long demandeId);
    List<DemandeProduit> findByProduitId(Long produitId);
    boolean existsByDemandeIdAndProduitId(Long demandeId, Long produitId);
    void deleteByDemandeIdAndProduitId(Long demandeId, Long produitId);
}
