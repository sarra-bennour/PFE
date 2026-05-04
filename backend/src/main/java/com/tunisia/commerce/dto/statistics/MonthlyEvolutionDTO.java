package com.tunisia.commerce.dto.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyEvolutionDTO {
    private String month;      // "JAN", "FEV", etc.
    private Integer year;
    private Long count;
    private Double percentageChange;  // par rapport au mois précédent
}
