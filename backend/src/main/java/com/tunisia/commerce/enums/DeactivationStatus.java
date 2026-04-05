package com.tunisia.commerce.enums;

public enum DeactivationStatus {
    PENDING,        // En attente de traitement
    IN_REVIEW,       // En cours d'examen
    APPROVED,        // Approuvée (compte sera désactivé)
    REJECTED,        // Rejetée
    CANCELLED        // Annulée par l'utilisateur
}