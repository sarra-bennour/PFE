package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.enums.DeactivationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
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

    // Trouver la dernière demande d'un utilisateur
    Optional<DeactivationRequest> findFirstByUserIdOrderByRequestDateDesc(Long userId);

    // Trouver toutes les demandes en attente
    List<DeactivationRequest> findByStatusOrderByRequestDateAsc(DeactivationStatus status);

    // Trouver les demandes urgentes en attente
    List<DeactivationRequest> findByStatusAndIsUrgentTrueOrderByRequestDateAsc(DeactivationStatus status);

    // Compter les demandes en attente
    long countByStatus(DeactivationStatus status);

    // Vérifier si un utilisateur a une demande en cours
    boolean existsByUserIdAndStatusIn(Long userId, List<DeactivationStatus> statuses);

    // Trouver les demandes par période
    @Query("SELECT d FROM DeactivationRequest d WHERE d.requestDate BETWEEN :startDate AND :endDate")
    List<DeactivationRequest> findByDateRange(@Param("startDate") LocalDateTime startDate,
                                              @Param("endDate") LocalDateTime endDate);

    // Trouver les demandes non traitées depuis plus de X jours
    @Query("SELECT d FROM DeactivationRequest d WHERE d.status = 'PENDING' AND d.requestDate < :date")
    List<DeactivationRequest> findPendingRequestsOlderThan(@Param("date") LocalDateTime date);

    // Statistiques par mois
    @Query("SELECT FUNCTION('MONTH', d.requestDate), COUNT(d) FROM DeactivationRequest d " +
            "WHERE FUNCTION('YEAR', d.requestDate) = :year GROUP BY FUNCTION('MONTH', d.requestDate)")
    List<Object[]> getMonthlyStats(@Param("year") int year);
}