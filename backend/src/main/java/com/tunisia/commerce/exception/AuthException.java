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
}