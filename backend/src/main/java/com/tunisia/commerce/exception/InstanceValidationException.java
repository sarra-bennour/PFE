package com.tunisia.commerce.exception;

import lombok.Getter;

@Getter
public class InstanceValidationException extends RuntimeException {

    private final String errorCode;
    private final Object[] args;

    public InstanceValidationException(String message) {
        super(message);
        this.errorCode = null;
        this.args = null;
    }

    public InstanceValidationException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.args = null;
    }

    public InstanceValidationException(String message, String errorCode, Object... args) {
        super(message);
        this.errorCode = errorCode;
        this.args = args;
    }

    // Factory methods
    public static InstanceValidationException emailAlreadyExists(String email) {
        return new InstanceValidationException(
                "Un utilisateur avec l'email '" + email + "' existe déjà",
                "INSTANCE_VALIDATION.EMAIL_EXISTS",
                email
        );
    }

    public static InstanceValidationException codeMinistereAlreadyExists(String codeMinistere) {
        return new InstanceValidationException(
                "Le code ministère '" + codeMinistere + "' est déjà utilisé",
                "INSTANCE_VALIDATION.CODE_MINISTERE_EXISTS",
                codeMinistere
        );
    }

    public static InstanceValidationException invalidTypeAutorite(String type) {
        return new InstanceValidationException(
                "Type d'autorité invalide: '" + type + "'. Utilisez: MINISTERE, AGENCE_NATIONALE, DIRECTION_GENERALE, AUTRE_ORGANISME_PUBLIC",
                "INSTANCE_VALIDATION.INVALID_TYPE",
                type
        );
    }

    public static InstanceValidationException instanceNotFound(Long id) {
        return new InstanceValidationException(
                "Instance de validation non trouvée avec l'id: " + id,
                "INSTANCE_VALIDATION.NOT_FOUND",
                id
        );
    }

    public static InstanceValidationException instanceNotFoundByEmail(String email) {
        return new InstanceValidationException(
                "Instance de validation non trouvée avec l'email: " + email,
                "INSTANCE_VALIDATION.NOT_FOUND_BY_EMAIL",
                email
        );
    }

    public static InstanceValidationException invalidStatus(String status) {
        return new InstanceValidationException(
                "Statut invalide: '" + status + "'. Utilisez: ACTIF ou INACTIF",
                "INSTANCE_VALIDATION.INVALID_STATUS",
                status
        );
    }

    public static InstanceValidationException missingRequiredField(String fieldName) {
        return new InstanceValidationException(
                "Le champ '" + fieldName + "' est obligatoire",
                "INSTANCE_VALIDATION.MISSING_FIELD",
                fieldName
        );
    }

    public static InstanceValidationException invalidEmailFormat(String email) {
        return new InstanceValidationException(
                "Format d'email invalide: '" + email + "'",
                "INSTANCE_VALIDATION.INVALID_EMAIL",
                email
        );
    }

    public static InstanceValidationException invalidPhoneFormat(String phone) {
        return new InstanceValidationException(
                "Format de téléphone invalide: '" + phone + "'. Format attendu: +216XXXXXXXX",
                "INSTANCE_VALIDATION.INVALID_PHONE",
                phone
        );
    }

    public static InstanceValidationException invalidCodeMinistereFormat(String codeMinistere) {
        return new InstanceValidationException(
                "Format de code ministère invalide: '" + codeMinistere + "'. Format attendu: 3-20 caractères, majuscules et underscores uniquement",
                "INSTANCE_VALIDATION.INVALID_CODE_MINISTERE",
                codeMinistere
        );
    }

    public static InstanceValidationException invalidSlaDays(Integer slaDays) {
        return new InstanceValidationException(
                "Le SLA doit être compris entre 1 et 60 jours. Valeur fournie: " + slaDays,
                "INSTANCE_VALIDATION.INVALID_SLA",
                slaDays
        );
    }
}