package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.DeactivationStatus;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.exception.AuthException;
import com.tunisia.commerce.exception.MobileAuthException;
import com.tunisia.commerce.service.UserService;
import com.tunisia.commerce.service.impl.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);


    // Méthode utilitaire pour récupérer l'IP
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");

        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        // 🔥 Si c'est IPv6 localhost, remplacer par IPv4 localhost
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            ip = "127.0.0.1";
        }

        // 🔥 Si plusieurs IPs (proxy), prendre la première
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip;
    }


    @PostMapping("/signup/exporter")
    public ResponseEntity<?> signup(@RequestBody ExportateurSignupRequest request,HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        try {
            UserDTO userDTO = userService.registerExportateur(request);

            // AUDIT: SUCCÈS inscription
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("SIGNUP_EXPORTATEUR")
                            .actionType(ActionType.CREATION)
                            .description("Inscription d'un nouvel exportateur")
                            .entity(EntityType.USER, userDTO.getId(), userDTO.getEmail())
                            .user(userDTO.getId(), userDTO.getEmail(), userDTO.getRole().name())
                            .success()
                            .detail("email", request.getEmail())
                            .detail("company_name", request.getCompanyName())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(userDTO);
        } catch (AuthException e) {
            // AUDIT: ÉCHEC inscription
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("SIGNUP_EXPORTATEUR")
                            .actionType(ActionType.CREATION)
                            .description("Échec d'inscription d'exportateur")
                            .failure(e.getMessage())
                            .detail("email", request.getEmail())
                            .detail("error_code", e.getErrorCode())
                            .detail("ip_address", clientIp)
            );
            // Structure avec 'error' et 'message' comme attendu par le frontend
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(errorResponse);
        } catch (Exception e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("SIGNUP_EXPORTATEUR")
                            .actionType(ActionType.CREATION)
                            .description("Erreur interne lors de l'inscription")
                            .failure(e.getMessage())
                            .detail("email", request.getEmail())
                            .detail("ip_address", clientIp)
            );

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", "Une erreur inattendue s'est produite");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        try {
            log.info("Tentative de connexion pour l'email: {}", request.getEmail());

            LoginResponse response = userService.login(request);

            log.info("Connexion réussie pour: {}", request.getEmail());
            log.info("*****Rôle utilisateur: {}", response.getUser().getRole());

            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("LOGIN")
                            .actionType(ActionType.AUTHENTICATION)
                            .description("Connexion utilisateur réussie")
                            .entity(EntityType.USER, response.getUser().getId(), response.getUser().getEmail())
                            .user(response.getUser().getId(), response.getUser().getEmail(), response.getUser().getRole().name())
                            .success()
                            .detail("email", request.getEmail())
                            .detail("login_method", "email_password")
                            .detail("ip_address", clientIp)
                            .detail("user_agent", userAgent)
                            .detail("requires_two_factor", response.isRequiresTwoFactor())
            );

            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("success", true);
            successResponse.put("token", response.getToken());
            successResponse.put("requiresTwoFactor", response.isRequiresTwoFactor());
            successResponse.put("user", response.getUser());
            successResponse.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.ok(successResponse);

        } catch (AuthException e) {
            log.warn("Échec de connexion pour {}: {} - {}",
                    request.getEmail(), e.getErrorCode(), e.getMessage());

            // ✅ AUDIT: ÉCHEC login
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("LOGIN")
                            .actionType(ActionType.AUTHENTICATION)
                            .description("Échec de connexion utilisateur")
                            .failure(e.getMessage())
                            .detail("email", request.getEmail())
                            .detail("error_code", e.getErrorCode())
                            .detail("ip_address", clientIp)
                            .detail("user_agent", userAgent)
            );

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now().toString());

            // Ajouter des informations supplémentaires selon le type d'erreur
            switch (e.getErrorCode()) {
                case "ACCOUNT_LOCKED":
                    if (e.getArgs().length > 0) {
                        errorResponse.put("minutesRemaining", e.getArgs()[0]);
                    }
                    break;
                case "INVALID_CREDENTIALS":
                    if (e.getArgs().length > 0) {
                        errorResponse.put("remainingAttempts", e.getArgs()[0]);
                    }
                    break;
                case "EMAIL_NOT_VERIFIED":
                    errorResponse.put("email", request.getEmail());
                    break;
            }

            return ResponseEntity.status(e.getStatus()).body(errorResponse);

        } catch (Exception e) {
            log.error("Erreur inattendue lors de la connexion pour {}", request.getEmail(), e);

            // ✅ AUDIT: ERREUR SERVEUR login
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("LOGIN")
                            .actionType(ActionType.AUTHENTICATION)
                            .description("Erreur serveur lors de la connexion")
                            .failure(e.getMessage())
                            .detail("email", request.getEmail())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "SERVER_ERROR");
            errorResponse.put("message", "Une erreur interne est survenue. Veuillez réessayer plus tard.");
            errorResponse.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/login/mobile")
    public ResponseEntity<?> mobileLogin(@RequestBody MobileLoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        try {
            log.info("Tentative de login mobile avec matricule: " + request.getMatricule());

            LoginResponse response = userService.mobileLogin(request);

            // ✅ AUDIT: SUCCÈS login mobile
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("MOBILE_LOGIN")
                            .actionType(ActionType.AUTHENTICATION)
                            .description("Connexion mobile réussie")
                            .entity(EntityType.USER, response.getUser().getId(), response.getUser().getEmail())
                            .user(response.getUser().getId(), response.getUser().getEmail(), response.getUser().getRole().name())
                            .success()
                            .detail("matricule", request.getMatricule())
                            .detail("ip_address", clientIp)
                            .detail("login_method", "mobile_matricule")
            );

            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("success", true);
            successResponse.put("token", response.getToken());
            successResponse.put("requiresTwoFactor", response.isRequiresTwoFactor());
            successResponse.put("user", response.getUser());
            successResponse.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.ok(successResponse);

        } catch (MobileAuthException e) {
            log.warn("Échec login mobile: {} - {}", e.getErrorCode(), e.getMessage());

            // ✅ AUDIT: ÉCHEC login mobile
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("MOBILE_LOGIN")
                            .actionType(ActionType.AUTHENTICATION)
                            .description("Échec connexion mobile")
                            .failure(e.getMessage())
                            .detail("matricule", request.getMatricule())
                            .detail("error_code", e.getErrorCode())
                            .detail("ip_address", clientIp)
            );


            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.status(e.getStatus()).body(errorResponse);

        } catch (Exception e) {
            log.error("Erreur inattendue lors du login mobile", e);

            // ✅ AUDIT: ERREUR SERVEUR login mobile
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("MOBILE_LOGIN")
                            .actionType(ActionType.AUTHENTICATION)
                            .description("Erreur serveur login mobile")
                            .failure(e.getMessage())
                            .detail("matricule", request.getMatricule())
                            .detail("ip_address", clientIp)
            );

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "SERVER_ERROR");
            errorResponse.put("message", "Une erreur interne est survenue");
            errorResponse.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            if (authHeader == null || authHeader.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            userService.logout(authHeader);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Déconnexion réussie"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la déconnexion: " + e.getMessage()));
        }
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        try {
            boolean verified = userService.verifyEmail(token);
            // ✅ AUDIT: Vérification email
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VERIFY_EMAIL")
                            .actionType(ActionType.MODIFICATION)
                            .description("Vérification d'email utilisateur")
                            .success()
                            .detail("token_used", token.substring(0, Math.min(10, token.length())) + "...")
                            .detail("ip_address", clientIp)
                            .detail("verified", verified)
            );
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email vérifié avec succès"
            ));
        } catch (RuntimeException e) {
            // ✅ AUDIT: ÉCHEC vérification email
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("VERIFY_EMAIL")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec vérification email")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerificationEmail(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String email = request.get("email");
        String clientIp = getClientIp(httpRequest);

        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email requis"));
        }

        try {
            userService.resendVerificationEmail(email);

            // ✅ AUDIT: Renvoi email vérification
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("RESEND_VERIFICATION")
                            .actionType(ActionType.NOTIFICATION)
                            .description("Renvoi d'email de vérification")
                            .success()
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email de vérification renvoyé"
            ));
        } catch (RuntimeException e) {
            // ✅ AUDIT: ÉCHEC renvoi email
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("RESEND_VERIFICATION")
                            .actionType(ActionType.NOTIFICATION)
                            .description("Échec renvoi d'email de vérification")
                            .failure(e.getMessage())
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String email = null;
        Long userId = null;
        String userRole = null;
        try {
            // 1. Vérifier si l'en-tête Authorization est présent
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            // 2. Extraire le token
            String token = authHeader.substring(7);

            // 3. Valider le token
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token invalide ou expiré"));
            }

            // 4. Extraire l'email depuis le token
            email = jwtUtil.extractUsername(token);
            // Récupérer l'utilisateur pour l'audit
            UserDTO user = userService.getUserByEmail(email);
            if (user != null) {
                userId = user.getId();
                userRole = user.getRole().name();
            }

            // 5. Appeler le service
            userService.changePassword(email, request);

            // ✅ AUDIT: SUCCÈS changement mot de passe
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("CHANGE_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Changement de mot de passe")
                            .entity(EntityType.USER, userId, email)
                            .user(userId, email, userRole )
                            .success()
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Mot de passe changé avec succès"
            ));
        } catch (IllegalArgumentException e) {

            // ✅ AUDIT: ÉCHEC changement mot de passe - argument invalide
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("CHANGE_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Échec changement mot de passe - argument invalide")
                            .failure(e.getMessage())
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            // ✅ AUDIT: ÉCHEC changement mot de passe
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("CHANGE_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Échec changement mot de passe")
                            .failure(e.getMessage())
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody InitiateResetRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail();
        String clientIp = getClientIp(httpRequest);
        try {
            userService.initiatePasswordReset(request.getEmail());
            // ✅ AUDIT: Demande réinitialisation mot de passe
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("FORGOT_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Demande de réinitialisation de mot de passe")
                            .success()
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email de réinitialisation envoyé"
            ));
        } catch (RuntimeException e) {
            // ✅ AUDIT: ÉCHEC demande réinitialisation
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("FORGOT_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Échec demande de réinitialisation")
                            .failure(e.getMessage())
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }


    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody PasswordResetRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        try {
            userService.resetPassword(request.getToken(), request.getNewPassword());
            // ✅ AUDIT: Réinitialisation mot de passe effectuée
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("RESET_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Réinitialisation de mot de passe effectuée")
                            .success()
                            .detail("token_used", request.getToken().substring(0, Math.min(10, request.getToken().length())) + "...")
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Mot de passe réinitialisé avec succès"
            ));
        } catch (RuntimeException e) {
            // ✅ AUDIT: ÉCHEC réinitialisation
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("RESET_PASSWORD")
                            .actionType(ActionType.SECURITY)
                            .description("Échec réinitialisation de mot de passe")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }


    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        try {
            // Vérifier l'authentification
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "error", "Token d'authentification manquant ou mal formaté"));
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "error", "Token invalide ou expiré"));
            }

            // Extraire l'email du token
            String email = jwtUtil.extractUsername(token);

            // Récupérer l'utilisateur
            UserDTO user = userService.getUserByEmail(email);

            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "error", "Utilisateur non trouvé"));
            }

            // ✅ AUDIT: Consultation profil
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("GET_PROFILE")
                            .actionType(ActionType.SEARCH)
                            .description("Consultation du profil utilisateur")
                            .entity(EntityType.USER, user.getId(), user.getEmail())
                            .user(user.getId(), user.getEmail(), user.getRole().name())
                            .success()
                            .detail("ip_address", clientIp)
            );

            // Construire la réponse
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("success", true);
            responseBody.put("user", user);

            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(responseBody);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "error", "Erreur interne: " + e.getMessage()
                    ));
        }
    }
    @PutMapping("/update-profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateProfileRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        try {
            System.out.println("***update***");
            // Vérifier l'authentification
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
            UserDTO updatedUser = userService.updateProfile(email, request);

            // ✅ AUDIT: Mise à jour profil
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("UPDATE_PROFILE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Mise à jour du profil utilisateur")
                            .entity(EntityType.USER, updatedUser.getId(), updatedUser.getEmail())
                            .user(updatedUser.getId(), updatedUser.getEmail(), updatedUser.getRole().name())
                            .success()
                            .detail("fields_updated", "profil_utilisateur")
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Profil mis à jour avec succès",
                    "user", updatedUser
            ));
        } catch (IllegalArgumentException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("UPDATE_PROFILE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec mise à jour profil - argument invalide")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("UPDATE_PROFILE")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur serveur mise à jour profil")
                            .failure(e.getMessage())
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/deactivation-request")
    public ResponseEntity<?> requestDeactivation(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody(required = false) DeactivationRequestDto requestDto,
            HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String email = null;
        Long userId = null;
        String userRole = null;
        try {
            // Vérifier l'authentification
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token invalide ou expiré"));
            }

            email = jwtUtil.extractUsername(token);
            UserDTO user = userService.getUserByEmail(email);
            if (user != null) {
                userId = user.getId();
                userRole = user.getRole().name();
            }

            // Vérifier si l'utilisateur peut faire une demande
            if (!userService.canCreateDeactivationRequest(email)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Vous avez déjà une demande de désactivation en cours"));
            }

            String reason = requestDto != null ? requestDto.getReason() : null;
            boolean isUrgent = requestDto != null && requestDto.isUrgent();

            userService.createDeactivationRequest(email, reason, isUrgent);
            // ✅ AUDIT: Demande désactivation
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("DEACTIVATION_REQUEST")
                            .actionType(ActionType.MODIFICATION)
                            .description("Demande de désactivation de compte")
                            .entity(EntityType.USER, userId, email)
                            .user(userId, email, userRole )
                            .success()
                            .detail("reason", reason != null ? reason : "Non spécifiée")
                            .detail("is_urgent", isUrgent)
                            .detail("ip_address", clientIp)
            );


            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande de désactivation envoyée avec succès",
                    "requestId", "Votre demande a été enregistrée"
            ));
        } catch (IllegalArgumentException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("DEACTIVATION_REQUEST")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec demande désactivation")
                            .failure(e.getMessage())
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("DEACTIVATION_REQUEST")
                            .actionType(ActionType.MODIFICATION)
                            .description("Erreur serveur demande désactivation")
                            .failure(e.getMessage())
                            .detail("email", email)
                            .detail("ip_address", clientIp)
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }



    @GetMapping("/deactivation-request/status")
    public ResponseEntity<?> getDeactivationRequestStatus(@RequestHeader("Authorization") String authHeader) {
        try {
            // Vérifier l'authentification
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
            boolean hasPendingRequest = userService.hasPendingDeactivationRequest(email);

            // Récupérer aussi la demande si elle existe
            List<DeactivationRequest> requests = userService.getUserDeactivationRequests(email);
            DeactivationRequest pendingRequest = requests.stream()
                    .filter(r -> r.getStatus() == DeactivationStatus.PENDING || r.getStatus() == DeactivationStatus.IN_REVIEW)
                    .findFirst()
                    .orElse(null);

            Map<String, Object> response = new HashMap<>();
            response.put("hasPendingRequest", hasPendingRequest);
            response.put("success", true);

            if (pendingRequest != null) {
                response.put("requestId", pendingRequest.getId());
                response.put("requestDate", pendingRequest.getRequestDate());
                response.put("isUrgent", pendingRequest.isUrgent());
                response.put("status", pendingRequest.getStatus().name());
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}