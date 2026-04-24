package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.archive.ArchiveDemandeDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.service.impl.ArchiveService;
import com.tunisia.commerce.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/archive")
@RequiredArgsConstructor
public class ArchiveController {

    private final ArchiveService archiveService;
    private final JwtUtil jwtUtil;
    private final Logger logger = Logger.getLogger(getClass().getName());

    // 1. Archivage manuel par admin (une seule demande)
    @PostMapping("/demande/{demandeId}")
    public ResponseEntity<?> archiveDemande(
            @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody(required = false) Map<String, String> body) {

        try {
            // Vérifier le token et le rôle
            String email = validateAdminToken(authHeader);

            String reason = body != null && body.containsKey("reason")
                    ? body.get("reason")
                    : "Archivage manuel par administrateur";

            archiveService.manualArchive(demandeId, email, reason);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande archivée avec succès"
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.severe("Erreur lors de l'archivage: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // 2. Archivage multiple par admin
    @PostMapping("/bulk")
    public ResponseEntity<?> bulkArchive(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request) {

        logger.info("=== DÉBUT ARCHIVAGE MULTIPLE ===");
        logger.info("Request body reçu: " + request);

        try {
            // 1. Extraction du token
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                logger.warning("Token manquant ou invalide");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token d'authentification manquant"));
            }

            String token = authHeader.substring(7);

            // 2. Validation du token
            if (!jwtUtil.validateToken(token)) {
                logger.warning("Token invalide ou expiré");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token invalide ou expiré"));
            }

            String email = jwtUtil.extractUsername(token);
            String role = jwtUtil.extractRole(token);

            logger.info("Utilisateur: " + email + ", Rôle: " + role);

            // 3. Vérification du rôle ADMIN
            if (!"ADMIN".equals(role)) {
                logger.warning("Accès non autorisé pour le rôle: " + role);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Accès non autorisé. Rôle ADMIN requis."));
            }

            logger.info("Admin authentifié: " + email);

            // 4. Récupération des IDs
            Object demandeIdsObj = request.get("demandeIds");
            logger.info("demandeIds reçu: " + demandeIdsObj);

            if (demandeIdsObj == null) {
                logger.warning("demandeIds est null");
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "La liste des IDs des demandes est requise"));
            }

            List<Long> demandeIds = new ArrayList<>();

            if (demandeIdsObj instanceof List) {
                List<?> rawList = (List<?>) demandeIdsObj;
                for (Object item : rawList) {
                    if (item instanceof Number) {
                        demandeIds.add(((Number) item).longValue());
                    } else if (item instanceof String) {
                        try {
                            demandeIds.add(Long.parseLong((String) item));
                        } catch (NumberFormatException e) {
                            logger.warning("ID invalide: " + item);
                        }
                    }
                }
            } else if (demandeIdsObj instanceof Integer) {
                demandeIds.add(((Integer) demandeIdsObj).longValue());
            } else if (demandeIdsObj instanceof Long) {
                demandeIds.add((Long) demandeIdsObj);
            } else {
                logger.warning("Format de demandeIds non supporté: " + demandeIdsObj.getClass());
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Format de la liste des IDs invalide"));
            }

            if (demandeIds.isEmpty()) {
                logger.warning("Aucun ID valide trouvé");
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Aucun ID valide dans la liste"));
            }

            // 5. Récupération de la raison
            String reason = request.containsKey("reason") ? (String) request.get("reason") : "Archivage massif par administrateur";

            // 6. Appel du service
            archiveService.bulkArchive(demandeIds, email, reason);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", demandeIds.size() + " demande(s) archivée(s) avec succès"
            ));

        } catch (Exception e) {
            logger.severe("Erreur lors de l'archivage: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne du serveur: " + e.getMessage()));
        }
    }

    // 3. Demande d'archivage par l'utilisateur (exportateur/importateur)
    @PostMapping("/request/{demandeId}")
    public ResponseEntity<?> requestArchive(
            @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader) {

        try {
            String email = validateUserToken(authHeader);

            archiveService.userArchiveRequest(demandeId, email);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande d'archivage soumise avec succès"
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.severe("Erreur lors de la demande d'archivage: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // 4. Restaurer une demande archivée (admin uniquement)
    @PostMapping("/restore/{demandeId}")
    public ResponseEntity<?> restoreDemande(
            @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader) {

        try {
            String email = validateAdminToken(authHeader);

            archiveService.restoreDemande(demandeId, email);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Demande restaurée avec succès"
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.severe("Erreur lors de la restauration: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // 5. Récupérer toutes les demandes archivées (admin)
    @GetMapping("/all")
    public ResponseEntity<?> getAllArchivedDemandes(
            @RequestHeader("Authorization") String authHeader) {

        try {
            validateAdminToken(authHeader);

            List<DemandeEnregistrement> archivedDemandes = archiveService.getArchivedDemandes();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", archivedDemandes,
                    "count", archivedDemandes.size()
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.severe("Erreur lors de la récupération: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // 6. Récupérer les demandes archivées par l'utilisateur connecté
    @GetMapping("/my-archives")
    public ResponseEntity<?> getMyArchivedDemandes(
            @RequestHeader("Authorization") String authHeader) {

        try {
            System.out.println("***archive");
            String email = validateUserToken(authHeader);
            String role = extractRoleFromToken(authHeader); // ← Récupérer le rôle


            List<ArchiveDemandeDTO> archivedDemandes = archiveService.getArchivedDemandesByUser(email,role);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", archivedDemandes,
                    "count", archivedDemandes.size()
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.severe("Erreur lors de la récupération: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }


    // 7. Vérifier si une demande est archivée
    @GetMapping("/check/{demandeId}")
    public ResponseEntity<?> checkArchived(
            @PathVariable Long demandeId,
            @RequestHeader("Authorization") String authHeader) {

        try {
            validateUserToken(authHeader);

            boolean isArchived = archiveService.isDemandeArchived(demandeId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "isArchived", isArchived
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.severe("Erreur lors de la vérification: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne du serveur"));
        }
    }

    // Méthodes utilitaires pour la validation des tokens
    private String validateAdminToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Token d'authentification manquant");
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.validateToken(token)) {
            throw new IllegalArgumentException("Token invalide ou expiré");
        }

        String role = jwtUtil.extractRole(token);
        if (!"ADMIN".equals(role)) {
            throw new RuntimeException("Accès non autorisé. Rôle ADMIN requis.");
        }

        return jwtUtil.extractUsername(token);
    }

    private String validateUserToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Token d'authentification manquant");
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.validateToken(token)) {
            throw new IllegalArgumentException("Token invalide ou expiré");
        }

        return jwtUtil.extractUsername(token);
    }

    private String extractRoleFromToken(String authHeader) {
        String token = authHeader.substring(7);
        return jwtUtil.extractRole(token);
    }
}