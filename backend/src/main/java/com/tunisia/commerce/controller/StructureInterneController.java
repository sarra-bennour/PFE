package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.structure.CreateStructureRequestDTO;
import com.tunisia.commerce.dto.structure.StructureInterneDTO;
import com.tunisia.commerce.dto.structure.UpdateStructureRequestDTO;
import com.tunisia.commerce.entity.Administrateur;
import com.tunisia.commerce.enums.StructureType;
import com.tunisia.commerce.repository.AdministrateurRepository;
import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.service.impl.StructureInterneServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/structures")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class StructureInterneController {

    private final StructureInterneServiceImpl structureService;
    private final JwtUtil jwtUtil;
    private final AdministrateurRepository administrateurRepository;

    /**
     * Créer une nouvelle structure interne
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStructure(
            @Valid @RequestBody CreateStructureRequestDTO request,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== CRÉATION STRUCTURE INTERNE ===");
            Long adminId = getAdminIdFromToken(authHeader);

            StructureInterneDTO created = structureService.createStructure(request, adminId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Structure créée avec succès");
            response.put("data", created);

            return new ResponseEntity<>(response, HttpStatus.CREATED);

        } catch (RuntimeException e) {
            log.error("Erreur lors de la création: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue: " + e.getMessage()
            ));
        }
    }

    /**
     * Mettre à jour une structure interne
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateStructure(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStructureRequestDTO request,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== MISE À JOUR STRUCTURE ID: {} ===", id);
            Long adminId = getAdminIdFromToken(authHeader);

            StructureInterneDTO updated = structureService.updateStructure(id, request, adminId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Structure mise à jour avec succès");
            response.put("data", updated);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("Erreur lors de la mise à jour: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Supprimer définitivement une structure interne
     */
    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStructureHard(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== SUPPRESSION PHYSIQUE STRUCTURE ID: {} ===", id);
            Long adminId = getAdminIdFromToken(authHeader);

            structureService.deleteStructureHard(id, adminId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Structure supprimée définitivement avec succès"
            ));

        } catch (RuntimeException e) {
            log.error("Erreur lors de la suppression: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Désactiver une structure interne (suppression logique)
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateStructure(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== DÉSACTIVATION STRUCTURE ID: {} ===", id);
            Long adminId = getAdminIdFromToken(authHeader);

            StructureInterneDTO deactivated = structureService.deactivateStructure(id, adminId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Structure désactivée avec succès",
                    "data", deactivated
            ));

        } catch (RuntimeException e) {
            log.error("Erreur lors de la désactivation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Réactiver une structure interne
     */
    @PutMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> reactivateStructure(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== RÉACTIVATION STRUCTURE ID: {} ===", id);
            Long adminId = getAdminIdFromToken(authHeader);

            StructureInterneDTO reactivated = structureService.reactivateStructure(id, adminId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Structure réactivée avec succès",
                    "data", reactivated
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
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Récupérer toutes les structures internes
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllStructures(@RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION DE TOUTES LES STRUCTURES ===");
            validateAdmin(authHeader);

            List<StructureInterneDTO> structures = structureService.getAllStructures();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "structures", structures,
                    "count", structures.size()
            ));

        } catch (RuntimeException e) {
            log.error("Erreur: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Une erreur technique est survenue"
            ));
        }
    }

    /**
     * Récupérer les structures actives
     */
    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getActiveStructures(@RequestHeader("Authorization") String authHeader) {
        try {
            log.info("=== RÉCUPÉRATION DES STRUCTURES ACTIVES ===");
            validateAdmin(authHeader);

            List<StructureInterneDTO> structures = structureService.getAllActiveStructures();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "structures", structures,
                    "count", structures.size()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer une structure par son ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getStructureById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== RÉCUPÉRATION STRUCTURE ID: {} ===", id);
            validateAdmin(authHeader);

            StructureInterneDTO structure = structureService.getStructureById(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "structure", structure
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer les structures par type
     */
    @GetMapping("/type/{type}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getStructuresByType(
            @PathVariable StructureType type,
            @RequestHeader("Authorization") String authHeader) {

        try {
            log.info("=== RÉCUPÉRATION STRUCTURES PAR TYPE: {} ===", type);
            validateAdmin(authHeader);

            List<StructureInterneDTO> structures = structureService.getStructuresByType(type);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "structures", structures,
                    "count", structures.size()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private void validateAdmin(String authHeader) {
        getAdminIdFromToken(authHeader);
    }

    private Long getAdminIdFromToken(String authHeader) {
        String token = extractToken(authHeader);
        String email = jwtUtil.extractUsername(token);

        Administrateur admin = administrateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé avec l'email: " + email));

        return admin.getId();
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification manquant ou invalide");
        }
        return authHeader.substring(7);
    }
}