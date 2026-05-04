package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.statistics.ExporterStatisticsDTO;
import com.tunisia.commerce.service.impl.ExporterStatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Statistics", description = "API pour les statistiques des exportateurs")
@CrossOrigin(origins = "*")
public class ExporterStatisticsController {

    private final ExporterStatisticsService statisticsService;

    /**
     * Récupère toutes les statistiques des exportateurs pour la carte
     * Accessible à tous (read-only)
     */
    @GetMapping("/exporters/map")
    @Operation(summary = "Statistiques exportateurs pour la carte",
            description = "Retourne le nombre d'exportateurs par pays, densité, et évolution")
    public ResponseEntity<Map<String, Object>> getExporterMapStatistics() {
        log.info("=== RÉCUPÉRATION STATISTIQUES EXPORTATEURS POUR LA CARTE ===");

        try {
            ExporterStatisticsDTO stats = statisticsService.getExporterStatistics();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", stats);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Erreur lors de la récupération des statistiques: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "STATISTICS_ERROR");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * Récupère uniquement les données par pays (pour la carte)
     */
    @GetMapping("/exporters/countries")
    @Operation(summary = "Données par pays")
    public ResponseEntity<Map<String, Object>> getCountriesData() {
        try {
            ExporterStatisticsDTO stats = statisticsService.getExporterStatistics();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("countries", stats.getCountries());
            response.put("globalStats", stats.getGlobalStats());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * Récupère l'évolution mensuelle (pour graphique)
     */
    @GetMapping("/exporters/evolution")
    @Operation(summary = "Évolution mensuelle des inscriptions")
    public ResponseEntity<Map<String, Object>> getMonthlyEvolution() {
        try {
            ExporterStatisticsDTO stats = statisticsService.getExporterStatistics();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("evolution", stats.getMonthlyEvolution());
            response.put("globalStats", stats.getGlobalStats());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}