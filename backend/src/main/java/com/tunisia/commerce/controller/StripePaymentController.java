package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.payment.CreatePaymentIntentRequest;
import com.tunisia.commerce.dto.payment.CreatePaymentIntentResponse;
import com.tunisia.commerce.dto.payment.PaymentResponseDTO;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.repository.ImportateurRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.impl.StripePaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/stripe-payment")
@RequiredArgsConstructor
@Slf4j
public class StripePaymentController {

    private final StripePaymentService stripePaymentService;
    private final JwtUtil jwtUtil;
    private final ExportateurRepository exportateurRepository;
    private final ImportateurRepository importateurRepository;
    private final UserRepository userRepository;

    @Value("${app.base.url}")
    private String baseUrl;

    /**
     * Créer un PaymentIntent pour le paiement (accessible à EXPORTATEUR et IMPORTATEUR)
     */
    @PostMapping("/create-intent")
    public ResponseEntity<CreatePaymentIntentResponse> createPaymentIntent(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreatePaymentIntentRequest request) {

        try {
            log.info("📝 Création de PaymentIntent - Header: {}", authHeader != null ? "présent" : "absent");

            User user = getUserFromToken(authHeader);
            log.info("✅ Utilisateur authentifié: {} - Rôle: {}", user.getId(), user.getRole());

            // Ajouter les URLs de retour si non fournies
            if (request.getSuccessUrl() == null) {
                request.setSuccessUrl(baseUrl + "/payment-success");
            }
            if (request.getCancelUrl() == null) {
                request.setCancelUrl(baseUrl + "/payment-cancel");
            }

            CreatePaymentIntentResponse response = stripePaymentService.createPaymentIntent(
                    user.getId(),
                    user.getRole().name(),
                    request
            );

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("❌ Erreur lors de la création du PaymentIntent", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Confirmer le paiement avec les détails de la carte (accessible à EXPORTATEUR et IMPORTATEUR)
     */
    @PostMapping("/confirm-payment")
    public ResponseEntity<?> confirmPayment(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> paymentDetails) {

        try {
            log.info("💳 Confirmation de paiement");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.error("❌ Header Authorization manquant ou invalide");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            User user = getUserFromToken(authHeader);
            log.info("✅ Utilisateur authentifié: {} - Rôle: {}", user.getId(), user.getRole());

            PaymentResponseDTO response = stripePaymentService.confirmPayment(
                    user.getId(),
                    user.getRole().name(),
                    paymentDetails
            );

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== MÉTHODES PRIVÉES ====================

    /**
     * Extraire l'utilisateur du token (générique pour tous les rôles)
     */
    private User getUserFromToken(String authHeader) {
        try {
            String token = extractToken(authHeader);
            log.info("🔑 Token extrait: {}", token.substring(0, Math.min(20, token.length())) + "...");

            String email = jwtUtil.extractUsername(token);
            log.info("📧 Email extrait du token: {}", email);

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

            log.info("👤 Utilisateur trouvé: ID={}, Rôle={}", user.getId(), user.getRole());

            return user;
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'extraction du token", e);
            throw new RuntimeException("Erreur d'authentification: " + e.getMessage());
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || authHeader.isEmpty()) {
            throw new RuntimeException("En-tête d'authentification manquant");
        }
        if (!authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Format d'authentification invalide. Utilisez 'Bearer [token]'");
        }
        String token = authHeader.substring(7);
        if (token.isEmpty()) {
            throw new RuntimeException("Token vide");
        }
        return token;
    }
}