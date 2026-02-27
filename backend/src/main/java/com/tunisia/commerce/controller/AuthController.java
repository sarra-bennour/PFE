package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;


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
    public ResponseEntity<UserDTO> signup(@RequestBody ExportateurSignupRequest request) {
        return ResponseEntity.ok(userService.registerExportateur(request));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {

            // Appeler d'abord login pour vérifier le mot de passe
            LoginResponse response = userService.login(request);

            // Ensuite vérifier si l'email est vérifié
            UserDTO user = response.getUser();

            // Dans votre AuthController, lors du login
            String token = jwtUtil.generateToken(user.getEmail(), "ROLE_" + user.getRole().name());
            System.out.println("🔑 Token généré pour " + user.getEmail() + ": " + token);

            // Vérifier si l'email est vérifié (pour les exportateurs)
            if (user.getRole() == UserRole.EXPORTATEUR && !user.isEmailVerified()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "error", "EMAIL_NOT_VERIFIED",
                                "message", "Veuillez vérifier votre email avant de vous connecter",
                                "email", user.getEmail()
                        ));
            }

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            // Si c'est une erreur "email non vérifié", la traiter spécifiquement
            if (e.getMessage() != null && e.getMessage().contains("Email non vérifié")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "error", "EMAIL_NOT_VERIFIED",
                                "message", e.getMessage(),
                                "email", request.getEmail()
                        ));
            }

            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login/mobile")
    public ResponseEntity<LoginResponse> mobileLogin(@RequestBody MobileLoginRequest request) {
        return ResponseEntity.ok(userService.mobileLogin(request));
    }

    @PostMapping("/2fa/enable/{email}")
    public ResponseEntity<Void> enable2FA(@PathVariable String email) {
        userService.enableTwoFactorAuth(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<Boolean> verify2FA(@RequestBody TwoFactorVerifyRequest request) {
        boolean isValid = userService.verifyTwoFactorCode(request.getEmail(), request.getCode());
        return ResponseEntity.ok(isValid);
    }

    /*@GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@RequestHeader("Authorization") String token) {
        // Extraire l'email du token via JwtUtil si nécessaire
        // Pour simplifier, on pourrait avoir un endpoint qui prend l'email en paramètre
        return ResponseEntity.ok().build();
    }*/

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


    @PutMapping("/profile")
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