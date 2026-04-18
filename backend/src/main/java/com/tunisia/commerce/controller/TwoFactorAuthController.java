package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.user.TwoFactorSetupResponse;
import com.tunisia.commerce.dto.user.TwoFactorVerifyRequest;
import com.tunisia.commerce.dto.user.TwoFactorVerifyResponse;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.UserService;
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

    Logger logger = Logger.getLogger(getClass().getName());


    @PostMapping("/setup")
    public ResponseEntity<?> setup2FA(@RequestHeader("Authorization") String authHeader) {
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
            TwoFactorSetupResponse response = userService.setupTwoFactorAuth(email);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", response
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/enable")
    public ResponseEntity<?> enable2FA(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody TwoFactorVerifyRequest request) {
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

            // Vérifier que l'email correspond
            if (!email.equals(request.getEmail())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email ne correspond pas au token"));
            }

            boolean enabled = userService.enableTwoFactorAuth(email, request.getCode());

            if (enabled) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "2FA activé avec succès"
                ));
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Code de vérification invalide"));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/disable")
    public ResponseEntity<?> disable2FA(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody TwoFactorVerifyRequest request) {
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

            // Vérifier que l'email correspond
            if (!email.equals(request.getEmail())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email ne correspond pas au token"));
            }

            boolean disabled = userService.disableTwoFactorAuth(email, request.getCode());

            if (disabled) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "2FA désactivé avec succès"
                ));
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Code de vérification invalide"));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify2FA(@RequestBody TwoFactorVerifyRequest request) {
        try {
            boolean isValid = userService.verifyTwoFactorCode(request.getEmail(), request.getCode());

            if (isValid) {
                // Récupérer uniquement les informations nécessaires
                User user = userRepository.findByEmail(request.getEmail())
                        .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

                String token = jwtUtil.generateToken(request.getEmail(), user.getRole().name());

                // Créer un DTO pour éviter les problèmes de sérialisation
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("token", token);
                response.put("email", user.getEmail());
                response.put("role", user.getRole());

                // Créer un objet utilisateur simplifié sans relations problématiques
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
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "success", false,
                                "error", "Code 2FA invalide"
                        ));
            }
        } catch (RuntimeException e) {
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
            @RequestBody Map<String, String> request) {
        try {
            // Vérifier l'authentification
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

            // Logique pour renvoyer un code 2FA (par email, SMS, etc.)
            // À implémenter selon votre méthode d'envoi de code 2FA
            userService.resendTwoFactorCode(email);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Code 2FA renvoyé avec succès"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status/{email}")
    public ResponseEntity<?> get2FAStatus(@PathVariable String email) {
        try {
            Map<String, Object> response = new HashMap<>();

            Optional<ExportateurEtranger> exportateurOpt = exportateurRepository.findByEmail(email);

            if (exportateurOpt.isEmpty()) {
                response.put("success", true);
                response.put("enabled", false);
                response.put("email", email);
                response.put("hasSecret", false);
                response.put("message", "Utilisateur non trouvé");
                return ResponseEntity.ok(response);
            }

            ExportateurEtranger exportateur = exportateurOpt.get();

            response.put("success", true);
            response.put("enabled", exportateur.isTwoFactorEnabled());
            response.put("email", exportateur.getEmail());
            response.put("hasSecret", exportateur.getTwoFactorSecret() != null);
            response.put("message", "Statut récupéré avec succès");

            // Évitez de mettre l'objet entier dans la réponse
            // response.put("user", exportateur); // NE PAS FAIRE ÇA

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.severe("Erreur lors de la récupération du statut 2FA "+ e);

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