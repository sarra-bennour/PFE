package com.tunisia.commerce.dto.fraud;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class FraudDetectionResponse {

    // Champs principaux du JSON
    private Double confidence;
    private String label;
    private String recommendation;
    private String status;
    private Boolean isFraud;
    private String method;
    private Boolean ocrSuccess;

    @JsonProperty("extracted_text")
    private String extractedText;

    // Décision finale (final_decision)
    @JsonProperty("final_decision")
    private FinalDecision finalDecision;

    // Analyse Gemini (gemini_analysis)
    @JsonProperty("gemini_analysis")
    private GeminiAnalysisFull geminiAnalysis;

    // Analyse texte (text_analysis)
    @JsonProperty("text_analysis")
    private TextAnalysisFull textAnalysis;

    // Analyse visuelle (visual_analysis)
    @JsonProperty("visual_analysis")
    private VisualAnalysis visualAnalysis;

    // Helper pour obtenir la décision
    public String getDecision() {
        if (isFraud != null) {
            return isFraud ? "FRAUDE" : "AUTHENTIQUE";
        }
        if (finalDecision != null && finalDecision.getIsFraud() != null) {
            return finalDecision.getIsFraud() ? "FRAUDE" : "AUTHENTIQUE";
        }
        if ("fake".equals(label)) {
            return "FRAUDE";
        }
        return null;
    }

    // Helper pour obtenir la confiance
    public Double getConfidence() {
        if (confidence != null) return confidence;
        if (finalDecision != null && finalDecision.getConfidence() != null) {
            return finalDecision.getConfidence();
        }
        return 0.0;
    }

    // Helper pour obtenir les raisons
    public List<String> getReasons() {
        if (finalDecision != null && finalDecision.getReasons() != null && !finalDecision.getReasons().isEmpty()) {
            return finalDecision.getReasons();
        }
        return List.of();
    }

    // Helper pour obtenir le résumé
    public String getSummary() {
        if (finalDecision != null && finalDecision.getSummary() != null) {
            return finalDecision.getSummary();
        }
        return null;
    }

    // Classe pour final_decision
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FinalDecision {
        private Double confidence;
        @JsonProperty("is_fraud")
        private Boolean isFraud;
        private List<String> reasons;
        private String summary;
    }

    // Classe pour gemini_analysis complète
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiAnalysisFull {
        private List<GeminiAnomaly> anomalies;
        private Double confidence;
        @JsonProperty("document_type")
        private String documentType;
        private Map<String, Object> exportateur;
        private Map<String, Object> importateur;
        private String recommendation;
        @JsonProperty("text_fraud_detected")
        private Boolean textFraudDetected;
        @JsonProperty("calculation_analysis")
        private CalculationAnalysis calculationAnalysis;
        @JsonProperty("tax_analysis")
        private TaxAnalysis taxAnalysis;

        // Getter pour anomaliesGemini (pour compatibilité)
        public List<GeminiAnomaly> getAnomaliesGemini() {
            return anomalies;
        }
    }

    // Classe pour les anomalies Gemini
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiAnomaly {
        private String description;
        private String severity;
        private String type;
    }

    // Classe pour calculation_analysis
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CalculationAnalysis {
        private String error;
        private Double ht;
        @JsonProperty("is_valid")
        private Boolean isValid;
        private Double ttc;
        private Double tva;
    }

    // Classe pour tax_analysis
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TaxAnalysis {
        private String comment;
        @JsonProperty("is_valid")
        private Boolean isValid;
        @JsonProperty("taux_tva")
        private String tauxTva;
    }

    // Classe pour text_analysis complète
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TextAnalysisFull {
        private List<String> anomalies;
        private Calculations calculations;
        @JsonProperty("extracted_info")
        private ExtractedInfo extractedInfo;
        @JsonProperty("has_anomalies")
        private Boolean hasAnomalies;
        @JsonProperty("has_text")
        private Boolean hasText;
        @JsonProperty("has_warnings")
        private Boolean hasWarnings;
        @JsonProperty("text_length")
        private Integer textLength;
        private List<String> warnings;

        // Getters pour compatibilité
        public List<String> getWarnings() { return warnings; }
        public List<String> getSocietes() {
            return extractedInfo != null ? extractedInfo.getCompanies() : null;
        }
        public Boolean getIsTunisianDocument() {
            return extractedInfo != null ? extractedInfo.getIsTunisianDocument() : null;
        }
    }

    // Classe pour calculations
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Calculations {
        private String error;
        private Double ht;
        @JsonProperty("is_valid")
        private Boolean isValid;
        private Double ttc;
        @JsonProperty("tva_rate")
        private Double tvaRate;
    }

    // Classe pour extracted_info
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExtractedInfo {
        private List<String> amounts;
        private List<String> companies;
        private List<String> dates;
        private List<String> emails;
        @JsonProperty("is_foreign_document")
        private Boolean isForeignDocument;
        @JsonProperty("is_tunisian_document")
        private Boolean isTunisianDocument;
        private String siret;
        private String tva;
    }

    // Classe pour visual_analysis
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class VisualAnalysis {
        private List<String> anomalies;
        @JsonProperty("anomaly_score")
        private Double anomalyScore;
        @JsonProperty("authentic_probability")
        private Double authenticProbability;
        private Double confidence;
        @JsonProperty("fake_probability")
        private Double fakeProbability;
        private String label;
        private String summary;
    }
}