package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.produits.DemandeEnregistrementRequestDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.service.impl.DemandeEnregistrementService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/produits")
@RequiredArgsConstructor
@Tag(name = "Demandes d'enregistrement", description = "API pour la gestion des demandes d'enregistrement des exportateurs")
@CrossOrigin(origins = "*")
public class ProduitController {

    private final DemandeEnregistrementService demandeService;
    private final JwtUtil jwtUtil;
    private final ExportateurRepository exportateurRepository;

    /**
     * Créer une nouvelle demande d'enregistrement
     */
    @PostMapping
    @Operation(summary = "Créer une nouvelle demande")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<DemandeEnregistrementDTO> createDemande(
            @Valid @RequestBody DemandeEnregistrementRequestDTO request,
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        // S'assurer que l'ID dans la requête correspond à l'exportateur connecté
        request.setExportateurId(exportateur.getId());

        DemandeEnregistrementDTO created = demandeService.createDemande(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    /**
     * Uploader un document pour une demande
     */
    @PostMapping(value = "/{demandeId}/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Uploader un document")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<DocumentDTO> uploadDocument(
            @Parameter(description = "ID de la demande") @PathVariable Long demandeId,
            @Parameter(description = "Type de document") @RequestParam String documentType,
            @Parameter(description = "ID du produit (optionnel)") @RequestParam(required = false) Long productId,
            @Parameter(description = "Fichier à uploader") @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        DocumentDTO document = demandeService.uploadDocument(demandeId, exportateur.getId(),
                file, documentType, productId);
        return ResponseEntity.ok(document);
    }

    /**
     * Récupérer un document par son ID
     */
    @GetMapping("/documents/{documentId}")
    @Operation(summary = "Récupérer un document")
    @PreAuthorize("hasRole('EXPORTATEUR') or hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<DocumentDTO> getDocumentById(
            @Parameter(description = "ID du document") @PathVariable Long documentId,
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        DocumentDTO document = demandeService.getDocumentById(documentId, exportateur.getId());
        return ResponseEntity.ok(document);
    }

    /**
     * Télécharger un document
     */
    @GetMapping("/documents/{documentId}/telecharger")
    @Operation(summary = "Télécharger un document")
    @PreAuthorize("hasRole('EXPORTATEUR') or hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<Resource> downloadDocument(
            @Parameter(description = "ID du document") @PathVariable Long documentId,
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        Resource resource = demandeService.getDocumentFile(documentId, exportateur.getId());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    /**
     * Soumettre une demande pour validation
     */
    @PostMapping("/{id}/soumettre")
    @Operation(summary = "Soumettre une demande")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<DemandeEnregistrementDTO> submitDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        DemandeEnregistrementDTO demande = demandeService.submitDemande(id, exportateur.getId());
        return ResponseEntity.ok(demande);
    }

    /**
     * Valider une demande (Agent)
     */
    @PostMapping("/{id}/valider")
    @Operation(summary = "Valider une demande")
    @PreAuthorize("hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<DemandeEnregistrementDTO> validateDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @Parameter(description = "Commentaire de validation") @RequestParam String comment,
            @RequestHeader("Authorization") String authHeader) {

        // Pour les agents, il faudrait un mécanisme différent pour obtenir l'ID
        // Pour l'instant, on utilise une valeur par défaut
        Long agentId = 2L; // À remplacer par la vraie logique
        DemandeEnregistrementDTO demande = demandeService.validateDemande(id, comment, agentId);
        return ResponseEntity.ok(demande);
    }

    /**
     * Rejeter une demande (Agent)
     */
    @PostMapping("/{id}/rejeter")
    @Operation(summary = "Rejeter une demande")
    @PreAuthorize("hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<DemandeEnregistrementDTO> rejectDemande(
            @Parameter(description = "ID de la demande") @PathVariable Long id,
            @Parameter(description = "Raison du rejet") @RequestParam String reason,
            @RequestHeader("Authorization") String authHeader) {

        // Pour les agents, il faudrait un mécanisme différent pour obtenir l'ID
        Long agentId = 2L; // À remplacer par la vraie logique
        DemandeEnregistrementDTO demande = demandeService.rejectDemande(id, reason, agentId);
        return ResponseEntity.ok(demande);
    }

    /**
     * Récupérer une demande par son ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une demande")
    @PreAuthorize("hasRole('EXPORTATEUR') or hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<DemandeEnregistrementDTO> getDemandeById(
            @Parameter(description = "ID de la demande") @PathVariable Long id) {

        DemandeEnregistrementDTO demande = demandeService.getDemandeById(id);
        return ResponseEntity.ok(demande);
    }

    /**
     * Récupérer les demandes de l'exportateur connecté
     */
    @GetMapping("/mes-demandes")
    @Operation(summary = "Mes demandes")
    @PreAuthorize("hasRole('EXPORTATEUR')")
    public ResponseEntity<List<DemandeEnregistrementDTO>> getMyDemandes(
            @RequestHeader("Authorization") String authHeader) {

        ExportateurEtranger exportateur = getExportateurFromToken(authHeader);
        List<DemandeEnregistrementDTO> demandes = demandeService.getDemandesByExportateur(exportateur.getId());
        return ResponseEntity.ok(demandes);
    }

    /**
     * Récupérer les demandes par statut (Agent/Admin)
     */
    @GetMapping("/statut/{status}")
    @Operation(summary = "Demandes par statut")
    @PreAuthorize("hasRole('AGENT') or hasRole('ADMIN')")
    public ResponseEntity<List<DemandeEnregistrementDTO>> getDemandesByStatus(
            @Parameter(description = "Statut de la demande") @PathVariable DemandeStatus status) {

        List<DemandeEnregistrementDTO> demandes = demandeService.getDemandesByStatus(status);
        return ResponseEntity.ok(demandes);
    }

    /**
     * Méthode utilitaire pour extraire l'exportateur du token JWT
     */
    private ExportateurEtranger getExportateurFromToken(String authHeader) {
        try {
            // 1. Extraire le token
            String token = extractToken(authHeader);

            // 2. Valider le token
            if (!jwtUtil.validateToken(token)) {
                throw new RuntimeException("Token invalide ou expiré");
            }

            // 3. Extraire l'email
            String email = jwtUtil.extractUsername(token);
            if (email == null || email.isEmpty()) {
                throw new RuntimeException("Email non trouvé dans le token");
            }

            // 4. Chercher l'exportateur
            return exportateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Aucun exportateur trouvé avec l'email: " + email));

        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token expiré. Veuillez vous reconnecter.");
        } catch (MalformedJwtException | SignatureException e) {
            throw new RuntimeException("Token invalide. Veuillez vous reconnecter.");
        } catch (Exception e) {
            throw new RuntimeException("Erreur d'authentification: " + e.getMessage());
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || authHeader.isEmpty()) {
            throw new RuntimeException("En-tête d'authentification manquant");
        }

        if (!authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Format d'authentification invalide. Utilisez 'Bearer [token]'");
        }

        String token = authHeader.substring(7);
        if (token.isEmpty()) {
            throw new RuntimeException("Token vide");
        }

        return token;
    }
}