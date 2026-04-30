package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.AuditLog;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    // Version avec pagination
    @Query("SELECT a FROM AuditLog a WHERE " +
            "(:action IS NULL OR a.action = :action) " +
            "AND (:actionType IS NULL OR a.actionType = :actionType) " +
            "AND (:entityType IS NULL OR a.entityType = :entityType) " +
            "AND (:entityId IS NULL OR a.entityId = :entityId) " +
            "AND (:userEmail IS NULL OR a.userEmail = :userEmail) " +
            "AND (:status IS NULL OR a.status = :status) " +
            "AND (:startDate IS NULL OR a.performedAt >= :startDate) " +
            "AND (:endDate IS NULL OR a.performedAt <= :endDate) " +
            "ORDER BY a.performedAt DESC")
    Page<AuditLog> searchAuditLogs(
            @Param("action") String action,
            @Param("actionType") ActionType actionType,
            @Param("entityType") EntityType entityType,
            @Param("entityId") Long entityId,
            @Param("userEmail") String userEmail,
            @Param("status") String status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    // Recherche par terme avec pagination
    @Query("SELECT a FROM AuditLog a WHERE " +
            "LOWER(a.action) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
            "LOWER(a.description) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
            "LOWER(a.entityReference) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
            "LOWER(a.userEmail) LIKE LOWER(CONCAT('%', :term, '%')) " +
            "ORDER BY a.performedAt DESC")
    Page<AuditLog> searchByTerm(@Param("term") String term, Pageable pageable);

    // Récupérer tous les logs avec pagination
    Page<AuditLog> findAllByOrderByPerformedAtDesc(Pageable pageable);

    // Récupérer par utilisateur avec pagination
    Page<AuditLog> findByUserIdOrderByPerformedAtDesc(Long userId, Pageable pageable);

    // Récupérer par entité avec pagination
    Page<AuditLog> findByEntityTypeAndEntityIdOrderByPerformedAtDesc(EntityType entityType, Long entityId, Pageable pageable);

    // Récupérer par date avec pagination
    Page<AuditLog> findByPerformedAtBetweenOrderByPerformedAtDesc(LocalDateTime start, LocalDateTime end, Pageable pageable);

    // Version sans pagination pour statistiques
    List<AuditLog> findByPerformedAtBetweenOrderByPerformedAtDesc(LocalDateTime start, LocalDateTime end);

    // Top 100 (pour "latest")
    List<AuditLog> findTop100ByOrderByPerformedAtDesc();

    // Statistiques (inchangées)
    @Query("SELECT a.actionType, COUNT(a) FROM AuditLog a WHERE a.performedAt BETWEEN :start AND :end GROUP BY a.actionType")
    List<Object[]> countByActionTypeAndDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT FUNCTION('DATE', a.performedAt), COUNT(a) FROM AuditLog a WHERE a.performedAt BETWEEN :start AND :end GROUP BY FUNCTION('DATE', a.performedAt) ORDER BY FUNCTION('DATE', a.performedAt) DESC")
    List<Object[]> countByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a.userEmail, COUNT(a) FROM AuditLog a WHERE a.performedAt BETWEEN :start AND :end GROUP BY a.userEmail ORDER BY COUNT(a) DESC")
    List<Object[]> findMostActiveUsers(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a.userIpAddress, COUNT(a) FROM AuditLog a WHERE a.performedAt > :since AND a.status = 'FAILURE' GROUP BY a.userIpAddress ORDER BY COUNT(a) DESC")
    List<Object[]> findSuspiciousIps(@Param("since") LocalDateTime since);
}