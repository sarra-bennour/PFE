package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.enums.DocumentStatus;
import com.tunisia.commerce.enums.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByDemandeId(Long demandeId);
    // Dans DocumentRepository.java
    List<Document> findByDemandeIdAndStatus(Long demandeId, DocumentStatus status);
    Optional<Document> findByDemandeIdAndProductIdAndDocumentType(Long demandeId, Long productId, DocumentType documentType);
}

