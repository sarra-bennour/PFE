package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.exception.ImportateurException;
import com.tunisia.commerce.service.ImportateurService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/importateur")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Importateur", description = "API pour la gestion des fonctionnalités importateur")
@CrossOrigin(origins = "*")
public class ImportateurController {

    private final ImportateurService importateurService;

    @Operation(
            summary = "Recherche multi-critères d'exportateurs validés",
            description = "Recherche des exportateurs validés (agrément VALIDE) par pays, raison sociale, produit ou code NGP"
    )
    @GetMapping("/exportateurs/recherche")
    public ResponseEntity<?> rechercherExportateurs(
            @Parameter(description = "Terme de recherche (pays, raison sociale, produit, code NGP)")
            @RequestParam(required = false) String q) {

        log.info("========== DÉBUT RECHERCHE EXPORTATEURS ==========");
        log.info("Terme de recherche reçu: '{}'", q);
        log.info("Headers de la requête: ");
        log.info("User-Agent: {}", getCurrentHttpRequest().getHeader("User-Agent"));
        log.info("Authorization: {}", getCurrentHttpRequest().getHeader("Authorization") != null ? "Présent" : "Absent");

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherExportateursValides(q);

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            log.info("Résultats trouvés: {} exportateur(s)", resultats.size());
            log.info("Temps d'exécution: {} ms", duration);

            if (!resultats.isEmpty()) {
                log.info("Détail des résultats:");
                for (int i = 0; i < resultats.size(); i++) {
                    UserDTO exp = resultats.get(i);
                    log.info("  Exportateur {}: ID={}, Raison sociale='{}', Pays='{}', Email='{}'",
                            i+1, exp.getId(), exp.getRaisonSociale(), exp.getPaysOrigine(), exp.getEmail());

                    // Log des produits si présents dans le DTO (vous devrez peut-être ajouter cette info)
                    // if (exp.getProduits() != null) {
                    //     log.info("    Nombre de produits: {}", exp.getProduits().size());
                    // }
                }
            } else {
                log.warn("Aucun exportateur trouvé pour le terme: '{}'", q);
            }

            log.info("========== FIN RECHERCHE EXPORTATEURS ==========");

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR ImportateurException: Code={}, Message={}", e.getErrorCode(), e.getMessage());
            log.error("Stack trace:", e);
            return handleImportateurException(e);
        } catch (Exception e) {
            log.error("ERREUR inattendue: {}", e.getMessage());
            log.error("Stack trace:", e);
            return handleGenericException(e);
        }
    }

    @Operation(
            summary = "Recherche d'exportateurs validés par pays",
            description = "Récupère la liste des exportateurs validés filtrée par pays d'origine"
    )
    @GetMapping("/exportateurs/pays/{pays}")
    public ResponseEntity<?> rechercherParPays(
            @Parameter(description = "Pays d'origine", required = true)
            @PathVariable String pays) {

        log.info("========== RECHERCHE PAR PAYS ==========");
        log.info("Pays recherché: '{}'", pays);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherParPays(pays);

            long endTime = System.currentTimeMillis();

            log.info("Résultats trouvés pour le pays '{}': {} exportateur(s)", pays, resultats.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            resultats.forEach(exp ->
                    log.info("  - {} ({}): {}", exp.getRaisonSociale(), exp.getEmail(), exp.getStatutAgrement())
            );

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par pays '{}': {}", pays, e.getMessage());
            return handleImportateurException(e);
        }
    }

    @Operation(
            summary = "Recherche d'exportateurs validés par raison sociale",
            description = "Récupère la liste des exportateurs validés filtrée par raison sociale (nom de l'entreprise)"
    )
    @GetMapping("/exportateurs/raison-sociale/{raisonSociale}")
    public ResponseEntity<?> rechercherParRaisonSociale(
            @Parameter(description = "Raison sociale de l'entreprise", required = true)
            @PathVariable String raisonSociale) {

        log.info("========== RECHERCHE PAR RAISON SOCIALE ==========");
        log.info("Raison sociale recherchée: '{}'", raisonSociale);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherParRaisonSociale(raisonSociale);

            long endTime = System.currentTimeMillis();

            log.info("Résultats trouvés pour '{}': {} exportateur(s)", raisonSociale, resultats.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            resultats.forEach(exp ->
                    log.info("  - {} (Pays: {})", exp.getRaisonSociale(), exp.getPaysOrigine())
            );

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par raison sociale '{}': {}", raisonSociale, e.getMessage());
            return handleImportateurException(e);
        }
    }

    @Operation(
            summary = "Recherche d'exportateurs validés par produit",
            description = "Récupère la liste des exportateurs validés qui proposent un produit spécifique"
    )
    @GetMapping("/exportateurs/produit/{produit}")
    public ResponseEntity<?> rechercherParProduit(
            @Parameter(description = "Nom du produit", required = true)
            @PathVariable String produit) {

        log.info("========== RECHERCHE PAR PRODUIT ==========");
        log.info("Produit recherché: '{}'", produit);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherParProduit(produit);

            long endTime = System.currentTimeMillis();

            log.info("Résultats trouvés pour le produit '{}': {} exportateur(s)", produit, resultats.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par produit '{}': {}", produit, e.getMessage());
            return handleImportateurException(e);
        }
    }

    @Operation(
            summary = "Recherche d'exportateurs validés par code NGP",
            description = "Récupère la liste des exportateurs validés qui proposent des produits avec un code NGP spécifique"
    )
    @GetMapping("/exportateurs/code-ngp/{codeNGP}")
    public ResponseEntity<?> rechercherParCodeNGP(
            @Parameter(description = "Code NGP du produit", required = true)
            @PathVariable String codeNGP) {

        log.info("========== RECHERCHE PAR CODE NGP ==========");
        log.info("Code NGP recherché: '{}'", codeNGP);

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> resultats = importateurService.rechercherParCodeNGP(codeNGP);

            long endTime = System.currentTimeMillis();

            log.info("Résultats trouvés pour le code NGP '{}': {} exportateur(s)", codeNGP, resultats.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(resultats);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par code NGP '{}': {}", codeNGP, e.getMessage());
            return handleImportateurException(e);
        }
    }

    @Operation(
            summary = "Récupérer un exportateur validé par ID",
            description = "Récupère les détails complets d'un exportateur validé par son identifiant"
    )
    @GetMapping("/exportateurs/{id}")
    public ResponseEntity<?> getExportateurParId(
            @Parameter(description = "ID de l'exportateur", required = true)
            @PathVariable Long id) {

        log.info("========== RECHERCHE PAR ID ==========");
        log.info("ID recherché: {}", id);

        try {
            long startTime = System.currentTimeMillis();

            UserDTO exportateur = importateurService.getExportateurValideById(id);

            long endTime = System.currentTimeMillis();

            log.info("Exportateur trouvé: ID={}, Nom='{}', Pays='{}'",
                    exportateur.getId(), exportateur.getRaisonSociale(), exportateur.getPaysOrigine());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            return ResponseEntity.ok(exportateur);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la recherche par ID {}: {}", id, e.getMessage());
            return handleImportateurException(e);
        }
    }

    @Operation(
            summary = "Lister tous les exportateurs validés",
            description = "Récupère la liste de tous les exportateurs avec un agrément VALIDE"
    )
    @GetMapping("/exportateurs")
    public ResponseEntity<?> getAllExportateursValides() {

        log.info("========== LISTE TOUS EXPORTATEURS VALIDÉS ==========");

        try {
            long startTime = System.currentTimeMillis();

            List<UserDTO> exportateurs = importateurService.getAllExportateursValides();

            long endTime = System.currentTimeMillis();

            log.info("Nombre total d'exportateurs validés: {}", exportateurs.size());
            log.info("Temps d'exécution: {} ms", endTime - startTime);

            if (!exportateurs.isEmpty()) {
                log.info("Liste des exportateurs:");
                exportateurs.forEach(exp ->
                        log.info("  - ID: {}, Raison sociale: {}, Pays: {}, Email: {}",
                                exp.getId(), exp.getRaisonSociale(), exp.getPaysOrigine(), exp.getEmail())
                );
            }

            return ResponseEntity.ok(exportateurs);

        } catch (ImportateurException e) {
            log.error("ERREUR lors de la récupération de tous les exportateurs: {}", e.getMessage());
            return handleImportateurException(e);
        }
    }

    @ExceptionHandler(ImportateurException.class)
    public ResponseEntity<?> handleImportateurException(ImportateurException e) {
        log.error("ImportateurException: {} - {}", e.getErrorCode(), e.getMessage());

        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("status", e.getStatus().value());
        errorResponse.put("error", e.getStatus().getReasonPhrase());
        errorResponse.put("message", e.getMessage());
        errorResponse.put("errorCode", e.getErrorCode());
        errorResponse.put("timestamp", System.currentTimeMillis());

        return new ResponseEntity<>(errorResponse, e.getStatus());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericException(Exception e) {
        log.error("Erreur inattendue: {}", e.getMessage(), e);

        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorResponse.put("error", "Erreur Interne du Serveur");
        errorResponse.put("message", "Une erreur inattendue s'est produite");
        errorResponse.put("timestamp", System.currentTimeMillis());

        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Méthode utilitaire pour récupérer la requête HTTP courante
    private HttpServletRequest getCurrentHttpRequest() {
        return ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
    }
}