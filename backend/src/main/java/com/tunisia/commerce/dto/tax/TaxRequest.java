package com.tunisia.commerce.dto.tax;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class TaxRequest {
    private String hsCode;
    private String countryCode;
    private BigDecimal value;
    private String currency;
}
