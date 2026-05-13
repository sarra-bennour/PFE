package com.tunisia.commerce.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tunisia.commerce.dto.fraud.FraudDetectionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class FraudDetectionService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${ml.service.url:http://localhost:5000}")
    private String mlServiceUrl;

    public FraudDetectionService(WebClient webClient, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.objectMapper = objectMapper;
    }

    public FraudDetectionResponse analyzeDocument(MultipartFile file, Long documentId, Long demandeId) {
        log.info("=== ANALYSE FRAUDE DOCUMENT ===");
        log.info("Document ID: {}, Nom: {}, Taille: {} bytes", documentId, file.getOriginalFilename(), file.getSize());

        try {
            return analyzeDocumentAsync(file)
                    .block(Duration.ofSeconds(120));
        } catch (Exception e) {
            log.error("❌ Erreur analyse: {}", e.getMessage(), e);
            return FraudDetectionResponse.builder()
                    .status("error")
                    .confidence(0.0)
                    .recommendation("Erreur: " + e.getMessage())
                    .build();
        }
    }

    public FraudDetectionResponse analyzeDocumentWithContext(
            MultipartFile file,
            Long documentId,
            Long demandeId,
            String demandeType,
            String soumissionnaireType,
            String soumissionnaireNom,
            String soumissionnairePays) {

        log.info("=== ANALYSE FRAUDE AVEC CONTEXTE ===");
        log.info("Demande Type: {}, Soumissionnaire: {}", demandeType, soumissionnaireType);

        try {
            return analyzeDocumentAsyncWithContext(file, demandeType, soumissionnaireType, soumissionnaireNom, soumissionnairePays)
                    .block(Duration.ofSeconds(120));
        } catch (Exception e) {
            log.error("❌ Erreur analyse: {}", e.getMessage(), e);
            return FraudDetectionResponse.builder()
                    .status("error")
                    .confidence(0.0)
                    .recommendation("Erreur: " + e.getMessage())
                    .build();
        }
    }

    public Mono<FraudDetectionResponse> analyzeDocumentAsyncWithContext(
            MultipartFile file,
            String demandeType,
            String soumissionnaireType,
            String soumissionnaireNom,
            String soumissionnairePays) {

        String url = mlServiceUrl + "/analyze";

        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

        try {
            byte[] fileBytes = file.getBytes();
            bodyBuilder.part("file", fileBytes)
                    .filename(file.getOriginalFilename())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM);

            // Ajouter les paramètres de contexte
            if (demandeType != null) {
                bodyBuilder.part("demande_type", demandeType);
            }
            if (soumissionnaireType != null) {
                bodyBuilder.part("soumissionnaire_type", soumissionnaireType);
            }
            if (soumissionnaireNom != null) {
                bodyBuilder.part("soumissionnaire_nom", soumissionnaireNom);
            }
            if (soumissionnairePays != null) {
                bodyBuilder.part("soumissionnaire_pays", soumissionnairePays);
            }

        } catch (IOException e) {
            log.error("Erreur lecture fichier: {}", e.getMessage());
            return Mono.error(e);
        }

        log.info("📡 Appel WebClient vers: {} avec contexte demandeType={}", url, demandeType);
        long startTime = System.currentTimeMillis();

        return webClient.post()
                .uri(url)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .bodyValue(bodyBuilder.build())
                .retrieve()
                .onStatus(status -> status != HttpStatus.OK, response -> {
                    log.error("Erreur ML service: {}", response.statusCode());
                    return Mono.error(new RuntimeException("Erreur service ML: " + response.statusCode()));
                })
                .bodyToMono(FraudDetectionResponse.class)
                .timeout(Duration.ofSeconds(120))
                .doOnSuccess(result -> {
                    long duration = System.currentTimeMillis() - startTime;
                    log.info("⏱️ Réponse reçue en {} ms", duration);
                    log.info("Décision: {}, Confiance: {}%",
                            result.getDecision(),
                            result.getConfidence() != null ? result.getConfidence() * 100 : "N/A");
                })
                .doOnError(error -> {
                    log.error("❌ Échec analyse: {}", error.getMessage());
                });
    }

    public Mono<FraudDetectionResponse> analyzeDocumentAsync(MultipartFile file) {
        String url = mlServiceUrl + "/analyze";

        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

        try {
            byte[] fileBytes = file.getBytes();
            bodyBuilder.part("file", fileBytes)
                    .filename(file.getOriginalFilename())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM);
        } catch (IOException e) {
            log.error("Erreur lecture fichier: {}", e.getMessage());
            return Mono.error(e);
        }

        log.info("📡 Appel WebClient vers: {}", url);
        long startTime = System.currentTimeMillis();

        return webClient.post()
                .uri(url)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .bodyValue(bodyBuilder.build())
                .retrieve()
                .onStatus(status -> status != HttpStatus.OK, response -> {
                    log.error("Erreur ML service: {}", response.statusCode());
                    return Mono.error(new RuntimeException("Erreur service ML: " + response.statusCode()));
                })
                .bodyToMono(FraudDetectionResponse.class)
                .timeout(Duration.ofSeconds(120))
                .doOnSuccess(result -> {
                    long duration = System.currentTimeMillis() - startTime;
                    log.info("⏱️ Réponse reçue en {} ms", duration);
                    log.info("========== RÉSULTAT DÉTAILLÉ ==========");
                    log.info("isFraud: {}", result.getIsFraud());
                    log.info("Décision: {}", result.getDecision());
                    log.info("Confiance: {}%", result.getConfidence() != null ? result.getConfidence() * 100 : "N/A");
                    log.info("Recommandation: {}", result.getRecommendation());

                    if (result.getFinalDecision() != null) {
                        log.info("Raisons finales: {}", result.getFinalDecision().getReasons());
                    }

                    if (result.getGeminiAnalysis() != null) {
                        log.info("Gemini - Exportateur: {}", result.getGeminiAnalysis().getExportateur());
                        log.info("Gemini - Importateur: {}", result.getGeminiAnalysis().getImportateur());
                        if (result.getGeminiAnalysis().getAnomalies() != null) {
                            for (var anomaly : result.getGeminiAnalysis().getAnomalies()) {
                                log.info("Gemini Anomalie [{}]: {}", anomaly.getSeverity(), anomaly.getDescription());
                            }
                        }
                    }

                    if (result.getTextAnalysis() != null) {
                        log.info("OCR - Warnings: {}", result.getTextAnalysis().getWarnings());
                        if (result.getTextAnalysis().getExtractedInfo() != null) {
                            log.info("OCR - Sociétés: {}", result.getTextAnalysis().getExtractedInfo().getCompanies());
                            log.info("OCR - Document Tunisien: {}", result.getTextAnalysis().getExtractedInfo().getIsTunisianDocument());
                        }
                    }
                    log.info("=========================================");
                })
                .doOnError(error -> {
                    log.error("❌ Échec analyse: {}", error.getMessage());
                });
    }

    public boolean isMlServiceHealthy() {
        try {
            String url = mlServiceUrl + "/health";
            Boolean result = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(String.class)
                    .map(response -> true)
                    .timeout(Duration.ofSeconds(10))
                    .onErrorReturn(false)
                    .block();
            return result != null && result;
        } catch (Exception e) {
            log.warn("Service ML non disponible: {}", e.getMessage());
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getModelInfo() {
        try {
            String url = mlServiceUrl + "/model-info";
            return webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
        } catch (Exception e) {
            log.warn("Impossible récupérer infos modèle: {}", e.getMessage());
            return Map.of("error", e.getMessage(), "loaded", false);
        }
    }
}