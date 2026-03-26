package com.tunisia.commerce.service;

import com.tunisia.commerce.dto.notification.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {

    /**
     * Créer une notification pour l'ajout de produit par un importateur
     */
    NotificationResponseDTO createProductAdditionNotification(ProductAdditionNotificationDTO productAdditionDTO);

    /**
     * Créer une notification générique
     */
    NotificationResponseDTO createNotification(NotificationRequestDTO requestDTO);

    /**
     * Récupérer toutes les notifications d'un utilisateur
     */
    Page<NotificationResponseDTO> getUserNotifications(Long userId, Pageable pageable);

    /**
     * Récupérer les notifications non lues d'un utilisateur
     */
    List<NotificationResponseDTO> getUnreadNotifications(Long userId);

    /**
     * Récupérer le nombre de notifications non lues
     */
    long getUnreadCount(Long userId);

    /**
     * Marquer une notification comme lue
     */
    void markAsRead(Long notificationId);

    /**
     * Marquer toutes les notifications d'un utilisateur comme lues
     */
    void markAllAsRead(Long userId);

    /**
     * Traiter une action sur une notification (accepter/rejeter)
     */
    void handleNotificationAction(NotificationActionDTO actionDTO);

    /**
     * Supprimer une notification
     */
    void deleteNotification(Long notificationId);

    /**
     * Archiver les anciennes notifications
     */
    void archiveOldNotifications(int daysOld);

    /**
     * Envoyer les notifications par email (job programmé)
     */
    void sendPendingEmailNotifications();

    /**
     * Récupérer une notification par son ID
     */
    NotificationResponseDTO getNotificationById(Long notificationId);

    /**
     * Récupérer les notifications par entité cible
     */
    List<NotificationResponseDTO> getNotificationsByTargetEntity(String entityType, Long entityId);

    /**
     * Mettre à jour l'action d'une notification
     */
    void updateNotificationAction(Long notificationId, com.tunisia.commerce.enums.NotificationAction action);

    /**
     * Récupérer les notifications pour un produit spécifique
     */
    List<NotificationResponseDTO> getNotificationsByProduct(Long productId);
}