package com.tunisia.commerce.enums;

public enum ArchiveType {
    AUTOMATIC,          // Archivage automatique par le système
    MANUAL_ADMIN,       // Archivage manuel par admin
    USER_REQUEST,       // Archivage demandé par l'utilisateur
    RETENTION_POLICY,   // Archivage par politique de rétention
    EXPIRED_AGRMENT,    // Archivage car agrément expiré
    CLOSED_DEMANDE      // Archivage car demande clôturée
}