package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.entity.AuditLog;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.repository.AuditLogRepository;
import com.tunisia.commerce.repository.ExportateurRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditRiskService {

    private final AuditLogRepository auditLogRepository;
    private final ExportateurRepository exportateurRepository;

    /**
     * Analyser les patterns suspects depuis l'audit log
     */
    public AuditRiskAnalysis analyzeAuditPatterns(Long userId, String email) {
        AuditRiskAnalysis analysis = new AuditRiskAnalysis();
        analysis.setUserId(userId);
        analysis.setEmail(email);
        analysis.setRiskFactors(new ArrayList<>());
        analysis.setScore(0);

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        // 1. Récupérer tous les logs de cet utilisateur
        List<AuditLog> userLogs = auditLogRepository.findByUserIdAndPerformedAtAfter(userId, thirtyDaysAgo);

        if (userLogs.isEmpty()) {
            return analysis;
        }

        // 2. Analyser les tentatives de login échouées
        long failedLogins = userLogs.stream()
                .filter(log -> "LOGIN".equals(log.getAction()) && "FAILED".equals(log.getStatus()))
                .count();

        if (failedLogins > 10) {
            analysis.addRiskFactor("TROP DE TENTATIVES DE CONNEXION", 40);
            analysis.setScore(analysis.getScore() + 40);
        } else if (failedLogins > 5) {
            analysis.addRiskFactor("NOMBREUX ÉCHECS DE CONNEXION", 25);
            analysis.setScore(analysis.getScore() + 25);
        } else if (failedLogins > 2) {
            analysis.addRiskFactor("TENTATIVES DE CONNEXION ÉCHOUÉES", 10);
            analysis.setScore(analysis.getScore() + 10);
        }

        // 3. Analyser les changements d'IP fréquents
        Set<String> uniqueIps = userLogs.stream()
                .map(AuditLog::getUserIpAddress)
                .filter(ip -> ip != null && !ip.isEmpty())
                .collect(Collectors.toSet());

        if (uniqueIps.size() > 5) {
            analysis.addRiskFactor("NOMBREUSES IP DIFFÉRENTES DÉTECTÉES", 35);
            analysis.setScore(analysis.getScore() + 35);
        } else if (uniqueIps.size() > 3) {
            analysis.addRiskFactor("CHANGEMENTS D'IP FREQUENTS", 20);
            analysis.setScore(analysis.getScore() + 20);
        }

        // 4. Analyser les activités suspectes (heure)
        Map<String, Long> activityByHour = userLogs.stream()
                .collect(Collectors.groupingBy(
                        log -> log.getPerformedAt().getHour() + "h",
                        Collectors.counting()
                ));

        // Activité entre 00h et 05h (heures suspectes)
        long nightActivity = userLogs.stream()
                .filter(log -> log.getPerformedAt().getHour() >= 0 && log.getPerformedAt().getHour() <= 5)
                .count();

        if (nightActivity > 10) {
            analysis.addRiskFactor("ACTIVITÉ SUSPECTE EN PLEINE NUIT", 25);
            analysis.setScore(analysis.getScore() + 25);
        } else if (nightActivity > 5) {
            analysis.addRiskFactor("ACTIVITÉS NOCTURNES FREQUENTES", 15);
            analysis.setScore(analysis.getScore() + 15);
        }

        // 5. Analyser les actions critiques
        long suspiciousActions = userLogs.stream()
                .filter(log -> {
                    String action = log.getAction();
                    return action.contains("CHANGE_PASSWORD") ||
                            action.contains("UPDATE_PROFILE") ||
                            action.contains("2FA");
                })
                .count();

        if (suspiciousActions > 20) {
            analysis.addRiskFactor("TROP DE MODIFICATIONS DE SÉCURITÉ", 20);
            analysis.setScore(analysis.getScore() + 20);
        }

        // 6. Détection de multi-comptes (même IP)
        if (!userLogs.isEmpty() && userLogs.get(0).getUserIpAddress() != null) {
            String mainIp = userLogs.get(0).getUserIpAddress();
            long usersWithSameIp = auditLogRepository.countDistinctUsersByIpInLastDays(mainIp, 30);

            if (usersWithSameIp > 3) {
                analysis.addRiskFactor("MULTIPLES COMPTES DEPUIS LA MÊME IP", 30);
                analysis.setScore(analysis.getScore() + 30);
            }
        }

        // 7. Score normalisé (max 100)
        analysis.setScore(Math.min(100, analysis.getScore()));

        // 8. Déterminer le niveau
        if (analysis.getScore() >= 70) {
            analysis.setLevel("CRITICAL");
        } else if (analysis.getScore() >= 50) {
            analysis.setLevel("HIGH");
        } else if (analysis.getScore() >= 25) {
            analysis.setLevel("MEDIUM");
        } else {
            analysis.setLevel("LOW");
        }

        return analysis;
    }

    @Data
    public static class AuditRiskAnalysis {
        private Long userId;
        private String email;
        private int score;
        private String level;
        private List<String> riskFactors;

        public void addRiskFactor(String factor, int scoreContribution) {
            this.riskFactors.add(factor + " (+" + scoreContribution + ")");
        }
    }
}