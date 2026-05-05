package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.admin.RiskAnalysisResult;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.service.impl.RiskAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
public class RiskController {

    private final RiskAnalysisService riskAnalysisService;
    private final ExportateurRepository exportateurRepository;

    /**
     * Analyse un exportateur spécifique
     */
    @PostMapping("/analyze")
    public ResponseEntity<RiskAnalysisResult> analyzeExporter(@RequestBody AnalyzeRequest request) {
        RiskAnalysisResult result = riskAnalysisService.analyzeExporter(
                request.getIpAddress(),
                request.getDeclaredCountry(),
                request.getEmail(),
                request.getPhoneNumber()
        );
        return ResponseEntity.ok(result);
    }

    /**
     * Récupère la liste de tous les exportateurs avec leur analyse de risque
     * Données REELLES depuis la base de données
     */
    @GetMapping("/exportateurs")
    public ResponseEntity<List<ExporterRiskDto>> getAllExportersWithRisk() {
        List<ExporterRiskDto> exporters = new ArrayList<>();

        // Récupérer les vrais exportateurs depuis la base
        List<ExportateurEtranger> realExporters = exportateurRepository.findAll();

        for (ExportateurEtranger exp : realExporters) {
            ExporterRiskDto dto = new ExporterRiskDto();
            dto.setId(String.valueOf(exp.getId()));
            dto.setName(exp.getRaisonSociale());
            dto.setEmail(exp.getEmail());
            dto.setDeclaredCountry(exp.getPaysOrigine());
            dto.setSignupIp(exp.getIpAddressSignup());
            dto.setPhoneNumber(exp.getTelephone());
            dto.setStatus(getStatusFromStatutAgrement(exp.getStatutAgrement()));

            // Analyser le risque pour cet exportateur
            RiskAnalysisResult analysis = riskAnalysisService.analyzeExporter(
                    dto.getSignupIp(),
                    dto.getDeclaredCountry(),
                    dto.getEmail(),
                    dto.getPhoneNumber()
            );

            dto.setRiskScore(analysis.getRiskScore());
            dto.setRiskLevel(analysis.getRiskLevel());
            dto.setDetectedIpCountry(analysis.getDetectedIpCountry());
            dto.setRiskFactors(analysis.getRiskFactors());
            dto.setUsingVpn(analysis.isUsingVpn());
            dto.setUsingProxy(analysis.isUsingProxy());

            exporters.add(dto);
        }

        // Trier par score de risque (plus élevé d'abord)
        exporters.sort((a, b) -> Integer.compare(b.getRiskScore(), a.getRiskScore()));

        return ResponseEntity.ok(exporters);
    }

