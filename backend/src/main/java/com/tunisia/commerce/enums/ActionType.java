package com.tunisia.commerce.enums;

public enum ActionType {
    AUTHENTICATION,    // Login, logout, token refresh
    CREATION,          // Création de demande, produit, utilisateur
    MODIFICATION,      // Modification de données
    DELETION,          // Suppression
    VALIDATION,        // Validation de demande, document
    REJECTION,         // Rejet de demande, document
    PAYMENT,           // Paiement initié, confirmé, échoué
    UPLOAD,            // Upload de document
    DOWNLOAD,          // Téléchargement de document
    NOTIFICATION,      // Envoi de notification
    EXPORT,            // Export de données
    SEARCH,            // Recherche
    SYSTEM,            // Action système (batch, nettoyage)
    SECURITY           // Action de sécurité (changement mot de passe, etc.)
}