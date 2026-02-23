package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.enums.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByExportateurIdAndStatus(Long exportateurId, DocumentStatus status);
    List<Document> findByDemandeId(Long demandeId);
    Optional<Document> findByIdAndExportateurId(Long id, Long exportateurId);
    long countByExportateurId(Long exportateurId);
    List<Document> findByExportateurId(Long exportateurId);
}

