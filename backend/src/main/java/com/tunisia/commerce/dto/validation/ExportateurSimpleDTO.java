package com.tunisia.commerce.dto.validation;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExportateurSimpleDTO {
    private Long id;
    private String email;
    private String raisonSociale;
    private String paysOrigine;
    private String telephone;
    private String statutAgrement;
}
