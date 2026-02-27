package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DemandeHistoryRepository extends JpaRepository<DemandeHistory, Long> {
    List<DemandeHistory> findByDemandeIdOrderByPerformedAtDesc(Long demandeId);
}