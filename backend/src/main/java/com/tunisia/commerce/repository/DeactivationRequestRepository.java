package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.enums.DeactivationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeactivationRequestRepository extends JpaRepository<DeactivationRequest, Long> {

    // Trouver toutes les demandes d'un utilisateur
    List<DeactivationRequest> findByUserIdOrderByRequestDateDesc(Long userId);
    // Vérifier si un utilisateur a une demande en cours
    boolean existsByUserIdAndStatusIn(Long userId, List<DeactivationStatus> statuses);
}