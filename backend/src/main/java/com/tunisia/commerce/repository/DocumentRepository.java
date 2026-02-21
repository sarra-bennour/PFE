package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.enums.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByExportateurIdAndStatus(Long exportateurId, DocumentStatus status);
    List<Document> findByDemandeId(Long demandeId);
    List<Document> findByProductId(Long productId);

}

