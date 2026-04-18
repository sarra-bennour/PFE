package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.payment.CreatePaymentIntentRequest;
import com.tunisia.commerce.dto.payment.CreatePaymentIntentResponse;
import com.tunisia.commerce.dto.payment.PaymentResponseDTO;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.repository.ExportateurRepository;
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

    @Value("${app.base.url}")
    private String baseUrl;

    /**
     * Créer un PaymentIntent pour le paiement
     */
    @PostMapping("/create-intent")
    public ResponseEntity<CreatePaymentIntentResponse> createPaymentIntent(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreatePaymentIntentRequest request) {

        try {
            log.info("📝 Création de PaymentIntent - Header: {}", authHeader != null ? "présent" : "absent");

            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            log.info("✅ Exportateur authentifié: {}", exportateur.getId());

            // Ajouter les URLs de retour si non fournies
            if (request.getSuccessUrl() == null) {
                request.setSuccessUrl(baseUrl + "/payment-success");
            }
            if (request.getCancelUrl() == null) {
                request.setCancelUrl(baseUrl + "/payment-cancel");
            }

            CreatePaymentIntentResponse response = stripePaymentService.createPaymentIntent(
                    exportateur.getId(),
                    request
            );

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("❌ Erreur lors de la création du PaymentIntent", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Confirmer le paiement avec les détails de la carte (appelé par le frontend)
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

            ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
            log.info("✅ Exportateur authentifié: {}", exportateur.getId());

            PaymentResponseDTO response = stripePaymentService.confirmPayment(
                    exportateur.getId(),
                    paymentDetails
            );

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Confirmer le paiement après redirection (pour l'approche avec redirection Stripe)
     */
    /*@GetMapping("/confirm")
    public ResponseEntity<PaymentResponseDTO> confirmPaymentRedirect(
            @RequestParam("payment_intent") String paymentIntentId,
            @RequestParam(value = "payment_intent_client_secret", required = false) String clientSecret,
            @RequestParam(value = "redirect_status", required = false) String redirectStatus) {

        try {
            log.info("🔄 Confirmation par redirection: paymentIntentId={}, redirectStatus={}",
                    paymentIntentId, redirectStatus);

            PaymentResponseDTO response = stripePaymentService.confirmPaymentRedirect(paymentIntentId);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("❌ Erreur lors de la confirmation par redirection", e);
            return ResponseEntity.badRequest()
                    .body(PaymentResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }*/

    /**
     * Webhook Stripe (appelé par Stripe)
     */
    /*@PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        try {
            String result = stripePaymentService.handleWebhook(payload, sigHeader);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("❌ Erreur webhook", e);
            return ResponseEntity.badRequest().body("Erreur webhook: " + e.getMessage());
        }
    }*/

    // ==================== MÉTHODES PRIVÉES ====================

    private ExportateurEtranger getExportateurFromToken(String authHeader) {
        try {
            String token = extractToken(authHeader);
            log.info("🔑 Token extrait: {}", token.substring(0, 20) + "...");

            String email = jwtUtil.extractUsername(token);
            log.info("📧 Email extrait du token: {}", email);

            return exportateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Exportateur non trouvé avec l'email: " + email));
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