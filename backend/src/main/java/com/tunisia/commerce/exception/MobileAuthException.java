package com.tunisia.commerce.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class MobileAuthException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus status;
    private final Object[] args;

    private MobileAuthException(String errorCode, String message, HttpStatus status, Object[] args) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
        this.args = args;
    }

    // Importateur non trouvé
    public static MobileAuthException importateurNotFound(String matricule) {
        return new MobileAuthException(
                "IMPORTATEUR_NOT_FOUND",
                "Aucun importateur trouvé avec le matricule: " + matricule,
                HttpStatus.NOT_FOUND,
                new Object[]{matricule}
        );
    }

    // PIN incorrect
    public static MobileAuthException invalidPin() {
        return new MobileAuthException(
                "INVALID_PIN",
                "Le PIN saisi est incorrect",
                HttpStatus.UNAUTHORIZED,
                new Object[]{}
        );
    }

    // Compte inactif
    public static MobileAuthException accountInactive(String status) {
        return new MobileAuthException(
                "ACCOUNT_INACTIVE",
                "Votre compte est " + status + ". Veuillez contacter l'administrateur.",
                HttpStatus.FORBIDDEN,
                new Object[]{status}
        );
    }

    // Mobile ID non vérifié
    public static MobileAuthException mobileIdNotVerified() {
        return new MobileAuthException(
                "MOBILE_ID_NOT_VERIFIED",
                "Votre identité Mobile ID n'a pas encore été vérifiée",
                HttpStatus.FORBIDDEN,
                new Object[]{}
        );
    }

    // Compte verrouillé
    public static MobileAuthException accountLocked(int minutesRemaining) {
        return new MobileAuthException(
                "ACCOUNT_LOCKED",
                "Trop de tentatives échouées. Compte verrouillé pour " + minutesRemaining + " minutes.",
                HttpStatus.LOCKED,
                new Object[]{minutesRemaining}
        );
    }

    // Format matricule invalide
    public static MobileAuthException invalidMatriculeFormat() {
        return new MobileAuthException(
                "INVALID_MATRICULE_FORMAT",
                "Le matricule doit contenir exactement 10 chiffres",
                HttpStatus.BAD_REQUEST,
                new Object[]{}
        );
    }

    // Format PIN invalide
    public static MobileAuthException invalidPinFormat() {
        return new MobileAuthException(
                "INVALID_PIN_FORMAT",
                "Le PIN doit contenir exactement 6 chiffres",
                HttpStatus.BAD_REQUEST,
                new Object[]{}
        );
    }
}