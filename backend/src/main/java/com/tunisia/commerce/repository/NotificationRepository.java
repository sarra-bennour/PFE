package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Notification;
import com.tunisia.commerce.enums.NotificationAction;
import com.tunisia.commerce.enums.NotificationStatus;
import com.tunisia.commerce.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Récupérer les notifications d'un utilisateur par statut
    List<Notification> findByReceiverIdAndStatusOrderByCreatedAtDesc(Long receiverId, NotificationStatus status);

    // Récupérer toutes les notifications d'un utilisateur avec pagination
    Page<Notification> findByReceiverIdOrderByCreatedAtDesc(Long receiverId, Pageable pageable);

    // Récupérer les notifications non lues d'un utilisateur
    @Query("SELECT n FROM Notification n WHERE n.receiver.id = :receiverId AND n.status = :status ORDER BY n.createdAt DESC")
    List<Notification> findUnreadByReceiverId(@Param("receiverId") Long receiverId, @Param("status") NotificationStatus status);

    // Compter les notifications non lues d'un utilisateur
    long countByReceiverIdAndStatus(Long receiverId, NotificationStatus status);

    // Récupérer les notifications par type et statut
    List<Notification> findByNotificationTypeAndStatus(NotificationType type, NotificationStatus status);

    // Récupérer les notifications pour une entité cible spécifique
    List<Notification> findByTargetEntityTypeAndTargetEntityId(String targetEntityType, Long targetEntityId);

    // Récupérer les notifications pour un produit spécifique
    @Query("SELECT n FROM Notification n WHERE n.targetEntityType = 'PRODUCT' AND n.targetEntityId = :productId ORDER BY n.createdAt DESC")
    List<Notification> findByProductId(@Param("productId") Long productId);

    // Récupérer les notifications non lues pour un utilisateur et un type d'entité spécifique
    @Query("SELECT n FROM Notification n WHERE n.receiver.id = :receiverId AND n.status = :status AND n.targetEntityType = :targetEntityType ORDER BY n.createdAt DESC")
    List<Notification> findUnreadByReceiverIdAndTargetEntityType(
            @Param("receiverId") Long receiverId,
            @Param("status") NotificationStatus status,
            @Param("targetEntityType") String targetEntityType
    );

    // Marquer une notification comme lue
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.status = :status, n.readAt = :readAt WHERE n.id = :notificationId")
    void markAsRead(@Param("notificationId") Long notificationId,
                    @Param("status") NotificationStatus status,
                    @Param("readAt") LocalDateTime readAt);

    // Marquer toutes les notifications d'un utilisateur comme lues
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.status = :status, n.readAt = :readAt WHERE n.receiver.id = :receiverId AND n.status = :currentStatus")
    void markAllAsRead(@Param("receiverId") Long receiverId,
                       @Param("status") NotificationStatus status,
                       @Param("readAt") LocalDateTime readAt,
                       @Param("currentStatus") NotificationStatus currentStatus);

    // Mettre à jour l'action d'une notification
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.action = :action WHERE n.id = :notificationId")
    void updateAction(@Param("notificationId") Long notificationId, @Param("action") NotificationAction action);

    // Supprimer les notifications plus anciennes qu'une date donnée
    @Modifying
    @Transactional
    int deleteByCreatedAtBefore(LocalDateTime date);

    // Récupérer les notifications qui nécessitent l'envoi d'email
    @Query("SELECT n FROM Notification n WHERE n.isEmailSent = false AND n.createdAt >= :since")
    List<Notification> findPendingEmailNotifications(@Param("since") LocalDateTime since);

    // Récupérer les notifications par expéditeur
    List<Notification> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    // Vérifier si une notification existe déjà pour éviter les doublons
    boolean existsBySenderIdAndReceiverIdAndTargetEntityTypeAndTargetEntityIdAndNotificationType(
            Long senderId, Long receiverId, String targetEntityType, Long targetEntityId, NotificationType type);

    // Récupérer les notifications avec une action en attente pour un utilisateur
    List<Notification> findByReceiverIdAndActionAndStatus(
            Long receiverId, NotificationAction action, NotificationStatus status);

    // Récupérer les notifications par expéditeur et destinataire pour un produit
    @Query("SELECT n FROM Notification n WHERE n.sender.id = :senderId AND n.receiver.id = :receiverId AND n.targetEntityType = 'PRODUCT' AND n.targetEntityId = :productId")
    List<Notification> findBySenderAndReceiverAndProduct(
            @Param("senderId") Long senderId,
            @Param("receiverId") Long receiverId,
            @Param("productId") Long productId);
}