    /**
     * Récupère uniquement les exportateurs suspects (risque ÉLEVÉ)
     */
    @GetMapping("/suspects")
    public ResponseEntity<List<ExporterRiskDto>> getSuspectExporters() {
        List<ExporterRiskDto> allExporters = getAllExportersWithRisk().getBody();
        if (allExporters == null) {
            return ResponseEntity.ok(new ArrayList<>());
        }

        List<ExporterRiskDto> suspects = allExporters.stream()
                .filter(e -> "ÉLEVÉ".equals(e.getRiskLevel()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(suspects);
    }

    /**
     * Récupère les détails d'un exportateur spécifique
     */
    @GetMapping("/exportateur/{id}")
    public ResponseEntity<ExporterRiskDto> getExporterById(@PathVariable Long id) {
        Optional<ExportateurEtranger> expOpt = exportateurRepository.findById(id);

        if (expOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ExportateurEtranger exp = expOpt.get();
        ExporterRiskDto dto = new ExporterRiskDto();
        dto.setId(String.valueOf(exp.getId()));
        dto.setName(exp.getRaisonSociale());
        dto.setEmail(exp.getEmail());
        dto.setDeclaredCountry(exp.getPaysOrigine());
        dto.setSignupIp(exp.getIpAddressSignup());
        dto.setPhoneNumber(exp.getTelephone());
        dto.setStatus(getStatusFromStatutAgrement(exp.getStatutAgrement()));

        RiskAnalysisResult analysis = riskAnalysisService.analyzeExporter(
                dto.getSignupIp(),
                dto.getDeclaredCountry(),
                dto.getEmail(),
                dto.getPhoneNumber()
        );

        dto.setRiskScore(analysis.getRiskScore());
        dto.setRiskLevel(analysis.getRiskLevel());
        dto.setDetectedIpCountry(analysis.getDetectedIpCountry());
        dto.setRiskFactors(analysis.getRiskFactors());
        dto.setUsingVpn(analysis.isUsingVpn());
        dto.setUsingProxy(analysis.isUsingProxy());

        return ResponseEntity.ok(dto);
    }

    /**
     * Valide une action admin (approuver/rejeter/demander vérification)
     */
    @PostMapping("/{id}/action")
    public ResponseEntity<Map<String, String>> takeAction(
            @PathVariable Long id,
            @RequestBody ActionRequest request) {

        Optional<ExportateurEtranger> expOpt = exportateurRepository.findById(id);

        if (expOpt.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", "Exportateur non trouvé");
            return ResponseEntity.notFound().build();
        }

        ExportateurEtranger exportateur = expOpt.get();

        Map<String, String> response = new HashMap<>();

        switch (request.getAction().toUpperCase()) {
            case "APPROVED":
                exportateur.setStatutAgrement(com.tunisia.commerce.enums.StatutAgrement.VALIDE);
                response.put("message", "Exportateur approuvé avec succès");
                break;
            case "REJECTED":
                exportateur.setStatutAgrement(com.tunisia.commerce.enums.StatutAgrement.REJETE);
                response.put("message", "Exportateur rejeté");
                break;
            case "VERIFICATION_REQUESTED":
                exportateur.setStatutAgrement(com.tunisia.commerce.enums.StatutAgrement.EN_ATTENTE);
                response.put("message", "Vérification supplémentaire demandée");
                break;
            default:
                response.put("status", "error");
                response.put("message", "Action non reconnue");
                return ResponseEntity.badRequest().body(response);
        }

        // Sauvegarder les modifications
        exportateurRepository.save(exportateur);

        response.put("status", "success");
        response.put("action", request.getAction());

        return ResponseEntity.ok(response);
    }

    /**
     * Met à jour l'IP d'un exportateur (à appeler lors de l'inscription)
     */
    @PostMapping("/{id}/ip")
    public ResponseEntity<Void> updateExportateurIp(
            @PathVariable Long id,
            @RequestBody IpUpdateRequest request) {

        Optional<ExportateurEtranger> expOpt = exportateurRepository.findById(id);

        if (expOpt.isPresent()) {
            ExportateurEtranger exportateur = expOpt.get();
            exportateur.setIpAddressSignup(request.getIpAddress());
            exportateurRepository.save(exportateur);
            return ResponseEntity.ok().build();
        }

        return ResponseEntity.notFound().build();
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private String getStatusFromStatutAgrement(com.tunisia.commerce.enums.StatutAgrement statut) {
        if (statut == null) return "PENDING";
        switch (statut) {
            case VALIDE: return "APPROVED";
            case REJETE: return "REJECTED";
            case EN_ATTENTE: return "PENDING";
            default: return "PENDING";
        }
    }

    // ==================== DTOs INTERNES ====================

    public static class AnalyzeRequest {
        private String ipAddress;
        private String declaredCountry;
        private String email;
        private String phoneNumber;

        public String getIpAddress() { return ipAddress; }
        public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
        public String getDeclaredCountry() { return declaredCountry; }
        public void setDeclaredCountry(String declaredCountry) { this.declaredCountry = declaredCountry; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    }

    public static class ActionRequest {
        private String action;
        private String comment;

        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
    }

    public static class IpUpdateRequest {
        private String ipAddress;

        public String getIpAddress() { return ipAddress; }
        public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    }

    public static class ExporterRiskDto {
        private String id;
        private String name;
        private String email;
        private String declaredCountry;
        private String signupIp;
        private String detectedIpCountry;
        private int riskScore;
        private String riskLevel;
        private List<String> riskFactors;
        private String status;
        private boolean usingVpn;
        private boolean usingProxy;
        private String phoneNumber;

        // Getters et setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getDeclaredCountry() { return declaredCountry; }
        public void setDeclaredCountry(String declaredCountry) { this.declaredCountry = declaredCountry; }
        public String getSignupIp() { return signupIp; }
        public void setSignupIp(String signupIp) { this.signupIp = signupIp; }
        public String getDetectedIpCountry() { return detectedIpCountry; }
        public void setDetectedIpCountry(String detectedIpCountry) { this.detectedIpCountry = detectedIpCountry; }
        public int getRiskScore() { return riskScore; }
        public void setRiskScore(int riskScore) { this.riskScore = riskScore; }
        public String getRiskLevel() { return riskLevel; }
        public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
        public List<String> getRiskFactors() { return riskFactors; }
        public void setRiskFactors(List<String> riskFactors) { this.riskFactors = riskFactors; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public boolean isUsingVpn() { return usingVpn; }
        public void setUsingVpn(boolean usingVpn) { this.usingVpn = usingVpn; }
        public boolean isUsingProxy() { return usingProxy; }
        public void setUsingProxy(boolean usingProxy) { this.usingProxy = usingProxy; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    }
}