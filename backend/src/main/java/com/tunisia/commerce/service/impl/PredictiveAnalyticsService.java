package com.tunisia.commerce.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.tunisia.commerce.dto.validation.PredictiveDashboardDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PredictiveAnalyticsService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model}")
    private String modelName;

    private final DemandeEnregistrementRepository demandeRepository;
    private Client geminiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PredictiveAnalyticsService(DemandeEnregistrementRepository demandeRepository) {
        this.demandeRepository = demandeRepository;
    }

    @PostConstruct
    public void init() {
        try {
            if (apiKey == null || apiKey.isEmpty()) {
                log.warn("⚠️ Gemini API key not configured. Using fallback mode.");
                return;
            }
            this.geminiClient = Client.builder().apiKey(apiKey).build();
            log.info("✅ Gemini initialized for predictive analytics with model: {}", modelName);
        } catch (Exception e) {
            log.error("❌ Failed to initialize Gemini: {}", e.getMessage());
        }
    }

    public PredictiveDashboardDTO generatePredictions() {
        try {
            // 1. Récupérer les données historiques
            List<DemandeEnregistrement> demandes = demandeRepository.findAll();

            if (demandes.isEmpty()) {
                log.warn("No data available for predictions");
                return getEmptyDataPredictions();
            }

            // 2. Calculer les statistiques avancées
            Map<String, Object> stats = calculateAdvancedStatistics(demandes);

            // 3. Récupérer le contexte externe (Tunisie)
            String tunisiaContext = fetchTunisiaContext();

            // 4. Construire le prompt et appeler Gemini
            String prompt = buildAnalyticsPrompt(demandes, stats, tunisiaContext);
            String aiAnalysis = callGemini(prompt);

            // 5. Parser la réponse JSON
            if (aiAnalysis != null && !aiAnalysis.isEmpty()) {
                return parseGeminiResponse(aiAnalysis, stats);
            }

            return getFallbackPredictions(stats);

        } catch (Exception e) {
            log.error("Error generating predictions: {}", e.getMessage(), e);
            return getFallbackPredictions(new HashMap<>());
        }
    }

    /**
     * Calcule des statistiques avancées incluant les tendances et prévisions
     */
    private Map<String, Object> calculateAdvancedStatistics(List<DemandeEnregistrement> demandes) {
        Map<String, Object> stats = new HashMap<>();

        // Statistiques de base
        stats.put("totalDemandes", demandes.size());

        // Demandes par statut
        Map<String, Long> statusCount = demandes.stream()
                .collect(Collectors.groupingBy(d -> d.getStatus() != null ? d.getStatus().toString() : "BROUILLON",
                        Collectors.counting()));
        stats.put("statusCount", statusCount);

        // 🔥 CORRECTION: Adapter la période selon les données disponibles
        // Trouver la date de première et dernière demande
        Optional<LocalDateTime> firstDate = demandes.stream()
                .filter(d -> d.getSubmittedAt() != null)
                .map(DemandeEnregistrement::getSubmittedAt)
                .min(LocalDateTime::compareTo);

        Optional<LocalDateTime> lastDate = demandes.stream()
                .filter(d -> d.getSubmittedAt() != null)
                .map(DemandeEnregistrement::getSubmittedAt)
                .max(LocalDateTime::compareTo);

        if (firstDate.isPresent() && lastDate.isPresent()) {
            // Calculer le nombre de mois entre première et dernière demande
            long monthsBetween = java.time.temporal.ChronoUnit.MONTHS.between(firstDate.get(), lastDate.get());
            monthsBetween = Math.max(1, monthsBetween); // Au moins 1 mois

            // Calculer le taux de croissance mensuel moyen
            double totalGrowth = (demandes.size() - 1.0) / monthsBetween;
            stats.put("monthlyGrowthRate", Math.round(totalGrowth * 10) / 10.0);

            // Si croissance positive, projeter
            if (totalGrowth > 0) {
                stats.put("growthRate", totalGrowth * 100 / Math.max(1, demandes.size() / monthsBetween));
            } else {
                stats.put("growthRate", 5.0); // Valeur par défaut optimiste
            }
        } else {
            stats.put("growthRate", 5.0);
            stats.put("monthlyGrowthRate", 1.0);
        }

        // 🔥 CORRECTION: Utiliser TOUTES les demandes pour le monthlyCount
        Map<String, Long> monthlyCount = new LinkedHashMap<>();

        // Grouper par mois sans période fixe
        Map<String, List<DemandeEnregistrement>> groupedByMonth = demandes.stream()
                .filter(d -> d.getSubmittedAt() != null)
                .collect(Collectors.groupingBy(d ->
                        d.getSubmittedAt().format(DateTimeFormatter.ofPattern("MMM yyyy"))
                ));

        groupedByMonth.forEach((month, list) ->
                monthlyCount.put(month, (long) list.size())
        );

        stats.put("monthlyCount", monthlyCount);

        // 🔥 CORRECTION: Calcul des tendances avec données disponibles
        List<Long> monthlyValues = new ArrayList<>(monthlyCount.values());

        if (monthlyValues.size() >= 2) {
            // Comparer le dernier mois complet avec le précédent
            long lastMonth = monthlyValues.get(monthlyValues.size() - 1);
            long previousMonth = monthlyValues.get(monthlyValues.size() - 2);

            double growthRate = previousMonth > 0 ?
                    ((double) (lastMonth - previousMonth) / previousMonth) * 100 :
                    (lastMonth > 0 ? 100 : 0);

            stats.put("growthRate", Math.round(growthRate * 10) / 10.0);
            stats.put("lastMonthCount", lastMonth);
            stats.put("previousMonthCount", previousMonth);
        } else if (monthlyValues.size() == 1) {
            // Un seul mois de données
            stats.put("growthRate", 15.0); // Croissance estimée
            stats.put("lastMonthCount", monthlyValues.get(0));
            stats.put("previousMonthCount", 0);
        } else {
            stats.put("growthRate", 5.0);
            stats.put("lastMonthCount", 0);
            stats.put("previousMonthCount", 0);
        }

        // Types de produits
        Map<String, Long> productTypes = new HashMap<>();
        Map<String, Long> topProducts = new HashMap<>();

        for (DemandeEnregistrement demande : demandes) {
            if (demande.getDemandeProduits() != null) {
                demande.getDemandeProduits().forEach(dp -> {
                    if (dp.getProduit() != null) {
                        if (dp.getProduit().getProductType() != null) {
                            productTypes.merge(dp.getProduit().getProductType(), 1L, Long::sum);
                        }
                        if (dp.getProduit().getProductName() != null) {
                            topProducts.merge(dp.getProduit().getProductName(), 1L, Long::sum);
                        }
                    }
                });
            }
        }
        stats.put("productTypes", productTypes);
        stats.put("topProducts", topProducts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .collect(Collectors.toList()));

        // Temps moyen de validation
        double avgValidationTime = demandes.stream()
                .filter(d -> d.getDecisionDate() != null && d.getSubmittedAt() != null)
                .mapToDouble(d -> java.time.Duration.between(d.getSubmittedAt(), d.getDecisionDate()).toDays())
                .average()
                .orElse(0);
        stats.put("avgValidationDays", Math.round(avgValidationTime * 10) / 10.0);

        // Taux de rejet
        long rejectedCount = demandes.stream()
                .filter(d -> "REJETEE".equals(d.getStatus()))
                .count();
        long validatedCount = demandes.stream()
                .filter(d -> "VALIDEE".equals(d.getStatus()))
                .count();
        double rejectionRate = demandes.isEmpty() ? 0 : (rejectedCount * 100.0 / demandes.size());
        stats.put("rejectionRate", Math.round(rejectionRate * 10) / 10.0);
        stats.put("validationRate", demandes.isEmpty() ? 0 : Math.round((validatedCount * 100.0 / demandes.size()) * 10) / 10.0);

        stats.put("hasSeasonality", detectSeasonality(monthlyValues));

        return stats;
    }

    private boolean detectSeasonality(List<Long> values) {
        if (values.size() < 6) return false;
        // Simple détection: vérifier si les valeurs des mêmes mois se répètent
        for (int i = 0; i < values.size() - 6; i++) {
            if (Math.abs(values.get(i) - values.get(i + 6)) < values.get(i) * 0.3) {
                return true;
            }
        }
        return false;
    }

    /**
     * Contexte actualisé de la Tunisie (économie, politique, commerce)
     */
    private String fetchTunisiaContext() {
        return """
            🌍 CONTEXTE TUNISIE 2025 - Données actualisées
            ================================================
            
            📊 ÉCONOMIE:
            • Croissance PIB 2025: +1.9% (en légère reprise)
            • Inflation: 5.6% (avril 2025, en baisse)
            • Taux directeur BCT: 7.5% (maintenu)
            • Déficit commercial: 7.3 milliards TND (4 mois 2025)
            • Réserves de change: ~115 jours d'importation
            
            📜 RÉGLEMENTATION DOUANIÈRE 2025:
            • Loi de Finances 2025: Amnistie douanière pour régularisation
            • Nouveaux avantages fiscaux pour les Tunisiens à l'étranger (TRE)
            • Digitalisation accrue des procédures douanières
            • Simplification des formalités pour les produits alimentaires
            
            🤝 ACCORDS COMMERCIAUX:
            • Accord ALE avec UE en phase de modernisation
            • Nouveaux accords avec pays africains (Zlecaf)
            • Partenariat renforcé avec la Turquie
            
            🏗️ INFRASTRUCTURES:
            • Projet de modernisation des ports (Banque Mondiale)
            • Nouveau terminal à Rades (prévu 2026)
            • Digitalisation du guichet unique (GUCE)
            
            ⚠️ DÉFIS:
            • Chômage des jeunes diplômés (~36%)
            • Pression sur la balance commerciale
            • Besoin de diversification des exportations
            • Lourdeurs administratives persistantes
            
            💡 OPPORTUNITÉS:
            • Croissance du secteur technologique
            • Demande accrue pour les produits pharmaceutiques
            • Exportations agricoles en hausse (huile d'olive, dattes)
            • Tourisme en reprise post-crise
            """;
    }

    private String buildAnalyticsPrompt(List<DemandeEnregistrement> demandes,
                                        Map<String, Object> stats,
                                        String tunisiaContext) {

        String internalTrends = buildInternalTrendsSummary(stats);

        return String.format("""
            Tu es un expert en analyse économique et géopolitique spécialisé dans le commerce international tunisien.
            
            # CONTEXTE TUNISIE ACTUEL (DONNÉES EXTERNES)
            %s
            
            # DONNÉES INTERNES DE LA PLATEFORME
            %s
            
            # ANALYSE DEMANDÉE
            Basé sur les données internes ET le contexte tunisien, génère une analyse prédictive.
            
            RÈGLES IMPORTANTES:
            1. Les prédictions doivent être cohérentes avec le contexte tunisien
            2. Mets en relation les tendances internes avec les facteurs externes
            3. Propose des recommandations actionnables pour l'instance de validation
            4. Identifie les risques réels basés sur les indicateurs économiques
            
            FORMAT DE RÉPONSE (JSON STRICT, pas de texte avant ou après):
            {
              "predictedIncrease": "chiffre entre -20 et 60",
              "forecast": "Phrase explicative reliant contexte externe et tendances internes (max 200 caractères)",
              "recommendations": ["reco1 (liée au contexte)", "reco2 (liée aux données)", "reco3 (stratégique)"],
              "alerts": ["alerte1 (risque macro)", "alerte2 (risque opérationnel)", "alerte3 (alerte sectorielle)"],
              "monthlyForecast": {
                "Mois+1": nombre entier,
                "Mois+2": nombre entier,
                "Mois+3": nombre entier
              }
            }
            """,
                tunisiaContext,
                internalTrends
        );
    }

    private String buildInternalTrendsSummary(Map<String, Object> stats) {
        StringBuilder sb = new StringBuilder();
        sb.append("📊 STATISTIQUES INTERNES:\n");
        sb.append(String.format("• Total demandes: %d\n", stats.get("totalDemandes")));
        sb.append(String.format("• Croissance récente: %.1f%%\n", stats.get("growthRate")));
        sb.append(String.format("• Temps validation moyen: %.1f jours\n", stats.get("avgValidationDays")));
        sb.append(String.format("• Taux de rejet: %.1f%%\n", stats.get("rejectionRate")));
        sb.append(String.format("• Saisonnalité détectée: %s\n", stats.get("hasSeasonality")));

        sb.append("\n📈 ÉVOLUTION MENSUELLE:\n");
        Map<String, Long> monthlyCount = (Map<String, Long>) stats.get("monthlyCount");
        monthlyCount.forEach((month, count) ->
                sb.append(String.format("• %s: %d demandes\n", month, count))
        );

        sb.append("\n🏷️ TYPES DE PRODUITS:\n");
        Map<String, Long> productTypes = (Map<String, Long>) stats.get("productTypes");
        productTypes.forEach((type, count) ->
                sb.append(String.format("• %s: %d demandes\n", type, count))
        );

        return sb.toString();
    }

    private String callGemini(String prompt) {
        if (geminiClient == null) {
            log.warn("Gemini client not available, using fallback");
            return null;
        }

        try {
            Content content = Content.builder()
                    .role("user")
                    .parts(List.of(Part.builder().text(prompt).build()))
                    .build();

            GenerateContentConfig config = GenerateContentConfig.builder()
                    .temperature(0.7f)
                    .maxOutputTokens(2048)
                    .build();

            GenerateContentResponse response = geminiClient.models.generateContent(
                    modelName, List.of(content), config);

            return extractTextFromResponse(response);

        } catch (Exception e) {
            log.error("Gemini API error: {}", e.getMessage());
            return null;
        }
    }

    private PredictiveDashboardDTO parseGeminiResponse(String aiResponse, Map<String, Object> stats) {
        try {
            // Nettoyer la réponse
            String cleanResponse = aiResponse.trim();
            if (cleanResponse.startsWith("```json")) {
                cleanResponse = cleanResponse.substring(7);
            }
            if (cleanResponse.startsWith("```")) {
                cleanResponse = cleanResponse.substring(3);
            }
            if (cleanResponse.endsWith("```")) {
                cleanResponse = cleanResponse.substring(0, cleanResponse.length() - 3);
            }
            cleanResponse = cleanResponse.trim();

            // Parser le JSON
            JsonNode json = objectMapper.readTree(cleanResponse);

            // Extraire les valeurs avec validation
            String predictedIncrease = json.has("predictedIncrease") ?
                    json.get("predictedIncrease").asText() :
                    String.valueOf(Math.max(-20, Math.min(60, (double) stats.get("growthRate") + 5)));

            String forecast = json.has("forecast") ?
                    json.get("forecast").asText() :
                    "Croissance modérée prévue pour les 3 prochains mois.";

            // Recommendations
            List<String> recommendations;
            if (json.has("recommendations") && json.get("recommendations").isArray()) {
                recommendations = new ArrayList<>();
                json.get("recommendations").forEach(node ->
                        recommendations.add(node.asText())
                );
            } else {
                recommendations = getDefaultRecommendations(stats);
            }

            // Alerts
            List<String> alerts;
            if (json.has("alerts") && json.get("alerts").isArray()) {
                alerts = new ArrayList<>();
                json.get("alerts").forEach(node ->
                        alerts.add(node.asText())
                );
            } else {
                alerts = getDefaultAlerts(stats);
            }

            // Monthly forecast
            Map<String, Integer> monthlyForecast = new LinkedHashMap<>();
            if (json.has("monthlyForecast")) {
                JsonNode forecastNode = json.get("monthlyForecast");
                if (forecastNode.has("Mois+1")) monthlyForecast.put("Mois+1", forecastNode.get("Mois+1").asInt());
                if (forecastNode.has("Mois+2")) monthlyForecast.put("Mois+2", forecastNode.get("Mois+2").asInt());
                if (forecastNode.has("Mois+3")) monthlyForecast.put("Mois+3", forecastNode.get("Mois+3").asInt());
            }

            // Si les prévisions sont vides, les calculer à partir des données
            if (monthlyForecast.isEmpty()) {
                monthlyForecast = calculateMonthlyForecast(stats);
            }

            return PredictiveDashboardDTO.builder()
                    .predictedIncrease(predictedIncrease)
                    .forecast(forecast)
                    .recommendations(recommendations)
                    .alerts(alerts)
                    .monthlyForecast(monthlyForecast)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
            log.debug("Raw response: {}", aiResponse);
            return getFallbackPredictions(stats);
        }
    }

    private Map<String, Integer> calculateMonthlyForecast(Map<String, Object> stats) {
        Map<String, Integer> forecast = new LinkedHashMap<>();

        // Récupérer le dernier mois connu
        long lastMonthValue = (long) stats.getOrDefault("lastMonthCount", 0L);
        double growthRate = (double) stats.getOrDefault("growthRate", 15.0);

        // 🔥 CORRECTION: Si pas de données, utiliser valeurs par défaut
        if (lastMonthValue == 0) {
            // Estimer basé sur le total des demandes
            long totalDemandes = (long) stats.getOrDefault("totalDemandes", 0L);
            lastMonthValue = Math.max(5, totalDemandes / 2); // Valeur par défaut
            growthRate = 15.0; // Croissance estimée
        }

        // Calculer les prévisions avec taux de croissance
        int month1 = (int) Math.max(0, lastMonthValue * (1 + growthRate / 100));
        int month2 = (int) Math.max(0, month1 * (1 + growthRate / 100));
        int month3 = (int) Math.max(0, month2 * (1 + growthRate / 100));

        // 🔥 CORRECTION: Ajuster si les valeurs sont trop petites
        if (month1 < 10 && lastMonthValue > 0) {
            month1 = (int) Math.max(month1, lastMonthValue * 1.2);
            month2 = (int) Math.max(month2, month1 * 1.15);
            month3 = (int) Math.max(month3, month2 * 1.1);
        }

        forecast.put("Mois+1", month1);
        forecast.put("Mois+2", month2);
        forecast.put("Mois+3", month3);

        return forecast;
    }

    private List<String> getDefaultRecommendations(Map<String, Object> stats) {
        List<String> recommendations = new ArrayList<>();

        double avgDays = (double) stats.getOrDefault("avgValidationDays", 0.0);
        if (avgDays > 15) {
            recommendations.add("Optimiser les circuits de validation (délai moyen > 15 jours)");
        }

        double rejectionRate = (double) stats.getOrDefault("rejectionRate", 0.0);
        if (rejectionRate > 20) {
            recommendations.add("Former les soumissionnaires pour réduire le taux de rejet");
        }

        recommendations.add("Automatiser les vérifications documentaires");
        recommendations.add("Renforcer l'équipe pendant les pics saisonniers");

        return recommendations;
    }

    private List<String> getDefaultAlerts(Map<String, Object> stats) {
        List<String> alerts = new ArrayList<>();

        double growthRate = (double) stats.getOrDefault("growthRate", 0.0);
        if (growthRate > 20) {
            alerts.add("⚠️ Croissance rapide >20% - Risque de saturation");
        } else if (growthRate < -10) {
            alerts.add("📉 Baisse d'activité - Vérifier les causes");
        }

        double avgDays = (double) stats.getOrDefault("avgValidationDays", 0.0);
        if (avgDays > 20) {
            alerts.add("⏰ Délais de validation critiques >20 jours");
        }

        alerts.add("📊 Suivre l'évolution des demandes mensuellement");

        return alerts;
    }

    private PredictiveDashboardDTO getFallbackPredictions(Map<String, Object> stats) {
        Map<String, Integer> forecast = calculateMonthlyForecast(stats);

        return PredictiveDashboardDTO.builder()
                .predictedIncrease(String.valueOf(stats.getOrDefault("growthRate", 12.0)))
                .forecast("Prévision basée sur les tendances historiques observées.")
                .recommendations(getDefaultRecommendations(stats))
                .alerts(getDefaultAlerts(stats))
                .monthlyForecast(forecast)
                .build();
    }

    private PredictiveDashboardDTO getEmptyDataPredictions() {
        return PredictiveDashboardDTO.builder()
                .predictedIncrease("0")
                .forecast("Pas assez de données historiques pour générer des prévisions fiables.")
                .recommendations(Arrays.asList(
                        "Commencer à collecter des données de demandes",
                        "Mettre en place un suivi mensuel des indicateurs",
                        "Configurer l'intégration des sources de données"
                ))
                .alerts(Arrays.asList(
                        "Aucune donnée historique disponible",
                        "Les prévisions nécessitent plus d'historique"
                ))
                .monthlyForecast(Map.of("Mois+1", 0, "Mois+2", 0, "Mois+3", 0))
                .build();
    }

    private String extractTextFromResponse(GenerateContentResponse response) {
        try {
            var candidates = response.candidates();
            if (candidates.isPresent() && !candidates.get().isEmpty()) {
                var candidate = candidates.get().get(0);
                var content = candidate.content();
                if (content.isPresent() && content.get().parts().isPresent()) {
                    var parts = content.get().parts().get();
                    StringBuilder text = new StringBuilder();
                    for (Part part : parts) {
                        part.text().ifPresent(text::append);
                    }
                    return text.toString();
                }
            }
        } catch (Exception e) {
            log.error("Extraction error: {}", e.getMessage());
        }
        return null;
    }
}