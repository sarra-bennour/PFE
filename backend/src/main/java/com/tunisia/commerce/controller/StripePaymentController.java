package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.payment.CreatePaymentIntentRequest;
import com.tunisia.commerce.dto.payment.CreatePaymentIntentResponse;
import com.tunisia.commerce.dto.payment.PaymentResponseDTO;
import com.tunisia.commerce.dto.payment.PaymentTransactionDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.repository.ImportateurRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.impl.AuditService;
import com.tunisia.commerce.service.impl.StripePaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stripe-payment")
@RequiredArgsConstructor
@Slf4j
public class StripePaymentController {

    private final StripePaymentService stripePaymentService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final DemandeEnregistrementRepository demandeRepository;
    private final AuditService auditService;

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            ip = "127.0.0.1";
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }


    @Value("${app.base.url}")
    private String baseUrl;

    /**
     * Créer un PaymentIntent pour le paiement (accessible à EXPORTATEUR et IMPORTATEUR)
     */
    @PostMapping("/create-intent")
    public ResponseEntity<CreatePaymentIntentResponse> createPaymentIntent(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreatePaymentIntentRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;
        String userRole = null;
        Double amount = null;
        String currency = null;

        try {
            log.info("📝 Création de PaymentIntent - Header: {}", authHeader != null ? "présent" : "absent");

            User user = getUserFromToken(authHeader);
            userId = user.getId();
            userEmail = user.getEmail();
            userRole = user.getRole().name();

            log.info("✅ Utilisateur authentifié: {} - Rôle: {}", user.getId(), user.getRole());

            // ✅ Récupérer le montant depuis la demande
            if (request.getDemandeId() != null) {
                // Récupérer la demande depuis le repository
                DemandeEnregistrement demande = demandeRepository.findById(request.getDemandeId())
                        .orElse(null);
                if (demande != null) {
                    amount = demande.getPaymentAmount() != null ? demande.getPaymentAmount().doubleValue() : null;
                    currency = "TND"; // Par défaut ou depuis la demande
                }
            }

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

            // AUDIT: Création PaymentIntent
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PAYMENT_CREATE_INTENT")
                            .actionType(ActionType.PAYMENT)
                            .description("Création d'un PaymentIntent Stripe")
                            .entity(EntityType.PAYMENT, null, response.getPaymentIntentId())
                            .user(userId, userEmail, userRole)
                            .success()
                            .detail("demande_id", request.getDemandeId())
                            .detail("amount", amount)
                            .detail("currency", currency)
                            .detail("payment_intent_id", response.getPaymentIntentId())
                            .detail("client_secret", response.getClientSecret() != null ? "présent" : "absent")
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PAYMENT_CREATE_INTENT")
                            .actionType(ActionType.PAYMENT)
                            .description("Échec création PaymentIntent")
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("demande_id", request.getDemandeId())
                            .detail("amount", amount)
                            .detail("currency", currency)
                            .detail("ip_address", clientIp)
            );

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
            @RequestBody Map<String, Object> paymentDetails,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;
        String userRole = null;
        String paymentIntentId = null;
        Long demandeId = null;

        try {
            log.info("💳 Confirmation de paiement");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.error("❌ Header Authorization manquant ou invalide");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            User user = getUserFromToken(authHeader);
            userId = user.getId();
            userEmail = user.getEmail();
            userRole = user.getRole().name();

            log.info("✅ Utilisateur authentifié: {} - Rôle: {}", user.getId(), user.getRole());

            // Extraire les IDs pour l'audit
            if (paymentDetails.containsKey("paymentIntentId")) {
                paymentIntentId = (String) paymentDetails.get("paymentIntentId");
            }
            if (paymentDetails.containsKey("demandeId")) {
                demandeId = ((Number) paymentDetails.get("demandeId")).longValue();
            }

            PaymentResponseDTO response = stripePaymentService.confirmPayment(
                    user.getId(),
                    user.getRole().name(),
                    paymentDetails
            );

            // AUDIT: Confirmation paiement
            if (response.isSuccess()) {
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("PAYMENT_CONFIRM")
                                .actionType(ActionType.PAYMENT)
                                .description("Confirmation de paiement réussie")
                                .entity(EntityType.PAYMENT, null, paymentIntentId)
                                .user(userId, userEmail, userRole)
                                .success()
                                .detail("demande_id", demandeId)
                                .detail("payment_intent_id", paymentIntentId)
                                .detail("payment_reference", response.getPaymentReference())
                                .detail("amount", response.getAmount())
                                .detail("status", response.getStatus())
                                .detail("ip_address", clientIp)
                );
            } else {
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("PAYMENT_CONFIRM")
                                .actionType(ActionType.PAYMENT)
                                .description("Échec confirmation paiement")
                                .entity(EntityType.PAYMENT, null, paymentIntentId)
                                .user(userId, userEmail, userRole)
                                .failure(response.getMessage())
                                .detail("demande_id", demandeId)
                                .detail("payment_intent_id", paymentIntentId)
                                .detail("ip_address", clientIp)
                );
            }

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("PAYMENT_CONFIRM")
                            .actionType(ActionType.PAYMENT)
                            .description("Exception lors de la confirmation paiement")
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("demande_id", demandeId)
                            .detail("payment_intent_id", paymentIntentId)
                            .detail("ip_address", clientIp)
            );

            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }


    /**
     * Récupérer toutes les transactions (ADMIN et BANQUE uniquement)
     */
    @GetMapping("/all")
    public ResponseEntity<?> getAllTransactions(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String status,
            HttpServletRequest request) {

        String clientIp = getClientIp(request);

        try {
            User user = getUserFromToken(authHeader);
            checkAdminOrBankAccess(user);

            log.info("📊 Récupération de toutes les transactions par {} - IP: {}", user.getEmail(), clientIp);

            List<PaymentTransactionDTO> transactions = stripePaymentService.getAllTransactions(limit, status);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "transactions", transactions,
                    "count", transactions.size(),
                    "userRole", user.getRole().name()
            ));

        } catch (RuntimeException e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur interne", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "Erreur lors de la récupération des transactions"));
        }
    }

    /**
     * Récupérer les transactions filtrées par date et type (ADMIN et BANQUE)
     */
    @GetMapping("/filtered")
    public ResponseEntity<?> getFilteredTransactions(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentMethodType,
            @RequestParam(defaultValue = "100") int limit,
            HttpServletRequest request) {

        String clientIp = getClientIp(request);

        try {
            User user = getUserFromToken(authHeader);
            checkAdminOrBankAccess(user);

            log.info("📊 Récupération des transactions filtrées par {} - IP: {}", user.getEmail(), clientIp);

            List<PaymentTransactionDTO> transactions = stripePaymentService.getTransactionsWithFilters(
                    startDate, endDate, status, paymentMethodType, limit);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "transactions", transactions,
                    "count", transactions.size(),
                    "filters", Map.of(
                            "startDate", startDate,
                            "endDate", endDate,
                            "status", status,
                            "paymentMethodType", paymentMethodType
                    )
            ));

        } catch (RuntimeException e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur interne", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "Erreur lors de la récupération des transactions"));
        }
    }

    /**
     * Récupérer les transactions d'un utilisateur spécifique (ADMIN et BANQUE)
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getTransactionsByUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long userId,
            HttpServletRequest request) {

        String clientIp = getClientIp(request);

        try {
            User user = getUserFromToken(authHeader);
            checkAdminOrBankAccess(user);

            log.info("📊 Récupération des transactions pour l'utilisateur {} par {} - IP: {}",
                    userId, user.getEmail(), clientIp);

            List<PaymentTransactionDTO> transactions = stripePaymentService.getTransactionsByUser(userId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "transactions", transactions,
                    "count", transactions.size(),
                    "userId", userId
            ));

        } catch (RuntimeException e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur interne", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "Erreur lors de la récupération des transactions"));
        }
    }

    /**
     * Récupérer une transaction par ID de demande (ADMIN et BANQUE)
     */
    @GetMapping("/demande/{demandeId}")
    public ResponseEntity<?> getTransactionByDemande(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long demandeId,
            HttpServletRequest request) {

        String clientIp = getClientIp(request);

        try {
            User user = getUserFromToken(authHeader);
            checkAdminOrBankAccess(user);

            log.info("📊 Récupération de la transaction pour la demande {} par {} - IP: {}",
                    demandeId, user.getEmail(), clientIp);

            PaymentTransactionDTO transaction = stripePaymentService.getTransactionByDemande(demandeId);

            if (transaction == null) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "found", false,
                        "message", "Aucune transaction trouvée pour cette demande"
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "found", true,
                    "transaction", transaction
            ));

        } catch (RuntimeException e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur interne", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "Erreur lors de la récupération de la transaction"));
        }
    }

    /**
     * Récupérer les statistiques des transactions (ADMIN et BANQUE)
     */
    @GetMapping("/statistics")
    public ResponseEntity<?> getTransactionStatistics(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest request) {

        String clientIp = getClientIp(request);

        try {
            User user = getUserFromToken(authHeader);
            checkAdminOrBankAccess(user);

            log.info("📊 Récupération des statistiques par {} - IP: {}", user.getEmail(), clientIp);

            Map<String, Object> statistics = stripePaymentService.getTransactionStatistics();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "statistics", statistics
            ));

        } catch (RuntimeException e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur interne", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "Erreur lors de la récupération des statistiques"));
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

    private void checkAdminOrBankAccess(User user) {
        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.BANQUE) {
            throw new RuntimeException("Accès non autorisé. Cette ressource est réservée à l'administration et à la banque.");
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