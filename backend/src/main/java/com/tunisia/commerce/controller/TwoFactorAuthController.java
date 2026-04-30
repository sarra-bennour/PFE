package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.user.TwoFactorSetupResponse;
import com.tunisia.commerce.dto.user.TwoFactorVerifyRequest;
import com.tunisia.commerce.dto.user.TwoFactorVerifyResponse;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.UserService;
import com.tunisia.commerce.service.impl.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/auth/2fa")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TwoFactorAuthController {

    private final UserService userService;
    private final ExportateurRepository exportateurRepository;
    private final UserRepository  userRepository;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;


    Logger logger = Logger.getLogger(getClass().getName());

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


    @PostMapping("/setup")
    public ResponseEntity<?> setup2FA(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;
        String userRole = null;

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token invalide ou expiré"));
            }

            String email = jwtUtil.extractUsername(token);
            userEmail = email;

            // Récupérer l'utilisateur pour l'audit
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                userId = user.getId();
                userRole = user.getRole().name();
            }

            TwoFactorSetupResponse response = userService.setupTwoFactorAuth(email);

            // AUDIT: Configuration 2FA
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_SETUP")
                            .actionType(ActionType.SECURITY)
                            .description("Configuration de l'authentification à deux facteurs")
                            .entity(EntityType.USER, userId, userEmail)
                            .user(userId, userEmail, userRole)
                            .success()
                            .detail("has_secret", response.getSecret() != null)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", response
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_SETUP")
                            .actionType(ActionType.SECURITY)
                            .description("Échec configuration 2FA")
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/enable")
    public ResponseEntity<?> enable2FA(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;
        String userRole = null;

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token invalide ou expiré"));
            }

            String email = jwtUtil.extractUsername(token);
            userEmail = email;

            if (!email.equals(request.getEmail())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email ne correspond pas au token"));
            }

            // Récupérer l'utilisateur pour l'audit
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                userId = user.getId();
                userRole = user.getRole().name();
            }

            boolean enabled = userService.enableTwoFactorAuth(email, request.getCode());

            if (enabled) {
                // AUDIT: Activation 2FA
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("2FA_ENABLE")
                                .actionType(ActionType.SECURITY)
                                .description("Activation de l'authentification à deux facteurs")
                                .entity(EntityType.USER, userId, userEmail)
                                .user(userId, userEmail, userRole)
                                .success()
                                .detail("ip_address", clientIp)
                );

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "2FA activé avec succès"
                ));
            } else {
                // AUDIT: Échec activation 2FA
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("2FA_ENABLE")
                                .actionType(ActionType.SECURITY)
                                .description("Échec activation 2FA - code invalide")
                                .entity(EntityType.USER, userId, userEmail)
                                .user(userId, userEmail, userRole)
                                .failure("Code de vérification invalide")
                                .detail("ip_address", clientIp)
                );

                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Code de vérification invalide"));
            }
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_ENABLE")
                            .actionType(ActionType.SECURITY)
                            .description("Erreur lors de l'activation 2FA")
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/disable")
    public ResponseEntity<?> disable2FA(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;
        String userRole = null;

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token invalide ou expiré"));
            }

            String email = jwtUtil.extractUsername(token);
            userEmail = email;

            if (!email.equals(request.getEmail())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email ne correspond pas au token"));
            }

            // Récupérer l'utilisateur pour l'audit
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                userId = user.getId();
                userRole = user.getRole().name();
            }

            boolean disabled = userService.disableTwoFactorAuth(email, request.getCode());

            if (disabled) {
                // AUDIT: Désactivation 2FA
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("2FA_DISABLE")
                                .actionType(ActionType.SECURITY)
                                .description("Désactivation de l'authentification à deux facteurs")
                                .entity(EntityType.USER, userId, userEmail)
                                .user(userId, userEmail, userRole)
                                .success()
                                .detail("ip_address", clientIp)
                );

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "2FA désactivé avec succès"
                ));
            } else {
                // AUDIT: Échec désactivation 2FA
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("2FA_DISABLE")
                                .actionType(ActionType.SECURITY)
                                .description("Échec désactivation 2FA - code invalide")
                                .entity(EntityType.USER, userId, userEmail)
                                .user(userId, userEmail, userRole)
                                .failure("Code de vérification invalide")
                                .detail("ip_address", clientIp)
                );

                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Code de vérification invalide"));
            }
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_DISABLE")
                            .actionType(ActionType.SECURITY)
                            .description("Erreur lors de la désactivation 2FA")
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify2FA(
            @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = request.getEmail();
        String userRole = null;

        try {
            boolean isValid = userService.verifyTwoFactorCode(request.getEmail(), request.getCode());

            if (isValid) {
                User user = userRepository.findByEmail(request.getEmail())
                        .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

                userId = user.getId();
                userRole = user.getRole().name();

                String token = jwtUtil.generateToken(request.getEmail(), user.getRole().name());

                // AUDIT: Vérification 2FA réussie
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("2FA_VERIFY")
                                .actionType(ActionType.AUTHENTICATION)
                                .description("Vérification 2FA réussie")
                                .entity(EntityType.USER, userId, userEmail)
                                .user(userId, userEmail, userRole)
                                .success()
                                .detail("ip_address", clientIp)
                );

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("token", token);
                response.put("email", user.getEmail());
                response.put("role", user.getRole());

                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getId());
                userMap.put("email", user.getEmail());
                userMap.put("role", user.getRole());
                userMap.put("nom", user.getNom());
                userMap.put("prenom", user.getPrenom());
                userMap.put("telephone", user.getTelephone());

                response.put("user", userMap);
                response.put("message", "Code 2FA valide");

                return ResponseEntity.ok(response);
            } else {
                // AUDIT: Échec vérification 2FA
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("2FA_VERIFY")
                                .actionType(ActionType.AUTHENTICATION)
                                .description("Échec vérification 2FA - code invalide")
                                .entity(EntityType.USER, userId, userEmail)
                                .user(userId, userEmail, userRole)
                                .failure("Code 2FA invalide")
                                .detail("ip_address", clientIp)
                );

                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "success", false,
                                "error", "Code 2FA invalide"
                        ));
            }
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_VERIFY")
                            .actionType(ActionType.AUTHENTICATION)
                            .description("Erreur lors de la vérification 2FA")
                            .entity(EntityType.USER, userId, userEmail)
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }


    @PostMapping("/resend")
    public ResponseEntity<?> resend2FACode(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = request.get("email");
        String userRole = null;

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token) || !jwtUtil.isTempToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token invalide ou expiré"));
            }

            String email = request.get("email");
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email requis"));
            }

            // Récupérer l'utilisateur pour l'audit
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                userId = user.getId();
                userRole = user.getRole().name();
            }

            userService.resendTwoFactorCode(email);

            // AUDIT: Renvoi code 2FA
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_RESEND_CODE")
                            .actionType(ActionType.SECURITY)
                            .description("Renvoi du code 2FA")
                            .entity(EntityType.USER, userId, userEmail)
                            .user(userId, userEmail, userRole)
                            .success()
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Code 2FA renvoyé avec succès"
            ));

        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_RESEND_CODE")
                            .actionType(ActionType.SECURITY)
                            .description("Échec renvoi code 2FA")
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status/{email}")
    public ResponseEntity<?> get2FAStatus(
            @PathVariable String email,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userRole = null;

        try {
            Map<String, Object> response = new HashMap<>();

            Optional<ExportateurEtranger> exportateurOpt = exportateurRepository.findByEmail(email);

            if (exportateurOpt.isEmpty()) {
                response.put("success", true);
                response.put("enabled", false);
                response.put("email", email);
                response.put("hasSecret", false);
                response.put("message", "Utilisateur non trouvé");

                // AUDIT: Consultation statut 2FA sur utilisateur inexistant
                auditService.log(
                        AuditService.AuditLogBuilder.builder()
                                .action("2FA_GET_STATUS")
                                .actionType(ActionType.SEARCH)
                                .description("Consultation statut 2FA - utilisateur non trouvé")
                                .detail("email", email)
                                .detail("ip_address", clientIp)
                                .success()
                );

                return ResponseEntity.ok(response);
            }

            ExportateurEtranger exportateur = exportateurOpt.get();
            userId = exportateur.getId();
            userRole = exportateur.getRole().name();

            response.put("success", true);
            response.put("enabled", exportateur.isTwoFactorEnabled());
            response.put("email", exportateur.getEmail());
            response.put("hasSecret", exportateur.getTwoFactorSecret() != null);
            response.put("message", "Statut récupéré avec succès");

            // AUDIT: Consultation statut 2FA
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_GET_STATUS")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation du statut 2FA d'un utilisateur")
                            .entity(EntityType.USER, userId, email)
                            .user(userId, email, userRole)
                            .success()
                            .detail("enabled", exportateur.isTwoFactorEnabled())
                            .detail("has_secret", exportateur.getTwoFactorSecret() != null)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.severe("Erreur lors de la récupération du statut 2FA " + e);

            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("2FA_GET_STATUS")
                            .actionType(ActionType.SEARCH)
                            .description("Erreur lors de la consultation statut 2FA")
                            .user(userId, email, userRole)
                            .failure(e.getMessage())
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("enabled", false);
            errorResponse.put("email", email);
            errorResponse.put("hasSecret", false);
            errorResponse.put("message", e.getMessage());

            return ResponseEntity.ok(errorResponse);
        }
    }
}