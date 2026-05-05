package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.admin.RiskAnalysisResult;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.repository.ExportateurRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RiskAnalysisService {

    private final IpApiService ipApiService;
    private final AuditRiskService auditRiskService;
    private final ExportateurRepository exportateurRepository;

    // Patterns de détection
    private static final Pattern IPV6_PATTERN = Pattern.compile("^[0-9a-f:]+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern LOCAL_IP_PATTERN = Pattern.compile("^(127\\.0\\.0\\.1|10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|172\\.(1[6-9]|2[0-9]|3[0-1])\\.\\d{1,3}\\.\\d{1,3}|192\\.168\\.\\d{1,3}\\.\\d{1,3})$");

    // Liste des pays à haut risque (blanchiment, sanctions, etc.)
    private static final Set<String> HIGH_RISK_COUNTRIES = Set.of(
            "RU", "BY", "KP", "IR", "SY", "CU", "VE", "MM", "AF", "PK"
    );

    // Liste des pays avec zone franche offshore
    private static final Set<String> OFFSHORE_COUNTRIES = Set.of(
            "KY", "VG", "BS", "BM", "GI", "JE", "GG", "IM", "AE", "SC", "MH", "PA"
    );

    /**
     * Analyse complète et fiable d'un exportateur
     * Score sur 100 - plus le score est élevé, plus l'exportateur est suspect
     */
    public RiskAnalysisResult analyzeExporter(String ipAddress, String declaredCountry,
                                              String email, String phoneNumber) {

        List<RiskFactorDetail> riskFactors = new ArrayList<>();
        int totalScore = 0;

        // 1. Récupérer l'exportateur complet depuis la base (si existant)
        ExportateurEtranger exportateur = null;
        if (email != null) {
            exportateur = exportateurRepository.findByEmail(email).orElse(null);
        }

        // ==================== CRITÈRE 1: ANALYSE IP (POIDS: 0-45 points) ====================
        IpApiService.EnhancedIpAnalysis ipAnalysis = null;
        if (ipAddress != null && !ipAddress.isEmpty() && !"0:0:0:0:0:0:0:1".equals(ipAddress)) {
            ipAnalysis = ipApiService.getEnhancedIpAnalysis(ipAddress);

            if (ipAnalysis != null && ipAnalysis.getCountry() != null) {

                // 1.1 Détection Proxy/VPN (0-20 points)
                if (ipAnalysis.isProxyDetected() || ipAnalysis.isVpn()) {
                    riskFactors.add(new RiskFactorDetail(
                            "PROXY_VPN_DETECTED",
                            "Utilisation de Proxy/VPN détectée",
                            "L'utilisateur masque sa véritable localisation via un Proxy ou VPN",
                            20,
                            true
                    ));
                    totalScore += 20;
                } else if (ipAnalysis.isTor()) {
                    riskFactors.add(new RiskFactorDetail(
                            "TOR_NETWORK",
                            "Connexion via le réseau Tor",
                            "L'utilisateur utilise le réseau Tor (anonymisation renforcée)",
                            25,
                            true
                    ));
                    totalScore += 25;
                } else if (ipAnalysis.isRelay()) {
                    riskFactors.add(new RiskFactorDetail(
                            "RELAY_HOSTING",
                            "Hébergement relais détecté",
                            "IP provenant d'un service de relais/hébergement",
                            10,
                            false
                    ));
                    totalScore += 10;
                }

                // 1.2 Détection IP d'hébergement (0-10 points)
                if (ipAnalysis.isHosting()) {
                    riskFactors.add(new RiskFactorDetail(
                            "HOSTING_PROVIDER",
                            "Adresse IP d'hébergeur",
                            "L'IP provient d'un hébergeur (Data Center), pas d'un FAI classique",
                            10,
                            false
                    ));
                    totalScore += 10;
                }

                // 1.3 Incohérence pays déclaré vs IP détectée (0-30 points)
                if (declaredCountry != null && !declaredCountry.isEmpty()) {
                    boolean countryMatch = declaredCountry.equalsIgnoreCase(ipAnalysis.getCountry()) ||
                            declaredCountry.equalsIgnoreCase(ipAnalysis.getCountryCode());

                    if (!countryMatch) {
                        riskFactors.add(new RiskFactorDetail(
                                "COUNTRY_MISMATCH",
                                "Incohérence pays déclaré vs IP",
                                String.format("Pays déclaré: %s, Pays IP détecté: %s (Code: %s)",
                                        declaredCountry, ipAnalysis.getCountry(), ipAnalysis.getCountryCode()),
                                30,
                                true
                        ));
                        totalScore += 30;
                    }
                }

                // 1.4 Pays à haut risque (0-15 points)
                if (ipAnalysis.getCountryCode() != null) {
                    if (HIGH_RISK_COUNTRIES.contains(ipAnalysis.getCountryCode().toUpperCase())) {
                        riskFactors.add(new RiskFactorDetail(
                                "HIGH_RISK_COUNTRY",
                                "Pays à haut risque détecté",
                                String.format("L'IP provient d'un pays sous sanctions: %s", ipAnalysis.getCountry()),
                                15,
                                true
                        ));
                        totalScore += 15;
                    } else if (OFFSHORE_COUNTRIES.contains(ipAnalysis.getCountryCode().toUpperCase())) {
                        riskFactors.add(new RiskFactorDetail(
                                "OFFSHORE_COUNTRY",
                                "Pays offshore / paradis fiscal",
                                String.format("IP provenant d'une zone offshore: %s", ipAnalysis.getCountry()),
                                10,
                                false
                        ));
                        totalScore += 10;
                    }
                }

                // 1.5 IP locale/test (détection fraude)
                if (LOCAL_IP_PATTERN.matcher(ipAddress).matches()) {
                    riskFactors.add(new RiskFactorDetail(
                            "LOCAL_IP",
                            "Adresse IP locale / de test",
                            "Utilisation d'une IP locale (127.0.0.1, 192.168.x.x) - potentiel test frauduleux",
                            5,
                            false
                    ));
                    totalScore += 5;
                }

                // 1.6 IP mobile (bon point - plus fiable)
                if (ipAnalysis.isMobile()) {
                    riskFactors.add(new RiskFactorDetail(
                            "MOBILE_IP",
                            "IP de réseau mobile",
                            "Connexion via réseau mobile (plus fiable que proxy/hébergement)",
                            -5,
                            false
                    ));
                    totalScore = Math.max(0, totalScore - 5);
                }
            }
        }

        // ==================== CRITÈRE 2: ANALYSE EMAIL (POIDS: 0-35 points) ====================
        if (email != null && !email.isEmpty()) {
            IpApiService.EmailValidationResponse emailAnalysis = ipApiService.validateEmail(email);

            if (emailAnalysis != null) {
                if (emailAnalysis.isDisposable()) {
                    riskFactors.add(new RiskFactorDetail(
                            "DISPOSABLE_EMAIL",
                            "Email temporaire/jetable",
                            "Utilisation d'un email temporaire (10minutemail, mailinator, etc.)",
                            35,
                            true
                    ));
                    totalScore += 35;
                } else if (!emailAnalysis.isValidSyntax()) {
                    riskFactors.add(new RiskFactorDetail(
                            "INVALID_EMAIL_FORMAT",
                            "Format d'email invalide",
                            "L'adresse email ne respecte pas le format standard",
                            20,
                            true
                    ));
                    totalScore += 20;
                } else if (emailAnalysis.isFreeProvider()) {
                    riskFactors.add(new RiskFactorDetail(
                            "FREE_EMAIL_PROVIDER",
                            "Email gratuit détecté",
                            "Utilisation d'un fournisseur d'email gratuit (Gmail, Yahoo, etc.) - moins professionnel",
                            10,
                            false
                    ));
                    totalScore += 10;
                } else {
                    // Email professionnel (point positif)
                    riskFactors.add(new RiskFactorDetail(
                            "PROFESSIONAL_EMAIL",
                            "Email professionnel",
                            "Email de domaine d'entreprise (plus fiable)",
                            -10,
                            false
                    ));
                    totalScore = Math.max(0, totalScore - 10);
                }
            }
        }

        // ==================== CRITÈRE 3: ANALYSE TÉLÉPHONE (POIDS: 0-25 points) ====================
        if (phoneNumber != null && !phoneNumber.isEmpty()) {
            IpApiService.PhoneValidationResponse phoneAnalysis = ipApiService.validatePhone(phoneNumber, declaredCountry);

            if (phoneAnalysis != null) {
                if (!phoneAnalysis.isValid()) {
                    riskFactors.add(new RiskFactorDetail(
                            "INVALID_PHONE_NUMBER",
                            "Numéro de téléphone invalide",
                            "Le numéro de téléphone fourni est invalide ou inexistant",
                            25,
                            true
                    ));
                    totalScore += 25;
                } else if ("voip".equalsIgnoreCase(phoneAnalysis.getLineType())) {
                    riskFactors.add(new RiskFactorDetail(
                            "VOIP_PHONE",
                            "Téléphone VoIP détecté",
                            "Utilisation d'un numéro VoIP (moins traçable)",
                            15,
                            false
                    ));
                    totalScore += 15;
                } else if ("mobile".equalsIgnoreCase(phoneAnalysis.getLineType())) {
                    riskFactors.add(new RiskFactorDetail(
                            "MOBILE_PHONE",
                            "Téléphone mobile vérifié",
                            "Numéro de mobile valide",
                            -5,
                            false
                    ));
                    totalScore = Math.max(0, totalScore - 5);
                }
            } else if (phoneNumber.length() < 10 || phoneNumber.length() > 15) {
                riskFactors.add(new RiskFactorDetail(
                        "PHONE_LENGTH_INVALID",
                        "Longueur téléphone anormale",
                        "Le numéro de téléphone a une longueur suspecte",
                        15,
                        false
                ));
                totalScore += 15;
            }
        }

        // ==================== CRITÈRE 4: ANALYSE AUDIT LOGS (POIDS: 0-40 points) ====================
        if (exportateur != null && exportateur.getId() != null) {
            AuditRiskService.AuditRiskAnalysis auditAnalysis = auditRiskService.analyzeAuditPatterns(
                    exportateur.getId(),
                    exportateur.getEmail()
            );

            if (auditAnalysis != null && auditAnalysis.getScore() > 0) {
                riskFactors.add(new RiskFactorDetail(
                        "AUDIT_SUSPICIOUS_PATTERNS",
                        "Patterns suspects dans l'audit",
                        String.join("; ", auditAnalysis.getRiskFactors()),
                        auditAnalysis.getScore(),
                        auditAnalysis.getScore() > 30
                ));
                totalScore += auditAnalysis.getScore();
            }
        }

        // ==================== CRITÈRE 5: AUTO-ÉVALUATION ET COMPORTEMENT ====================
        // 5.1 Tous les champs masqués/anonymisés
        boolean suspiciousAnonymization = false;
        if (ipAddress != null && ipAddress.contains("xxx")) {
            riskFactors.add(new RiskFactorDetail(
                    "MASKED_IP_ADDRESS",
                    "Adresse IP masquée",
                    "L'adresse IP a été anonymisée/donnée fictive (contient 'xxx')",
                    15,
                    true
            ));
            totalScore += 15;
            suspiciousAnonymization = true;
        }

        // 5.2 Données incomplètes
        int missingFields = 0;
        if (ipAddress == null || ipAddress.isEmpty()) missingFields++;
        if (declaredCountry == null || declaredCountry.isEmpty()) missingFields++;
        if (email == null || email.isEmpty()) missingFields++;
        if (phoneNumber == null || phoneNumber.isEmpty()) missingFields++;

        if (missingFields >= 3) {
            riskFactors.add(new RiskFactorDetail(
                    "INCOMPLETE_DATA",
                    "Données d'inscription incomplètes",
                    "Plusieurs champs obligatoires sont manquants ou vides",
                    20,
                    true
            ));
            totalScore += 20;
        } else if (missingFields >= 2) {
            riskFactors.add(new RiskFactorDetail(
                    "PARTIAL_DATA",
                    "Données partielles",
                    "Certains champs obligatoires sont manquants",
                    10,
                    false
            ));
            totalScore += 10;
        }

        // ==================== CALCUL FINAL ET NORMALISATION ====================
        // Limiter le score entre 0 et 100
        totalScore = Math.max(0, Math.min(100, totalScore));

        // Détermination du niveau de risque
        String riskLevel;
        if (totalScore >= 75) {
            riskLevel = "CRITIQUE";
        } else if (totalScore >= 60) {
            riskLevel = "ÉLEVÉ";
        } else if (totalScore >= 35) {
            riskLevel = "MOYEN";
        } else if (totalScore >= 15) {
            riskLevel = "FAIBLE";
        } else {
            riskLevel = "MINIME";
        }

        // Construction des facteurs de risque pour l'affichage
        List<String> riskFactorMessages = new ArrayList<>();
        for (RiskFactorDetail factor : riskFactors) {
            if (factor.getScore() > 0 || factor.getScore() < 0) {
                String prefix = factor.getScore() > 0 ? "⚠️ " : "✅ ";
                riskFactorMessages.add(prefix + factor.getTitle() + " (" + factor.getScore() + " pts)");
            } else {
                riskFactorMessages.add(factor.getTitle());
            }
        }

        if (riskFactorMessages.isEmpty()) {
            riskFactorMessages.add("✅ Aucun facteur de risque détecté - Profil fiable");
        }

        // ==================== DÉTECTER IP PAYS POUR AFFICHAGE ====================
        String detectedIpCountry = "Non disponible";
        String ipCity = "Non disponible";
        boolean usingVpn = false;
        boolean usingProxy = false;
        boolean usingTor = false;

        if (ipAnalysis != null) {
            if (ipAnalysis.getCountry() != null) detectedIpCountry = ipAnalysis.getCountry();
            if (ipAnalysis.getCity() != null) ipCity = ipAnalysis.getCity();
            usingVpn = ipAnalysis.isVpn();
            usingProxy = ipAnalysis.isProxyDetected();
            usingTor = ipAnalysis.isTor();
        }

        // Construction du résultat
        return RiskAnalysisResult.builder()
                .riskScore(totalScore)
                .riskLevel(riskLevel)
                .detectedIpCountry(detectedIpCountry)
                .detectedCountry(detectedIpCountry)
                .ipCity(ipCity)
                .usingVpn(usingVpn)
                .usingProxy(usingProxy)
                .usingTor(usingTor)
                .riskFactors(riskFactorMessages)
                .detailedFactors(riskFactors.stream()
                        .map(f -> String.format("%s: %s (%d pts)", f.getCode(), f.getDescription(), f.getScore()))
                        .collect(Collectors.toList()))
                .build();
    }

    /**
     * Analyse de masse pour lots d'exportateurs (optimisation)
     */
    public Map<Long, RiskAnalysisResult> analyzeBatchExporters(List<ExportateurEtranger> exporters) {
        Map<Long, RiskAnalysisResult> results = new HashMap<>();

        for (ExportateurEtranger exp : exporters) {
            try {
                RiskAnalysisResult result = analyzeExporter(
                        exp.getIpAddressSignup(),
                        exp.getPaysOrigine(),
                        exp.getEmail(),
                        exp.getTelephone()
                );
                results.put(exp.getId(), result);
            } catch (Exception e) {
                log.error("Erreur analyse exportateur {}: {}", exp.getId(), e.getMessage());
                results.put(exp.getId(), RiskAnalysisResult.builder()
                        .riskScore(50)
                        .riskLevel("MOYEN")
                        .riskFactors(List.of("Erreur lors de l'analyse", e.getMessage()))
                        .build());
            }
        }

        return results;
    }

    // ==================== INNER CLASS ====================

    @Data
    @AllArgsConstructor
    public static class RiskFactorDetail {
        private String code;
        private String title;
        private String description;
        private int score;
        private boolean isCritical;
    }
}