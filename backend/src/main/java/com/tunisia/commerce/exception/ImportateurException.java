package com.tunisia.commerce.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ImportateurException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public ImportateurException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.errorCode = "IMPORTATEUR_ERROR";
    }

    public ImportateurException(String message, HttpStatus status) {
        super(message);
        this.status = status;
        this.errorCode = "IMPORTATEUR_ERROR";
    }

    public ImportateurException(String message, String errorCode) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.errorCode = errorCode;
    }

    public ImportateurException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public ImportateurException(String message, Throwable cause) {
        super(message, cause);
        this.status = HttpStatus.INTERNAL_SERVER_ERROR;
        this.errorCode = "IMPORTATEUR_INTERNAL_ERROR";
    }

    // Méthodes statiques pour créer des exceptions courantes
    public static ImportateurException exportateurNonTrouve(Long id) {
        return new ImportateurException(
                "Exportateur non trouvé avec l'ID: " + id,
                HttpStatus.NOT_FOUND,
                "EXPORTATEUR_NOT_FOUND"
        );
    }

    public static ImportateurException exportateurNonValide(Long id) {
        return new ImportateurException(
                "L'exportateur avec l'ID " + id + " n'est pas validé (agrément ou paiement manquant)",
                HttpStatus.FORBIDDEN,
                "EXPORTATEUR_NOT_VALIDATED"
        );
    }

    public static ImportateurException rechercheInvalide(String critere) {
        return new ImportateurException(
                "Critère de recherche invalide: " + critere,
                HttpStatus.BAD_REQUEST,
                "INVALID_SEARCH_CRITERIA"
        );
    }

    public static ImportateurException accesRefuse(String message) {
        return new ImportateurException(
                message,
                HttpStatus.FORBIDDEN,
                "ACCESS_DENIED"
        );
    }
}