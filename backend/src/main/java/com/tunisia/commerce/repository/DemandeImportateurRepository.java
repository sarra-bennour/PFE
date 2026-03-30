package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeImportateur;
import com.tunisia.commerce.enums.DemandeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DemandeImportateurRepository extends JpaRepository<DemandeImportateur, Long> {
    List<DemandeImportateur> findByImportateurId(Long importateurId);
    List<DemandeImportateur> findByStatus(DemandeStatus status);

}