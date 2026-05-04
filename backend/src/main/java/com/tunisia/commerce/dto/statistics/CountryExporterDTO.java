package com.tunisia.commerce.dto.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CountryExporterDTO {
    private String name;           // Nom du pays
    private String code;
    private Long count;            // Nombre d'exportateurs
    private Double latitude;
    private Double longitude;
    private String density;        // elevée, moyenne, faible
    private Double growth;         // Pourcentage de croissance
    private String flagCode;       // Code pays pour drapeau
}
