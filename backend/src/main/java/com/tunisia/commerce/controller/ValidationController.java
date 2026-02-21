package com.tunisia.commerce.controller;

import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.dto.validation.*;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.DocumentStatus;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.ValidationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/validation")
@RequiredArgsConstructor
public class ValidationController {

    private final ValidationService validationService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    /**
     * Récupérer la liste des demandes à traiter
     */
    @GetMapping("/demandes")
    public ResponseEntity<ValidationResponseDTO> getDemandes(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) DemandeStatus status) {

        try {
            // Vérifier l'utilisateur
            User agent = getAgentFromToken(authHeader);

            // Récupérer les demandes
            List<DemandeEnregistrement> demandes = validationService
                    .getDemandesAAfficher(agent.getId(), status);

            // Convertir en DTOs
            List<DemandeEnregistrementDTO> demandeDTOs = demandes.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ValidationResponseDTO.builder()
                    .success(true)
                    .message(demandes.size() + " demande(s) trouvée(s)")
                    .timestamp(LocalDateTime.now())
                    .data(demandeDTOs)
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ValidationResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Récupérer les détails d'une demande spécifique
     */
    @GetMapping("/demandes/{demandeId}")
    public ResponseEntity<ValidationResponseDTO> getDemandeDetails(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long demandeId) {

        try {
            // Vérifier l'utilisateur
            User agent = getAgentFromToken(authHeader);

            // Récupérer la demande (à implémenter dans le service si besoin)
            DemandeEnregistrement demande = validationService.getDemandeById(demandeId);

            return ResponseEntity.ok(ValidationResponseDTO.builder()
                    .success(true)
                    .message("Détails de la demande")
                    .timestamp(LocalDateTime.now())
                    .data(convertToDTO(demande))
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ValidationResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Récupérer les documents d'une demande
     */
    @GetMapping("/demandes/{demandeId}/documents")
    public ResponseEntity<ValidationResponseDTO> getDemandeDocuments(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long demandeId) {

        try {
            User agent = getAgentFromToken(authHeader);

            // Récupérer les documents de la demande
            List<Document> documents = documentRepository.findByDemandeId(demandeId);

            List<DocumentDTO> documentDTOs = documents.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ValidationResponseDTO.builder()
                    .success(true)
                    .message(documents.size() + " document(s) trouvé(s)")
                    .timestamp(LocalDateTime.now())
                    .data(documentDTOs)
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ValidationResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Assigner une demande à l'agent connecté
     */
    @PostMapping("/demandes/{demandeId}/assigner")
    public ResponseEntity<ValidationResponseDTO> assignerDemande(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long demandeId) {

        try {
            User agent = getAgentFromToken(authHeader);

            DemandeEnregistrement demande = validationService
                    .assignerDemande(demandeId, agent.getId());

            return ResponseEntity.ok(ValidationResponseDTO.builder()
                    .success(true)
                    .message("Demande assignée avec succès")
                    .timestamp(LocalDateTime.now())
                    .data(convertToDTO(demande))
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ValidationResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Valider ou rejeter un document
     */
    @PostMapping("/documents/{documentId}/valider")
    public ResponseEntity<ValidationResponseDTO> validerDocument(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long documentId,
            @RequestBody ValidationRequest request) {

        try {
            User agent = getAgentFromToken(authHeader);

            validationService.validerDocument(
                    documentId,
                    agent.getId(),
                    request.getComment(),
                    request.isValide()
            );

            String message = request.isValide() ?
                    "Document validé avec succès" :
                    "Document rejeté";

            return ResponseEntity.ok(ValidationResponseDTO.builder()
                    .success(true)
                    .message(message)
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ValidationResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Prendre une décision finale sur une demande
     */
    @PostMapping("/demandes/{demandeId}/decision")
    public ResponseEntity<ValidationResponseDTO> prendreDecision(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long demandeId,
            @RequestBody DecisionRequest request) {

        try {
            User agent = getAgentFromToken(authHeader);

            DemandeEnregistrement demande = validationService
                    .prendreDecisionFinale(
                            demandeId,
                            agent.getId(),
                            request.isApprouve(),
                            request.getComment()
                    );

            String message = request.isApprouve() ?
                    "Demande approuvée avec succès" :
                    "Demande rejetée";

            return ResponseEntity.ok(ValidationResponseDTO.builder()
                    .success(true)
                    .message(message)
                    .timestamp(LocalDateTime.now())
                    .data(convertToDTO(demande))
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ValidationResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Demander des informations complémentaires
     */
    @PostMapping("/demandes/{demandeId}/info-complementaire")
    public ResponseEntity<ValidationResponseDTO> demanderInfoComplementaire(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long demandeId,
            @RequestBody InfoComplementaireRequest request) {

        try {
            User agent = getAgentFromToken(authHeader);

            validationService.demanderInformationsComplementaires(
                    demandeId,
                    agent.getId(),
                    request.getMessage(),
                    request.getDocumentsIds()
            );

            return ResponseEntity.ok(ValidationResponseDTO.builder()
                    .success(true)
                    .message("Demande d'informations complémentaires envoyée")
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ValidationResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Récupérer les statistiques de l'agent
     */
    @GetMapping("/statistiques")
    public ResponseEntity<ValidationResponseDTO> getStatistiques(
            @RequestHeader("Authorization") String authHeader) {

        try {
            User agent = getAgentFromToken(authHeader);

            // Compter les demandes par statut pour cet agent
            List<DemandeEnregistrement> demandesAgent =
                    validationService.getDemandesAAfficher(agent.getId(), DemandeStatus.EN_COURS_VALIDATION);

            List<DemandeEnregistrement> demandesNonAssignees =
                    validationService.getDemandesAAfficher(null, DemandeStatus.SOUMISE);

            Map<String, Object> stats = Map.of(
                    "enCours", demandesAgent.size(),
                    "enAttente", demandesNonAssignees.size(),
                    "agentId", agent.getId(),
                    "agentEmail", agent.getEmail()
            );

            return ResponseEntity.ok(ValidationResponseDTO.builder()
                    .success(true)
                    .message("Statistiques récupérées")
                    .timestamp(LocalDateTime.now())
                    .data(stats)
                    .build());

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ValidationResponseDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .timestamp(LocalDateTime.now())
                            .build());
        }
    }

    // ==================== MÉTHODES PRIVÉES ====================

    /**
     * Extraire l'agent depuis le token
     */
    private User getAgentFromToken(String authHeader) {
        String token = extractToken(authHeader);
        String email = jwtUtil.extractUsername(token);

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
    }

    /**
     * Extraire le token JWT du header
     */
    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token d'authentification manquant ou invalide");
        }
        return authHeader.substring(7);
    }

    /**
     * Convertir une entité DemandeEnregistrement en DTO
     */
    private DemandeEnregistrementDTO convertToDTO(DemandeEnregistrement demande) {
        if (demande == null) return null;

        // Compter les documents si nécessaire
        int documentsCount = 0;
        int documentsValides = 0;
        int documentsRejetes = 0;

        if (demande.getExportateur() != null && demande.getExportateur().getDocuments() != null) {
            documentsCount = demande.getExportateur().getDocuments().size();
            documentsValides = (int) demande.getExportateur().getDocuments().stream()
                    .filter(d -> d.getStatus() == DocumentStatus.VALIDE)
                    .count();
            documentsRejetes = (int) demande.getExportateur().getDocuments().stream()
                    .filter(d -> d.getStatus() == DocumentStatus.REJETE)
                    .count();
        }

        return DemandeEnregistrementDTO.builder()
                .id(demande.getId())
                .reference(demande.getReference())
                .status(demande.getStatus())
                .submittedAt(demande.getSubmittedAt())
                .decisionDate(demande.getDecisionDate())
                .dateAgrement(demande.getDateAgrement())
                .paymentReference(demande.getPaymentReference())
                .paymentAmount(demande.getPaymentAmount())
                .paymentStatus(demande.getPaymentStatus())
                .assignedTo(demande.getAssignedTo())
                .decisionComment(demande.getDecisionComment())
                .numeroAgrement(demande.getNumeroAgrement())
                .exportateur(convertToExportateurSimpleDTO(demande.getExportateur()))
                .documentsCount(documentsCount)
                .documentsValidesCount(documentsValides)
                .documentsRejetesCount(documentsRejetes)
                .build();
    }

    /**
     * Convertir un ExportateurEtranger en DTO simplifié
     */
    private ExportateurSimpleDTO convertToExportateurSimpleDTO(ExportateurEtranger exportateur) {
        if (exportateur == null) return null;

        return ExportateurSimpleDTO.builder()
                .id(exportateur.getId())
                .email(exportateur.getEmail())
                .raisonSociale(exportateur.getRaisonSociale())
                .paysOrigine(exportateur.getPaysOrigine())
                .telephone(exportateur.getTelephone())
                .statutAgrement(exportateur.getStatutAgrement() != null ?
                        exportateur.getStatutAgrement().name() : null)
                .build();
    }

    /**
     * Convertir un Document en DTO
     */
    private DocumentDTO convertToDTO(Document document) {
        if (document == null) return null;

        return DocumentDTO.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .fileType(document.getFileType())
                .fileSize(document.getFileSize())
                .documentType(document.getDocumentType())
                .status(document.getStatus())
                .validationComment(document.getValidationComment())
                .uploadedAt(document.getUploadedAt())
                .validatedAt(document.getValidatedAt())
                .validatedBy(document.getValidatedBy() != null ?
                        document.getValidatedBy().getEmail() : null)
                .downloadUrl("/api/files/" + document.getId()) // À adapter selon ton API
                .build();
    }
}