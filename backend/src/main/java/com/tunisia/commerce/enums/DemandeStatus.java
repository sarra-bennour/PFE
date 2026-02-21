package com.tunisia.commerce.enums;

public enum DemandeStatus {
    BROUILLON,                // En cours de saisie
    SOUMISE,                  // Soumise par l'exportateur
    EN_ATTENTE_PAIEMENT,       // En attente de paiement
    PAYEE,                    // Paiement effectué
    EN_COURS_VALIDATION,       // En cours de validation
    EN_ATTENTE_INFO,           // Info complémentaire demandée
    VALIDEE,                   // Validée par l'instance
    REJETEE,                   // Rejetée
    SUSPENDUE                  // Suspendue
}