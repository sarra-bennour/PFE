package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.fraud.FraudDetectionResponse;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.InstanceValidation;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.impl.FraudDetectionService;
import com.tunisia.commerce.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/fraud")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FraudDetectionController {

    private final FraudDetectionService fraudDetectionService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    /**
     * Endpoint principal pour la détection de fraude sur un document
     * Accessible par les rôles: INSTANCE_VALIDATION et ADMIN
     */
    @PostMapping("/detect")
    public ResponseEntity<?> detectFraud(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentId", required = false) Long documentId,
            @RequestParam(value = "demandeId", required = false) Long demandeId,
            @RequestParam(value = "demande_type", required = false) String demandeType,
            @RequestParam(value = "soumissionnaire_type", required = false) String soumissionnaireType,
            @RequestParam(value = "soumissionnaire_nom", required = false) String soumissionnaireNom,
            @RequestParam(value = "soumissionnaire_pays", required = false) String soumissionnairePays,
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        log.info("=== DÉTECTION DE FRAUDE DOCUMENT ===");

        try {
            // Vérifier l'authentification et les droits
            User user = validateInstanceValidation(authHeader);
            log.info("Utilisateur authentifié: {} (Rôle: {})", user.getEmail(), user.getRole());

            // Vérifier que le fichier n'est pas vide
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Aucun fichier fourni"
                ));
            }

            // Vérifier le type de fichier (optionnel)
            String contentType = file.getContentType();
            if (contentType == null || (!contentType.startsWith("image/") && !"application/pdf".equals(contentType))) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Format de fichier non supporté. Utilisez PDF, JPG ou PNG."
                ));
            }

            // Si documentId est fourni, vérifier que le document existe
            if (documentId != null) {
                Document document = documentRepository.findById(documentId).orElse(null);
                if (document == null) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                            "success", false,
                            "error", "Document non trouvé avec l'ID: " + documentId
                    ));
                }
                log.info("Document trouvé: {} - Type: {}", document.getFileName(), document.getDocumentType());
            }

            // Appeler le service de détection
            // Appeler le service de détection avec ou sans contexte
            FraudDetectionResponse result;
            if (demandeType != null && soumissionnaireType != null) {
                result = fraudDetectionService.analyzeDocumentWithContext(
                        file, documentId, demandeId,
                        demandeType, soumissionnaireType, soumissionnaireNom, soumissionnairePays);
            } else {
                result = fraudDetectionService.analyzeDocument(file, documentId, demandeId);
            }

            // Journaliser le résultat
            log.info("📊 Résultat analyse fraud: Décision={}, Confiance={}%",
                    result.getDecision(),
                    result.getConfidence() != null ? result.getConfidence() * 100 : "N/A");

            if ("FRAUDE".equals(result.getDecision()) && result.getConfidence() != null && result.getConfidence() > 0.8) {
                log.warn("⚠️ FRAUDE DÉTECTÉE avec haute confiance pour document: {}",
                        documentId != null ? documentId : "Nouveau document");
            }

            // 🔥 AFFICHAGE DÉTAILLÉ
            log.info("========== RÉSULTAT COMPLET DE L'ANALYSE ML ==========");
            log.info("📊 Décision finale: {}", result.getDecision());
            log.info("📈 Confiance: {}%", result.getConfidence() != null ? result.getConfidence() * 100 : "N/A");
            log.info("💡 Recommandation: {}", result.getRecommendation());

            if (result.getReasons() != null && !result.getReasons().isEmpty()) {
                log.info("🔍 Raisons:");
                for (String reason : result.getReasons()) {
                    log.info("   - {}", reason);
                }
            }

            if (result.getTextAnalysis() != null) {
                log.info("📝 Analyse texte:");
                if (result.getTextAnalysis().getWarnings() != null) {
                    log.info("   Warnings: {}", result.getTextAnalysis().getWarnings());
                }
                if (result.getTextAnalysis().getAnomalies() != null) {
                    log.info("   Anomalies: {}", result.getTextAnalysis().getAnomalies());
                }
                if (result.getTextAnalysis().getSocietes() != null) {
                    log.info("   Sociétés détectées: {}", result.getTextAnalysis().getSocietes());
                }
                if (result.getTextAnalysis().getIsTunisianDocument() != null) {
                    log.info("   Document Tunisien: {}", result.getTextAnalysis().getIsTunisianDocument());
                }
            }

            if (result.getGeminiAnalysis() != null && result.getGeminiAnalysis().getAnomaliesGemini() != null) {
                log.info("🧠 Analyse Gemini:");
                for (var anomaly : result.getGeminiAnalysis().getAnomaliesGemini()) {
                    log.info("   - [{}] {}", anomaly.getSeverity(), anomaly.getDescription());
                }
            }

            log.info("=====================================================");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", result,
                    "message", "Analyse terminée avec succès"
            ));

        } catch (SecurityException e) {
            log.error("Erreur de sécurité: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur lors de la détection de fraude: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erreur lors de l'analyse: " + e.getMessage()
            ));
        }
    }

    /**
     * Endpoint simplifié (alias de /detect) pour compatibilité avec l'existant
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authHeader) {
        // Appel avec tous les paramètres requis (les contextes sont null)
        return detectFraud(file, null, null, null, null, null, null, authHeader, null);
    }

    /**
     * Vérifie la santé du service ML
     */
    @GetMapping("/health")
    public ResponseEntity<?> health(@RequestHeader("Authorization") String authHeader) {
        try {
            validateInstanceValidation(authHeader);

            boolean isHealthy = fraudDetectionService.isMlServiceHealthy();
            Map<String, Object> modelInfo = fraudDetectionService.getModelInfo();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "ml_service_healthy", isHealthy,
                    "model_info", modelInfo,
                    "timestamp", java.time.Instant.now().toString()
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Test Gemini (pour débogage)
     */
    /*@GetMapping("/test-gemini")
    public ResponseEntity<?> testGemini(@RequestHeader("Authorization") String authHeader) {
        try {
            validateInstanceValidation(authHeader);
            Map<String, Object> result = fraudDetectionService.testGemini();
            return ResponseEntity.ok(result);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }*/

    // ==================== MÉTHODES PRIVÉES ====================

    /**
     * Vérifie que l'utilisateur a le rôle INSTANCE_VALIDATION ou ADMIN
     */
    private User validateInstanceValidation(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new SecurityException("Token d'authentification manquant ou invalide");
        }

        String token = authHeader.substring(7);
        String email = jwtUtil.extractUsername(token);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new SecurityException("Utilisateur non trouvé: " + email));

        // Vérifier que l'utilisateur a le bon rôle
        boolean isInstanceValidation = user instanceof InstanceValidation;
        boolean isAdmin = user.getRole().name().equals("ADMIN");

        if (!isInstanceValidation && !isAdmin) {
            throw new SecurityException("Accès non autorisé. Rôle INSTANCE_VALIDATION ou ADMIN requis.");
        }

        return user;
    }
}