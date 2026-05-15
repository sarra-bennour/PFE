package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.config.StorageConfig;
import com.tunisia.commerce.enums.DocumentType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SecureStorageService {

    private final StorageConfig storageConfig;

    @Value("${app.storage.encryption-key}")
    private String encryptionKey;

    // Constantes pour AES/GCM
    private static final int GCM_IV_LENGTH = 12; // 12 bytes recommandé pour GCM
    private static final int GCM_TAG_LENGTH = 128; // bits

    // ✅ Validation de sécurité des fichiers
    public void validateFile(MultipartFile file) throws SecurityException {
        // Vérifier la taille
        if (file.getSize() > storageConfig.getMaxFileSize()) {
            throw new SecurityException(
                    String.format("Fichier trop volumineux: %d bytes (max: %d)",
                            file.getSize(), storageConfig.getMaxFileSize())
            );
        }

        // Vérifier l'extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new SecurityException("Extension de fichier invalide");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        if (!storageConfig.getAllowedExtensions().contains(extension)) {
            throw new SecurityException(
                    String.format("Extension non autorisée: %s (autorisées: %s)",
                            extension, storageConfig.getAllowedExtensions())
            );
        }

        // Vérifier le content type réel (contre les attaques MIME)
        String contentType = file.getContentType();
        if (!isValidContentType(contentType)) {
            throw new SecurityException("Type MIME non autorisé: " + contentType);
        }
    }

    // ✅ Stockage avec nom sécurisé et chiffrement AES/GCM
    public StorageResult storeDocument(
            MultipartFile file,
            StorageConfig.DocumentCategory category,
            Long demandeId,
            Long entityId,
            DocumentType documentType) throws Exception {

        // Valider le fichier
        validateFile(file);

        // Créer un nom de fichier sécurisé
        String safeFileName = generateSecureFileName(file.getOriginalFilename(), demandeId, documentType);

        // Obtenir le chemin de destination
        Path targetDir = storageConfig.getDocumentsPath(category, demandeId, entityId);

        // Créer le répertoire avec permissions restrictives
        if (!Files.exists(targetDir)) {
            Files.createDirectories(targetDir);
            try {
                Files.setPosixFilePermissions(targetDir, PosixFilePermissions.fromString("rwx------"));
            } catch (Exception e) {
                log.warn("Impossible de définir les permissions: {}", e.getMessage());
            }
        }

        Path targetPath = targetDir.resolve(safeFileName);

        // Stocker avec vérification d'intégrité
        byte[] fileBytes = file.getBytes();
        String fileHash = computeSHA256(fileBytes);

        // Chiffrer le fichier si activé (avec IV)
        byte[] bytesToStore = storageConfig.isEncryptionEnabled()
                ? encryptWithIV(fileBytes)
                : fileBytes;

        Files.write(targetPath, bytesToStore);

        // Stocker également le hash pour vérification future
        storeFileHash(targetPath, fileHash);

        log.info("Document stocké avec succès: {}", targetPath);

        return StorageResult.builder()
                .fileName(safeFileName)
                .filePath(targetPath.toString())
                .fileHash(fileHash)
                .fileSize(file.getSize())
                .build();
    }

    // ✅ Chiffrement AES/GCM avec IV (vecteur d'initialisation)
    private byte[] encryptWithIV(byte[] plaintext) throws Exception {
        SecretKey key = getEncryptionKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");

        // Générer un IV aléatoire
        byte[] iv = new byte[GCM_IV_LENGTH];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);

        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.ENCRYPT_MODE, key, spec);

        byte[] ciphertext = cipher.doFinal(plaintext);

        // Retourner IV + ciphertext (concaténés)
        byte[] result = new byte[iv.length + ciphertext.length];
        System.arraycopy(iv, 0, result, 0, iv.length);
        System.arraycopy(ciphertext, 0, result, iv.length, ciphertext.length);

        return result;
    }

    // ✅ Déchiffrement AES/GCM avec extraction de l'IV
    private byte[] decryptWithIV(byte[] encryptedData) throws Exception {
        // Vérifier que les données sont suffisantes
        if (encryptedData.length < GCM_IV_LENGTH) {
            throw new SecurityException("Fichier chiffré invalide: données trop courtes");
        }

        // Extraire l'IV (12 premiers bytes)
        byte[] iv = new byte[GCM_IV_LENGTH];
        System.arraycopy(encryptedData, 0, iv, 0, GCM_IV_LENGTH);

        // Extraire le ciphertext (reste)
        byte[] ciphertext = new byte[encryptedData.length - GCM_IV_LENGTH];
        System.arraycopy(encryptedData, GCM_IV_LENGTH, ciphertext, 0, ciphertext.length);

        SecretKey key = getEncryptionKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, key, spec);

        return cipher.doFinal(ciphertext);
    }

    // ✅ Nom de fichier sécurisé (contre path traversal)
    private String generateSecureFileName(String originalName, Long demandeId, DocumentType documentType) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        String timestamp = LocalDateTime.now().format(formatter);
        String uuid = UUID.randomUUID().toString();
        String extension = "";

        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
            extension = extension.replaceAll("[^a-zA-Z0-9.]", "");
        }

        return String.format("%s_%d_%s_%s%s",
                documentType.name(), demandeId, timestamp, uuid, extension);
    }

    // ✅ Vérification d'intégrité avant utilisation
    public boolean verifyFileIntegrity(Path filePath, String expectedHash) throws Exception {
        byte[] fileBytes = Files.readAllBytes(filePath);
        byte[] decryptedBytes;

        if (storageConfig.isEncryptionEnabled()) {
            decryptedBytes = decryptWithIV(fileBytes);
        } else {
            decryptedBytes = fileBytes;
        }

        String currentHash = computeSHA256(decryptedBytes);
        boolean isValid = currentHash.equals(expectedHash);

        if (!isValid) {
            log.warn("Vérification d'intégrité échouée pour: {}", filePath);
        }

        return isValid;
    }

    // ✅ Nettoyage sécurisé des fichiers supprimés
    public void secureDelete(Path filePath) throws Exception {
        if (Files.exists(filePath)) {
            // Supprimer le fichier .hash associé
            Path hashPath = filePath.resolveSibling(filePath.getFileName() + ".hash");
            if (Files.exists(hashPath)) {
                Files.delete(hashPath);
                log.debug("Fichier hash supprimé: {}", hashPath);
            }

            // Supprimer le fichier
            Files.delete(filePath);
            log.info("Fichier supprimé sécurisé: {}", filePath);
        }
    }

    // ✅ Récupérer un fichier avec vérification d'intégrité et déchiffrement
    public byte[] retrieveDocument(Path filePath, String expectedHash) throws Exception {
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Fichier non trouvé: " + filePath);
        }

        byte[] fileBytes = Files.readAllBytes(filePath);
        byte[] decryptedBytes;

        if (storageConfig.isEncryptionEnabled()) {
            decryptedBytes = decryptWithIV(fileBytes);
        } else {
            decryptedBytes = fileBytes;
        }

        // Vérifier l'intégrité si un hash est fourni
        if (expectedHash != null && !expectedHash.isEmpty()) {
            String currentHash = computeSHA256(decryptedBytes);
            if (!currentHash.equals(expectedHash)) {
                throw new SecurityException("L'intégrité du fichier est compromise pour: " + filePath);
            }
        }

        log.debug("Document récupéré avec succès: {} (taille: {} bytes)", filePath, decryptedBytes.length);
        return decryptedBytes;
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private boolean isValidContentType(String contentType) {
        if (contentType == null) return false;
        return storageConfig.getAllowedContentTypes().contains(contentType);
    }

    private String computeSHA256(byte[] data) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data);
        return Base64.getEncoder().encodeToString(hash);
    }

    private SecretKey getEncryptionKey() {
        try {
            if (encryptionKey == null || encryptionKey.isEmpty()) {
                throw new IllegalStateException("Clé de chiffrement non configurée dans application.properties");
            }

            byte[] decodedKey = Base64.getDecoder().decode(encryptionKey);

            // Vérifier que la clé fait 32 bytes (256 bits)
            if (decodedKey.length != 32) {
                throw new IllegalStateException("La clé de chiffrement doit faire 32 bytes (256 bits). Actuellement: " + decodedKey.length + " bytes");
            }

            return new SecretKeySpec(decodedKey, 0, decodedKey.length, "AES");

        } catch (IllegalArgumentException e) {
            log.error("Clé de chiffrement invalide (doit être en Base64): {}", e.getMessage());
            throw new IllegalStateException("Configuration de chiffrement invalide", e);
        }
    }

    private void storeFileHash(Path filePath, String hash) throws Exception {
        Path hashPath = filePath.resolveSibling(filePath.getFileName() + ".hash");
        Files.writeString(hashPath, hash);
        log.debug("Hash stocké: {}", hashPath);
    }

    // ✅ Nouvelle méthode pour les images produits sans passer par DocumentType
    public StorageResult storeProductImage(
            MultipartFile file,
            StorageConfig.DocumentCategory category,
            Long demandeId,
            Long productId) throws Exception {

        // Valider le fichier
        validateFile(file);

        // Créer un nom de fichier sécurisé
        String safeFileName = generateProductImageFileName(file.getOriginalFilename(), demandeId, productId);

        // Obtenir le chemin de destination
        Path targetDir = storageConfig.getDocumentsPath(category, demandeId, productId);

        // Créer le répertoire avec permissions restrictives
        if (!Files.exists(targetDir)) {
            Files.createDirectories(targetDir);
            try {
                Files.setPosixFilePermissions(targetDir, PosixFilePermissions.fromString("rwx------"));
            } catch (Exception e) {
                log.warn("Impossible de définir les permissions: {}", e.getMessage());
            }
        }

        Path targetPath = targetDir.resolve(safeFileName);

        // Stocker avec vérification d'intégrité
        byte[] fileBytes = file.getBytes();
        String fileHash = computeSHA256(fileBytes);

        byte[] bytesToStore = storageConfig.isEncryptionEnabled()
                ? encryptWithIV(fileBytes)
                : fileBytes;

        Files.write(targetPath, bytesToStore);
        storeFileHash(targetPath, fileHash);

        log.info("Image produit stockée avec succès: {}", targetPath);

        return StorageResult.builder()
                .fileName(safeFileName)
                .filePath(targetPath.toString())
                .fileHash(fileHash)
                .fileSize(file.getSize())
                .build();
    }

    // Méthode helper pour générer le nom de l'image produit
    private String generateProductImageFileName(String originalName, Long demandeId, Long productId) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        String timestamp = LocalDateTime.now().format(formatter);
        String uuid = UUID.randomUUID().toString();
        String extension = "";

        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
            extension = extension.replaceAll("[^a-zA-Z0-9.]", "");
        }

        return String.format("product_%d_%d_%s_%s%s",
                demandeId, productId, timestamp, uuid, extension);
    }

    @lombok.Builder
    @lombok.Data
    public static class StorageResult {
        private String fileName;
        private String filePath;
        private String fileHash;
        private long fileSize;
    }
}