package com.tunisia.commerce.dto.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlobalStatsDTO {
    private Long totalExportateurs;
    private Long totalPays;
    private Double croissanceMensuelle;  // en pourcentage
    private String tendance;  // EN_HAUSSE, STABLE, EN_BAISSE
    private MoisStats moisPrecedent;
    private MoisStats moisActuel;
}
