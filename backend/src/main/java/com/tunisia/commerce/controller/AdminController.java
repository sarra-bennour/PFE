package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.admin.AdminDemandeDTO;
import com.tunisia.commerce.dto.user.CreateInstanceValidationRequest;
import com.tunisia.commerce.dto.user.DeactivationRequestAdminDTO;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.entity.Administrateur;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.InstanceValidation;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.exception.InstanceValidationException;
import com.tunisia.commerce.repository.AdministrateurRepository;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.UserService;
import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.service.impl.AdminServiceImpl;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
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
    private final DocumentRepository documentRepository;
    private final AdminServiceImpl adminService;
    private final UserRepository userRepository;
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
     * Récupérer TOUTES les demandes sans filtre
     */
    @GetMapping("/all-demandes")
    public ResponseEntity<?> getAllDemandes(@RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION DE TOUTES LES DEMANDES ===");
            validateAdmin(authHeader);

            List<AdminDemandeDTO> demandes = adminService.getAllActiveDemandes();


            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", demandes,
                    "count", demandes.size()
            ));
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des demandes: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/archived-demandes")
    public ResponseEntity<?> getArchivedDemandes(@RequestHeader("Authorization") String authHeader) {
        try {
            validateAdmin(authHeader);

            List<AdminDemandeDTO> archivedDemandes = adminService.getAllArchivedDemandes();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", archivedDemandes,
                    "count", archivedDemandes.size()
            ));

        } catch (Exception e) {
            log.error("Erreur: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    /**
     * Récupérer une demande par ID avec tous les détails
     */
    @GetMapping("/demande/{id}")
    public ResponseEntity<?> getDemandeById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION DEMANDE ID: {} ===", id);
            validateAdmin(authHeader);

            AdminDemandeDTO demande = adminService.getDemandeById(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", demande
            ));
        } catch (RuntimeException e) {
            log.error("Demande non trouvée: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erreur interne: " + e.getMessage()
            ));
        }
    }

    /**
     * Prévisualiser un document (affiche dans le navigateur)
     * Accessible par ADMIN et INSTANCE_VALIDATION
     */
    @GetMapping("/document/{documentId}/preview")
    public ResponseEntity<?> previewDocument(
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== PRÉVISUALISATION DOCUMENT ID: {} ===", documentId);

            // 🔥 MODIFICATION : Vérifier le rôle au lieu d'appeler validateAdmin()
            String token = extractToken(authHeader);
            String email = jwtUtil.extractUsername(token);

            // Récupérer l'utilisateur
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

            // Vérifier si l'utilisateur est ADMIN ou INSTANCE_VALIDATION
            boolean isAdmin = user instanceof Administrateur;
            boolean isInstanceValidation = user instanceof InstanceValidation;

            if (!isAdmin && !isInstanceValidation) {
                log.error("Accès non autorisé pour l'utilisateur: {}", email);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "success", false,
                        "error", "Accès non autorisé. Seuls les administrateurs et validateurs peuvent visualiser les documents."
                ));
            }

            Document document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé avec l'ID: " + documentId));

            byte[] fileContent = adminService.getDocumentContent(document);

            String contentType = document.getFileType();
            if (contentType == null) {
                String fileName = document.getFileName().toLowerCase();
                if (fileName.endsWith(".pdf")) contentType = "application/pdf";
                else if (fileName.endsWith(".png")) contentType = "image/png";
                else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) contentType = "image/jpeg";
                else contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getFileName() + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(fileContent);

        } catch (RuntimeException e) {
            log.error("Document non trouvé: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (IOException e) {
            log.error("Erreur lecture fichier: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erreur lors de la lecture du fichier"
            ));
        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer les statistiques des demandes
     */
    @GetMapping("/demandes-statistics")
    public ResponseEntity<?> getDemandesStatistics(@RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION STATISTIQUES DES DEMANDES ===");
            validateAdmin(authHeader);

            Map<String, Object> stats = adminService.getDemandesStatistics();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", stats
            ));
        } catch (Exception e) {
            log.error("Erreur: {}", e.getMessage());
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
     * Changer le statut d'un utilisateur (SUSPENDRE)
     */
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<?> toggleUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== CHANGEMENT STATUT UTILISATEUR ID: {} ===", userId);
            log.info("status", request.get("status"));
            validateAdmin(authHeader);

            String newStatus = request.get("status");

            if (newStatus == null || (!newStatus.equals("ACTIF") && !newStatus.equals("INACTIF"))) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Statut invalide. Utilisez 'ACTIF' ou 'INACTIF'"
                ));
            }

            // 🔥 Appeler la méthode du service
            userService.updateUserStatus(userId, newStatus);

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


    // ==================== INSTANCE VALIDATION ENDPOINTS ====================

    @PostMapping("/instance-validation/create")
    public ResponseEntity<?> createInstanceValidation(@RequestBody CreateInstanceValidationRequest request) {
        try {
            log.info("=== CRÉATION INSTANCE DE VALIDATION ===");
            log.info("Structure reçue: {}", request.getStructure());

            UserDTO created = userService.createInstanceValidation(request);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Instance de validation créée avec succès. Un email avec le mot de passe a été envoyé.",
                    "data", created
            ));
        } catch (InstanceValidationException e) {
            log.error("Erreur métier: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "errorCode", e.getErrorCode()
            ));
        } catch (Exception e) {
            log.error("Erreur technique: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue: " + e.getMessage()
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