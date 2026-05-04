package com.tunisia.commerce.dto.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoisStats {
    private String mois;
    private Integer annee;
    private Long nombreExportateurs;
}
