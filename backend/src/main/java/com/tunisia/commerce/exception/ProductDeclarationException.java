package com.tunisia.commerce.exception;

import com.tunisia.commerce.enums.DemandeStatus;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ProductDeclarationException extends RuntimeException {
    private final String errorCode;
    private final HttpStatus status;
    private final transient Object[] args;

    public ProductDeclarationException(String message, String errorCode, HttpStatus status, Object... args) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
        this.args = args;
    }

    public static ProductDeclarationException exportateurNotFound(Long exportateurId) {
        return new ProductDeclarationException(
                "Exportateur non trouvé avec ID: " + exportateurId,
                "EXPORTATEUR_NOT_FOUND",
                HttpStatus.NOT_FOUND,
                exportateurId
        );
    }

    public static ProductDeclarationException demandeNotFound(Long demandeId) {
        return new ProductDeclarationException(
                "Demande non trouvée avec ID: " + demandeId,
                "DEMANDE_NOT_FOUND",
                HttpStatus.NOT_FOUND,
                demandeId
        );
    }

    public static ProductDeclarationException userNotFound(Long userId) {
        return new ProductDeclarationException(
                "Utilisateur non trouvé avec ID: " + userId,
                "USER_NOT_FOUND",
                HttpStatus.NOT_FOUND,
                userId
        );
    }

    public static ProductDeclarationException unauthorizedAccess() {
        return new ProductDeclarationException(
                "Accès non autorisé",
                "UNAUTHORIZED_ACCESS",
                HttpStatus.FORBIDDEN
        );
    }

    public static ProductDeclarationException maxPendingDemandesExceeded(int maxDemandes) {
        return new ProductDeclarationException(
                String.format("Vous avez déjà %d demande(s) en cours de traitement", maxDemandes),
                "MAX_PENDING_DEMANDES_EXCEEDED",
                HttpStatus.BAD_REQUEST,
                maxDemandes
        );
    }

    public static ProductDeclarationException maxSubmittedDemandesExceeded(int maxDemandes) {
        return new ProductDeclarationException(
                String.format("Vous avez atteint la limite maximale de %d demande(s) en cours de traitement. " +
                        "Veuillez attendre la validation de vos demandes existantes avant d'en soumettre de nouvelles.", maxDemandes),
                "MAX_SUBMITTED_DEMANDES_EXCEEDED",
                HttpStatus.BAD_REQUEST,
                maxDemandes
        );
    }

    public static ProductDeclarationException invalidDemandeStatusForSubmission(DemandeStatus currentStatus) {
        return new ProductDeclarationException(
                "Seules les demandes en BROUILLON peuvent être soumises. Statut actuel: " + currentStatus,
                "INVALID_STATUS_FOR_SUBMISSION",
                HttpStatus.BAD_REQUEST,
                currentStatus
        );
    }

    public static ProductDeclarationException missingRequiredDocuments(String productName) {
        return new ProductDeclarationException(
                "Documents obligatoires manquants pour le produit: " + productName,
                "MISSING_REQUIRED_DOCUMENTS",
                HttpStatus.BAD_REQUEST,
                productName
        );
    }

    public static ProductDeclarationException documentUploadFailed(String documentType, String reason) {
        return new ProductDeclarationException(
                "Échec du téléchargement du document " + documentType + ": " + reason,
                "DOCUMENT_UPLOAD_FAILED",
                HttpStatus.INTERNAL_SERVER_ERROR,
                documentType, reason
        );
    }

    public static ProductDeclarationException invalidDocumentType(String documentType) {
        return new ProductDeclarationException(
                "Type de document invalide: " + documentType,
                "INVALID_DOCUMENT_TYPE",
                HttpStatus.BAD_REQUEST,
                documentType
        );
    }

    public static ProductDeclarationException productNotFound(Long productId) {
        return new ProductDeclarationException(
                "Produit non trouvé avec ID: " + productId,
                "PRODUCT_NOT_FOUND",
                HttpStatus.NOT_FOUND,
                productId
        );
    }

    public static ProductDeclarationException productNotOwnedByUser(Long productId, Long userId) {
        return new ProductDeclarationException(
                "Ce produit (ID: " + productId + ") ne vous appartient pas",
                "PRODUCT_NOT_OWNED",
                HttpStatus.FORBIDDEN,
                productId, userId
        );
    }

    public static ProductDeclarationException demandeAlreadySubmitted(Long demandeId) {
        return new ProductDeclarationException(
                "Impossible d'uploader des documents sur une demande déjà soumise (ID: " + demandeId + ")",
                "DEMANDE_ALREADY_SUBMITTED",
                HttpStatus.BAD_REQUEST,
                demandeId
        );
    }

    public static ProductDeclarationException demandeCreationFailed(String reason) {
        return new ProductDeclarationException(
                "Échec de la création de la demande: " + reason,
                "DEMANDE_CREATION_FAILED",
                HttpStatus.INTERNAL_SERVER_ERROR,
                reason
        );
    }

    public static ProductDeclarationException demandeSubmissionFailed(String reason) {
        return new ProductDeclarationException(
                "Échec de la soumission de la demande: " + reason,
                "DEMANDE_SUBMISSION_FAILED",
                HttpStatus.INTERNAL_SERVER_ERROR,
                reason
        );
    }
}