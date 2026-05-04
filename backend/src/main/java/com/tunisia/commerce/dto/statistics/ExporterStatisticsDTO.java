package com.tunisia.commerce.dto.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExporterStatisticsDTO {

    // Statistiques globales
    private GlobalStatsDTO globalStats;

    // Données par pays (pour la carte)
    private List<CountryExporterDTO> countries;

    // Évolution mensuelle
    private List<MonthlyEvolutionDTO> monthlyEvolution;

    // Densité par pays (pour la légende)
    private Map<String, String> densityMap;  // pays -> "elevée", "moyenne", "faible"
}