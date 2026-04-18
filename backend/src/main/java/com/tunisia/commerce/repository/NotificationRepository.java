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

    // Récupérer toutes les notifications d'un utilisateur avec pagination
    Page<Notification> findByReceiverIdOrderByCreatedAtDesc(Long receiverId, Pageable pageable);

    // Récupérer les notifications non lues d'un utilisateur
    @Query("SELECT n FROM Notification n WHERE n.receiver.id = :receiverId AND n.status = :status ORDER BY n.createdAt DESC")
    List<Notification> findUnreadByReceiverId(@Param("receiverId") Long receiverId, @Param("status") NotificationStatus status);

    // Compter les notifications non lues d'un utilisateur
    long countByReceiverIdAndStatus(Long receiverId, NotificationStatus status);

    // Supprimer les notifications plus anciennes qu'une date donnée

    List<Notification> findBySenderIdAndActionAndStatus(Long senderId, NotificationAction action, NotificationStatus status);

    // Vérifier si une notification existe déjà pour éviter les doublons
    boolean existsBySenderIdAndReceiverIdAndTargetEntityTypeAndTargetEntityIdAndNotificationType(
            Long senderId, Long receiverId, String targetEntityType, Long targetEntityId, NotificationType type);

    // Récupérer les notifications par expéditeur et destinataire pour un produit
    @Query("SELECT n FROM Notification n WHERE n.sender.id = :senderId AND n.receiver.id = :receiverId AND n.targetEntityType = 'PRODUCT' AND n.targetEntityId = :productId")
    List<Notification> findBySenderAndReceiverAndProduct(
            @Param("senderId") Long senderId,
            @Param("receiverId") Long receiverId,
            @Param("productId") Long productId);
}