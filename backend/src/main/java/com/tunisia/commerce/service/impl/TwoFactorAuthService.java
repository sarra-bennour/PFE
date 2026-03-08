package com.tunisia.commerce.service.impl;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class TwoFactorAuthService {

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator(64);
    private final TimeProvider timeProvider = new SystemTimeProvider();
    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);

    /**
     * Génère un nouveau secret pour 2FA
     */
    public String generateSecret() {
        return secretGenerator.generate();
    }

    /**
     * Génère l'URI pour l'application d'authentification (Google Authenticator, etc.)
     */
    public String getUriForSecret(String secret, String email, String issuer) {
        QrData data = new QrData.Builder()
                .label(email)
                .secret(secret)
                .issuer(issuer)
                .algorithm(HashingAlgorithm.SHA1) // TOTP standard
                .digits(6)
                .period(30)
                .build();

        return data.getUri();
    }

    /**
     * Génère un QR code en Base64 pour l'affichage
     */
    public String generateQrCodeBase64(String secret, String email, String issuer) {
        try {
            QrData data = new QrData.Builder()
                    .label(email)
                    .secret(secret)
                    .issuer(issuer)
                    .algorithm(HashingAlgorithm.SHA1)
                    .digits(6)
                    .period(30)
                    .build();

            QrGenerator generator = new ZxingPngQrGenerator();
            byte[] imageData = generator.generate(data);
            return Base64.getEncoder().encodeToString(imageData);
        } catch (QrGenerationException e) {
            log.error("Erreur lors de la génération du QR code", e);
            return null;
        }
    }

    /**
     * Génère un QR code en utilisant ZXing directement (alternative)
     */
    public String generateQrCodeWithZxing(String secret, String email, String issuer) {
        try {
            String qrContent = getUriForSecret(secret, email, issuer);

            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(qrContent, BarcodeFormat.QR_CODE, 250, 250);

            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            byte[] pngData = pngOutputStream.toByteArray();

            return Base64.getEncoder().encodeToString(pngData);
        } catch (Exception e) {
            log.error("Erreur lors de la génération du QR code avec ZXing", e);
            return null;
        }
    }

    /**
     * Vérifie si un code TOTP est valide pour un secret donné
     */
    public boolean verifyCode(String secret, String code) {
        try {
            return codeVerifier.isValidCode(secret, code);
        } catch (Exception e) {
            log.error("Erreur lors de la vérification du code 2FA", e);
            return false;
        }
    }

    /**
     * Vérifie si un code TOTP est valide avec une marge de temps (pour la première activation)
     */
    public boolean verifyCodeWithMargin(String secret, String code) {
        try {
            // Nettoyer le code
            code = code.trim();

            TimeProvider timeProvider = new SystemTimeProvider();
            long currentTime = timeProvider.getTime();
            CodeGenerator codeGenerator = new DefaultCodeGenerator();

            // Vérification standard
            boolean isValid = codeVerifier.isValidCode(secret, code);

            if (isValid) {
                return true;
            }

            // Tester avec la période précédente ( -30 secondes)
            String previousCode = codeGenerator.generate(secret, currentTime - 30);
            if (previousCode.equals(code)) {
                log.info("Code valide avec période précédente (-30s)");
                return true;
            }

            // Tester avec la période suivante ( +30 secondes)
            String nextCode = codeGenerator.generate(secret, currentTime + 30);
            if (nextCode.equals(code)) {
                log.info("Code valide avec période suivante (+30s)");
                return true;
            }

            // Tester avec -60 secondes (2 périodes avant)
            String prevPrevCode = codeGenerator.generate(secret, currentTime - 60);
            if (prevPrevCode.equals(code)) {
                log.info("Code valide avec période -60s");
                return true;
            }

            // Tester avec +60 secondes (2 périodes après)
            String nextNextCode = codeGenerator.generate(secret, currentTime + 60);
            if (nextNextCode.equals(code)) {
                log.info("Code valide avec période +60s");
                return true;
            }

            return false;

        } catch (Exception e) {
            log.error("Erreur lors de la vérification du code 2FA avec marge", e);
            return false;
        }
    }

    /**
     * Génère le code TOTP actuel pour un secret donné
     */
    public String generateCurrentCode(String secret) {
        try {
            TimeProvider timeProvider = new SystemTimeProvider();
            long currentTime = timeProvider.getTime();

            CodeGenerator codeGenerator = new DefaultCodeGenerator();
            return codeGenerator.generate(secret, currentTime);
        } catch (Exception e) {
            log.error("Erreur lors de la génération du code 2FA actuel", e);
            return null;
        }
    }


    /**
     * Génère les codes pour les périodes adjacentes (utile pour le débogage)
     */
    public Map<String, String> generateAdjacentCodes(String secret) {
        try {
            TimeProvider timeProvider = new SystemTimeProvider();
            long currentTime = timeProvider.getTime();

            CodeGenerator codeGenerator = new DefaultCodeGenerator();

            Map<String, String> codes = new HashMap<>();
            codes.put("previous", codeGenerator.generate(secret, currentTime - 30));
            codes.put("current", codeGenerator.generate(secret, currentTime));
            codes.put("next", codeGenerator.generate(secret, currentTime + 30));

            return codes;
        } catch (Exception e) {
            log.error("Erreur lors de la génération des codes adjacents", e);
            return Collections.emptyMap();
        }
    }
}