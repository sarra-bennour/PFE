package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.admin.DouaneVerificationResponse;
import com.tunisia.commerce.entity.Administrateur;
import com.tunisia.commerce.entity.Douane;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.repository.AdministrateurRepository;
import com.tunisia.commerce.repository.DouaneRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.impl.DouaneService;
import com.tunisia.commerce.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/douane")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DouaneController {

    private static final Logger log = LoggerFactory.getLogger(DouaneController.class);

    private final DouaneService douaneService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    /**
     * Vérifier une référence de dossier (accessible par DOUANE et ADMIN)
     * GET /api/douane/verify/{reference}
     */
    @GetMapping("/verify/{reference}")
    public ResponseEntity<?> verifyReference(
            @PathVariable String reference,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== VÉRIFICATION RÉFÉRENCE DOUANE: {} ===", reference);

            // Vérifier l'authentification et les droits
            String email = extractEmailFromToken(authHeader);
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // Vérifier que l'utilisateur est DOUANE ou ADMIN
            boolean isDouane = user instanceof Douane || user.getRole() == UserRole.DOUANE;
            boolean isAdmin = user instanceof Administrateur || user.getRole() == UserRole.ADMIN;

            if (!isDouane && !isAdmin) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Accès non autorisé. Seuls les agents douaniers et administrateurs peuvent accéder à cette ressource."
                ));
            }

            // Rechercher la référence
            DouaneVerificationResponse result = douaneService.verifyReference(reference);

            if (result == null) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "error", "NOT_FOUND",
                        "message", "Aucun dossier validé trouvé avec cette référence"
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", result
            ));

        } catch (Exception e) {
            log.error("Erreur lors de la vérification: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    private String extractEmailFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification manquant ou invalide");
        }
        String token = authHeader.substring(7);
        return jwtUtil.extractUsername(token);
    }
}