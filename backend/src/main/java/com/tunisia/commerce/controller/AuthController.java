package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.exception.AuthException;
import com.tunisia.commerce.exception.MobileAuthException;
import com.tunisia.commerce.service.UserService;
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
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);



    // Méthode privée pour extraire l'email depuis le token
    private String extractEmailFromAuthHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authHeader.substring(7); // Supprimer "Bearer "
        return jwtUtil.extractUsername(token);
    }

    // Méthode pour valider l'authentification
    private ResponseEntity<?> validateAuthentication(String authHeader) {
        String email = extractEmailFromAuthHeader(authHeader);

        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token d'authentification manquant ou invalide"));
        }

        return null; // null signifie que l'authentification est valide
    }

    @PostMapping("/signup/exporter")
    public ResponseEntity<?> signup(@RequestBody ExportateurSignupRequest request) {
        try {
            UserDTO userDTO = userService.registerExportateur(request);
            return ResponseEntity.ok(userDTO);
        } catch (AuthException e) {
            // Structure avec 'error' et 'message' comme attendu par le frontend
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(errorResponse);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", "Une erreur inattendue s'est produite");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            log.info("Tentative de connexion pour l'email: {}", request.getEmail());

            LoginResponse response = userService.login(request);

            log.info("Connexion réussie pour: {}", request.getEmail());

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

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "SERVER_ERROR");
            errorResponse.put("message", "Une erreur interne est survenue. Veuillez réessayer plus tard.");
            errorResponse.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/login/mobile")
    public ResponseEntity<?> mobileLogin(@RequestBody MobileLoginRequest request) {
        try {
            log.info("Tentative de login mobile avec matricule: " + request.getMatricule());

            LoginResponse response = userService.mobileLogin(request);

            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("success", true);
            successResponse.put("token", response.getToken());
            successResponse.put("requiresTwoFactor", response.isRequiresTwoFactor());
            successResponse.put("user", response.getUser());
            successResponse.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.ok(successResponse);

        } catch (MobileAuthException e) {
            log.warn("Échec login mobile: {} - {}", e.getErrorCode(), e.getMessage());

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.status(e.getStatus()).body(errorResponse);

        } catch (Exception e) {
            log.error("Erreur inattendue lors du login mobile", e);

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
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        try {
            boolean verified = userService.verifyEmail(token);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email vérifié avec succès"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerificationEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email requis"));
        }

        try {
            userService.resendVerificationEmail(email);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email de vérification renvoyé"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ChangePasswordRequest request) {
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
            String email = jwtUtil.extractUsername(token);

            // 5. Appeler le service
            userService.changePassword(email, request);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Mot de passe changé avec succès"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody InitiateResetRequest request) {
        try {
            userService.initiatePasswordReset(request.getEmail());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email de réinitialisation envoyé"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/validate-reset-token")
    public ResponseEntity<?> validateResetToken(@RequestParam String token) {
        try {
            boolean isValid = userService.validateResetToken(token);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "valid", isValid,
                    "message", "Token valide"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody PasswordResetRequest request) {
        try {
            userService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Mot de passe réinitialisé avec succès"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }


    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
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
            @RequestBody UpdateProfileRequest request) {
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
            UserDTO updatedUser = userService.updateProfile(email, request);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Profil mis à jour avec succès",
                    "user", updatedUser
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/deactivation-request")
    public ResponseEntity<?> requestDeactivation(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody(required = false) DeactivationRequestDto requestDto) {
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

            // Vérifier si l'utilisateur peut faire une demande
            if (!userService.canCreateDeactivationRequest(email)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Vous avez déjà une demande de désactivation en cours"));
            }

            String reason = requestDto != null ? requestDto.getReason() : null;
            boolean isUrgent = requestDto != null && requestDto.isUrgent();

            userService.createDeactivationRequest(email, reason, isUrgent);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande de désactivation envoyée avec succès",
                    "requestId", "Votre demande a été enregistrée"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/deactivation-requests")
    public ResponseEntity<?> getMyDeactivationRequests(
            @RequestHeader("Authorization") String authHeader) {
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
            List<DeactivationRequest> requests = userService.getUserDeactivationRequests(email);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "requests", requests
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/deactivation-requests/{requestId}/cancel")
    public ResponseEntity<?> cancelDeactivationRequest(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long requestId) {
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
            userService.cancelDeactivationRequest(email, requestId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande de désactivation annulée avec succès"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}