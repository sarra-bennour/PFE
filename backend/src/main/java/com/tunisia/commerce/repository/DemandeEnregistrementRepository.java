package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.enums.DemandeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DemandeEnregistrementRepository extends JpaRepository<DemandeEnregistrement, Long> {
    Optional<DemandeEnregistrement> findByExportateurId(Long exportateurId);
    Optional<DemandeEnregistrement> findByReference(String reference);
    List<DemandeEnregistrement> findByStatus(DemandeStatus status);
    List<DemandeEnregistrement> findByAssignedTo(Long agentId);
    List<DemandeEnregistrement> findByStatusIn(Collection<DemandeStatus> statuses);


    @Query("SELECT d FROM DemandeEnregistrement d WHERE d.status = :status AND d.assignedTo IS NULL")
    List<DemandeEnregistrement> findUnassignedByStatus(DemandeStatus status);
}

