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
import java.util.Map;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByUserIdOrderByPerformedAtDesc(Long userId, Pageable pageable);

    Page<AuditLog> findByEntityTypeAndEntityIdOrderByPerformedAtDesc(EntityType entityType, Long entityId, Pageable pageable);

    List<AuditLog> findByPerformedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT a FROM AuditLog a WHERE a.actionType = :actionType AND a.performedAt BETWEEN :start AND :end")
    List<AuditLog> findByActionTypeAndDateRange(@Param("actionType") ActionType actionType,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    // Statistiques
    @Query("SELECT a.action, COUNT(a) FROM AuditLog a WHERE a.performedAt BETWEEN :start AND :end GROUP BY a.action")
    List<Object[]> countActionsByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a.userEmail, COUNT(a) FROM AuditLog a WHERE a.performedAt BETWEEN :start AND :end GROUP BY a.userEmail ORDER BY COUNT(a) DESC")
    List<Object[]> findMostActiveUsers(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Détection d'activités suspectes
    @Query("SELECT a FROM AuditLog a WHERE a.status = 'FAILURE' AND a.performedAt > :since ORDER BY a.performedAt DESC")
    List<AuditLog> findRecentFailures(@Param("since") LocalDateTime since);

    @Query("SELECT a FROM AuditLog a WHERE a.userIpAddress = :ip AND a.performedAt > :since")
    List<AuditLog> findByIpAddressAndDate(@Param("ip") String ip, @Param("since") LocalDateTime since);
}