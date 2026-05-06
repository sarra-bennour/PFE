package com.tunisia.commerce.dto.tax;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxResponse {
    private BigDecimal customsDuty;
    private BigDecimal vat;
    private BigDecimal otherTaxes;
    private BigDecimal total;
    private String currency;
}
