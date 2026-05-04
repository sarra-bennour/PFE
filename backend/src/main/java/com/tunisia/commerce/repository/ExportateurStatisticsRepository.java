// repository/ExportateurStatisticsRepository.java
package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.ExportateurEtranger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExportateurStatisticsRepository extends JpaRepository<ExportateurEtranger, Long> {
// repository/ExportateurStatisticsRepository.java


    @Query("SELECT e.paysOrigine, COUNT(e) FROM ExportateurEtranger e " +
            "WHERE e.userStatut = 'ACTIF' AND e.isEmailVerified = true " +
            "GROUP BY e.paysOrigine ORDER BY COUNT(e) DESC")
    List<Object[]> getExportateurCountByPays();

    @Query(value = "SELECT " +
            "   EXTRACT(YEAR FROM u.date_creation) as annee, " +
            "   EXTRACT(MONTH FROM u.date_creation) as mois, " +
            "   COUNT(e.id) as count " +
            "FROM exportateurs e " +
            "INNER JOIN users u ON e.id = u.id " +
            "WHERE u.user_statut = 'ACTIF' " +
            "AND e.is_email_verified = true " +
            "AND u.date_creation >= :dateDebut " +
            "GROUP BY EXTRACT(YEAR FROM u.date_creation), EXTRACT(MONTH FROM u.date_creation) " +
            "ORDER BY annee DESC, mois DESC", nativeQuery = true)
    List<Object[]> findMonthlyRegistrations(@Param("dateDebut") LocalDateTime dateDebut);

    @Query("SELECT COUNT(e) FROM ExportateurEtranger e " +
            "WHERE e.userStatut = 'ACTIF' AND e.isEmailVerified = true " +
            "AND e.dateCreation BETWEEN :startDate AND :endDate")
    Long countExportateursBetweenDates(@Param("startDate") LocalDateTime startDate,
                                       @Param("endDate") LocalDateTime endDate);
}