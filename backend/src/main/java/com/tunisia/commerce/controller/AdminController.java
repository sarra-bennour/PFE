package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.user.DeactivationRequestAdminDTO;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.entity.Administrateur;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.repository.AdministrateurRepository;
import com.tunisia.commerce.service.UserService;
import com.tunisia.commerce.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final AdministrateurRepository administrateurRepository;
    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    /**
     * Récupérer tous les utilisateurs
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION DE TOUS LES UTILISATEURS ===");
            validateAdmin(authHeader);

            List<UserDTO> users = userService.getAllUsers();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "users", users,
                    "count", users.size()
            ));
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des utilisateurs: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer un utilisateur par son ID
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION UTILISATEUR ID: {} ===", id);
            validateAdmin(authHeader);

            UserDTO user = userService.getUserById(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "user", user
            ));
        } catch (Exception e) {
            log.error("Erreur lors de la récupération de l'utilisateur: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer toutes les demandes de désactivation en attente
     */
    @GetMapping("/deactivation-requests")
    public ResponseEntity<?> getAllDeactivationRequests(@RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION DES DEMANDES DE DÉSACTIVATION ===");
            validateAdmin(authHeader);

            List<DeactivationRequestAdminDTO> requests = userService.getAllDeactivationRequests();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "requests", requests,
                    "count", requests.size()
            ));
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des demandes: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Changer le statut d'un utilisateur
     */
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<?> toggleUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== CHANGEMENT STATUT UTILISATEUR ID: {} ===", userId);
            validateAdmin(authHeader);

            String newStatus = request.get("status");

            // Ici, vous pouvez implémenter la logique de changement de statut
            // userService.updateUserStatus(userId, newStatus);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Statut utilisateur mis à jour avec succès"
            ));
        } catch (Exception e) {
            log.error("Erreur lors du changement de statut: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/deactivation-requests/{requestId}/process")
    public ResponseEntity<?> processDeactivationRequest(
            @PathVariable Long requestId,
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== TRAITEMENT DEMANDE DE DÉSACTIVATION ID: {} ===", requestId);

            // Vérifier que l'utilisateur est admin
            Administrateur admin = getAdminFromToken(authHeader);

            String action = request.get("action");
            String adminComment = request.get("comment");

            if (action == null || (!action.equals("ACCEPT") && !action.equals("REJECT"))) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Action invalide. Utilisez 'ACCEPT' ou 'REJECT'"
                ));
            }

            // Traiter la demande
            DeactivationRequestAdminDTO processedRequest = userService.processDeactivationRequest(
                    requestId, action, adminComment, admin.getId()
            );

            String message = action.equals("ACCEPT")
                    ? "Demande approuvée avec succès. Le compte a été désactivé."
                    : "Demande rejetée avec succès.";

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", message,
                    "request", processedRequest
            ));

        } catch (RuntimeException e) {
            log.error("Erreur lors du traitement: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erreur interne du serveur: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/users/{userId}/reactivate")
    public ResponseEntity<?> reactivateAccount(
            @PathVariable Long userId,
            @RequestBody(required = false) Map<String, String> request,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== RÉACTIVATION DE COMPTE ID: {} ===", userId);

            // Vérifier que l'utilisateur est admin
            validateAdmin(authHeader);

            String adminComment = request != null ? request.get("comment") : null;

            userService.reactivateAccount(userId, adminComment);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Compte réactivé avec succès"
            ));

        } catch (RuntimeException e) {
            log.error("Erreur lors de la réactivation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erreur interne: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/users/{userId}/reset-password")
    public ResponseEntity<?> resetUserPassword(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== RÉINITIALISATION MOT DE PASSE - ID: {} ===", userId);

            // Vérifier que l'utilisateur est admin
            validateAdmin(authHeader);

            // Récupérer l'utilisateur pour vérifier son type
            UserDTO user = userService.getUserById(userId);

            // Vérifier si l'utilisateur est un importateur
            if (user.getRole() == UserRole.IMPORTATEUR) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Les importateurs n'utilisent pas de mot de passe. Ils s'authentifient via Mobile ID."
                ));
            }

            String newPassword = userService.resetUserPassword(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Mot de passe réinitialisé avec succès et envoyé par email");

            // En développement uniquement - NE PAS FAIRE EN PRODUCTION
            response.put("newPassword", newPassword);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("Erreur lors de la réinitialisation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erreur interne: " + e.getMessage()
            ));
        }
    }
    // ==================== MÉTHODES PRIVÉES ====================

    private void validateAdmin(String authHeader) {
        Administrateur admin = getAdminFromToken(authHeader);
        if (!admin.isSuperAdmin()) {
            throw new RuntimeException("Accès non autorisé. Privilèges super administrateur requis.");
        }
    }

    private Administrateur getAdminFromToken(String authHeader) {
        String token = extractToken(authHeader);
        String email = jwtUtil.extractUsername(token);

        return administrateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé avec l'email: " + email));
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification manquant ou invalide");
        }
        return authHeader.substring(7);
    }
}