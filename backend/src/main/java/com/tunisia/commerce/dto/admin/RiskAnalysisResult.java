package com.tunisia.commerce.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskAnalysisResult {
    private int riskScore;
    private String riskLevel;  // FAIBLE, MOYEN, ÉLEVÉ
    private String detectedIpCountry;
    private String detectedCountry;
    private String ipCity;
    private boolean usingVpn;
    private boolean usingProxy;
    private boolean usingTor;
    private List<String> riskFactors;
    private List<String> detailedFactors;
}