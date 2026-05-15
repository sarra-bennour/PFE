package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.config.StorageConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class StorageCleanupService {

    private final SecureStorageService storageService;
    private final StorageConfig storageConfig;

    @Scheduled(cron = "0 0 2 * * ?") // Tous les jours à 2h du matin
    public void cleanupExpiredDrafts() {
        if (!storageConfig.isAutoDeleteExpiredDrafts()) {
            return;
        }

        log.info("Nettoyage des brouillons expirés...");

        try {
            // Nettoyer les dossiers des demandes en brouillon
            Path basePath = storageConfig.getBasePath();

            if (!Files.exists(basePath)) {
                log.info("Le dossier de base n'existe pas encore: {}", basePath);
                return;
            }

            Files.walk(basePath)
                    .filter(Files::isDirectory)
                    .filter(path -> isDraftDirectory(path))
                    .filter(path -> {
                        try {
                            return isExpired(path);
                        } catch (IOException e) {
                            log.warn("Erreur lors de la vérification d'expiration du dossier {}: {}", path, e.getMessage());
                            return false;
                        }
                    })
                    .forEach(this::deleteDirectorySafely);

        } catch (IOException e) {
            log.error("Erreur lors du parcours des dossiers: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Erreur inattendue lors du nettoyage: {}", e.getMessage(), e);
        }
    }

    private boolean isDraftDirectory(Path path) {
        // Logique pour identifier les dossiers de brouillon
        String pathStr = path.toString().toLowerCase();
        return pathStr.contains("draft") ||
                pathStr.contains("temp") ||
                pathStr.contains("brouillon");
    }

    private boolean isExpired(Path path) throws IOException {
        try {
            long modifiedTime = Files.getLastModifiedTime(path).toMillis();
            LocalDateTime lastModified = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(modifiedTime),
                    ZoneId.systemDefault()
            );

            long daysOld = ChronoUnit.DAYS.between(lastModified, LocalDateTime.now());
            return daysOld > storageConfig.getDraftExpirationDays();

        } catch (IOException e) {
            log.error("Impossible de lire la date de modification pour {}: {}", path, e.getMessage());
            throw e;
        }
    }

    private void deleteDirectorySafely(Path path) {
        try {
            if (!Files.exists(path)) {
                return;
            }

            log.info("Suppression du dossier expiré: {}", path);

            Files.walk(path)
                    .sorted((a, b) -> b.compareTo(a)) // Supprimer les fichiers avant les dossiers
                    .forEach(file -> {
                        try {
                            if (Files.isRegularFile(file)) {
                                storageService.secureDelete(file);
                            } else {
                                Files.deleteIfExists(file);
                            }
                        } catch (Exception e) {
                            log.error("Erreur lors de la suppression de {}: {}", file, e.getMessage());
                        }
                    });

            log.info("Dossier expiré supprimé avec succès: {}", path);

        } catch (IOException e) {
            log.error("Erreur lors de la suppression du dossier {}: {}", path, e.getMessage());
        }
    }

    /**
     * Méthode manuelle pour forcer le nettoyage (utile pour les tests ou l'administration)
     */
    public void forceCleanup() {
        log.info("Nettoyage forcé des brouillons expirés...");
        cleanupExpiredDrafts();
    }
}