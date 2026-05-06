package com.tunisia.commerce.dto.validation;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class PredictiveDashboardDTO {
    private String predictedIncrease;
    private String forecast;
    private List<String> recommendations;
    private List<String> alerts;
    private Map<String, Integer> monthlyForecast;
}
