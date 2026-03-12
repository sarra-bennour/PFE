package com.tunisia.commerce.exception;

import lombok.Getter;

@Getter
public class PaymentException extends RuntimeException {

    private final String errorCode;
    private final String userMessage;

    public PaymentException(String errorCode, String userMessage, String technicalMessage) {
        super(technicalMessage);
        this.errorCode = errorCode;
        this.userMessage = userMessage;
    }

    public PaymentException(String errorCode, String userMessage, Throwable cause) {
        super(cause.getMessage(), cause);
        this.errorCode = errorCode;
        this.userMessage = userMessage;
    }

    // Méthodes statiques pour les cas courants
    public static PaymentException cardDeclined(Throwable cause) {
        return new PaymentException(
                "CARD_DECLINED",
                "Votre carte a été refusée. Veuillez vérifier vos informations ou utiliser une autre carte.",
                cause
        );
    }

    public static PaymentException insufficientFunds(Throwable cause) {
        return new PaymentException(
                "INSUFFICIENT_FUNDS",
                "Fonds insuffisants sur cette carte. Veuillez utiliser une autre carte.",
                cause
        );
    }

    public static PaymentException expiredCard(Throwable cause) {
        return new PaymentException(
                "EXPIRED_CARD",
                "Votre carte a expiré. Veuillez utiliser une carte valide.",
                cause
        );
    }

    public static PaymentException incorrectCvc(Throwable cause) {
        return new PaymentException(
                "INCORRECT_CVC",
                "Le code de sécurité (CVV) est incorrect. Veuillez vérifier et réessayer.",
                cause
        );
    }

    public static PaymentException lostCard(Throwable cause) {
        return new PaymentException(
                "LOST_CARD",
                "Cette carte a été signalée comme perdue. Veuillez utiliser une autre carte.",
                cause
        );
    }

    public static PaymentException stolenCard(Throwable cause) {
        return new PaymentException(
                "STOLEN_CARD",
                "Cette carte a été signalée comme volée. Veuillez utiliser une autre carte.",
                cause
        );
    }

    public static PaymentException authenticationRequired(Throwable cause) {
        return new PaymentException(
                "AUTHENTICATION_REQUIRED",
                "Une authentification supplémentaire est requise. Veuillez suivre les instructions de votre banque.",
                cause
        );
    }

    public static PaymentException processingError(Throwable cause) {
        return new PaymentException(
                "PROCESSING_ERROR",
                "Une erreur est survenue lors du traitement du paiement. Veuillez réessayer.",
                cause
        );
    }
}