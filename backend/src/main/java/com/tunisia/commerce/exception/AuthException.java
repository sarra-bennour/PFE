package com.tunisia.commerce.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AuthException extends RuntimeException {
    private final String errorCode;
    private final HttpStatus status;
    private final transient Object[] args;

    public AuthException(String message, String errorCode, HttpStatus status, Object... args) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
        this.args = args;
    }

    public static AuthException emailNotVerified(String email) {
        return new AuthException(
                "Veuillez vérifier votre email avant de vous connecter",
                "EMAIL_NOT_VERIFIED",
                HttpStatus.FORBIDDEN,
                email
        );
    }

    public static AuthException invalidCredentials(int remainingAttempts) {
        String message = remainingAttempts > 0
                ? String.format("Email ou mot de passe incorrect. Il vous reste %d tentative(s).", remainingAttempts)
                : "Email ou mot de passe incorrect";

        return new AuthException(
                message,
                "INVALID_CREDENTIALS",
                HttpStatus.UNAUTHORIZED,
                remainingAttempts
        );
    }

    public static AuthException accountLocked(int minutesRemaining) {
        return new AuthException(
                String.format("Compte temporairement verrouillé pour %d minutes. Réessayez plus tard.", minutesRemaining),
                "ACCOUNT_LOCKED",
                HttpStatus.FORBIDDEN,
                minutesRemaining
        );
    }

    public static AuthException accountDisabled() {
        return new AuthException(
                "Compte désactivé. Contactez l'administrateur",
                "ACCOUNT_DISABLED",
                HttpStatus.FORBIDDEN
        );
    }

    public static AuthException userNotFound() {
        return new AuthException(
                "Aucun compte trouvé avec cet email",
                "USER_NOT_FOUND",
                HttpStatus.NOT_FOUND
        );
    }

    public static AuthException maxAttemptsExceeded(int lockDurationMinutes) {
        return new AuthException(
                String.format("Trop de tentatives échouées. Compte verrouillé pour %d minutes.", lockDurationMinutes),
                "MAX_ATTEMPTS_EXCEEDED",
                HttpStatus.FORBIDDEN,
                lockDurationMinutes
        );
    }

    public static AuthException passwordExpired() {
        return new AuthException(
                "Votre mot de passe a expiré. Veuillez le réinitialiser.",
                "PASSWORD_EXPIRED",
                HttpStatus.FORBIDDEN
        );
    }

    public static AuthException emailAlreadyUsed(String email) {
        return new AuthException(
                "Cette adresse email est déjà utilisée par un autre compte",
                "EMAIL_ALREADY_USED",
                HttpStatus.CONFLICT,
                email
        );
    }

    public static AuthException tinNumberAlreadyUsed(String tinNumber) {
        return new AuthException(
                "Ce numéro de registre de commerce est déjà utilisé",
                "TIN_NUMBER_ALREADY_USED",
                HttpStatus.CONFLICT,
                tinNumber
        );
    }

    public static AuthException invalidPhoneNumber(String phoneNumber) {
        return new AuthException(
                "Le numéro de téléphone fourni n'est pas valide",
                "INVALID_PHONE_NUMBER",
                HttpStatus.BAD_REQUEST,
                phoneNumber
        );
    }

    public static AuthException invalidEmailFormat(String email) {
        return new AuthException(
                "Le format de l'adresse email n'est pas valide",
                "INVALID_EMAIL_FORMAT",
                HttpStatus.BAD_REQUEST,
                email
        );
    }

    public static AuthException weakPassword(String reason) {
        return new AuthException(
                "Le mot de passe est trop faible : " + reason,
                "WEAK_PASSWORD",
                HttpStatus.BAD_REQUEST,
                reason
        );
    }

    public static AuthException missingRequiredField(String fieldName) {
        return new AuthException(
                "Le champ '" + fieldName + "' est obligatoire",
                "MISSING_REQUIRED_FIELD",
                HttpStatus.BAD_REQUEST,
                fieldName
        );
    }

    public static AuthException invalidCountryCode(String countryCode) {
        return new AuthException(
                "Le code pays '" + countryCode + "' n'est pas valide",
                "INVALID_COUNTRY_CODE",
                HttpStatus.BAD_REQUEST,
                countryCode
        );
    }

    public static AuthException emailSendingFailed(String email, String reason) {
        return new AuthException(
                "L'envoi de l'email de vérification a échoué: " + reason,
                "EMAIL_SENDING_FAILED",
                HttpStatus.INTERNAL_SERVER_ERROR,
                email, reason
        );
    }

    public static AuthException registrationFailed(String reason) {
        return new AuthException(
                "L'inscription a échoué: " + reason,
                "REGISTRATION_FAILED",
                HttpStatus.INTERNAL_SERVER_ERROR,
                reason
        );
    }

}