package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.notification.*;
import com.tunisia.commerce.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Créer une notification pour l'ajout de produit
     */
    @PostMapping("/product-addition")
    public ResponseEntity<NotificationResponseDTO> createProductAdditionNotification(
            @RequestBody ProductAdditionNotificationDTO productAdditionDTO) {
        NotificationResponseDTO notification = notificationService.createProductAdditionNotification(productAdditionDTO);
        return ResponseEntity.ok(notification);
    }

    /**
     * Créer une notification générique
     */
    @PostMapping
    public ResponseEntity<NotificationResponseDTO> createNotification(
            @RequestBody NotificationRequestDTO requestDTO) {
        NotificationResponseDTO notification = notificationService.createNotification(requestDTO);
        return ResponseEntity.ok(notification);
    }

    /**
     * Récupérer toutes les notifications d'un utilisateur
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<NotificationResponseDTO>> getUserNotifications(
            @PathVariable Long userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<NotificationResponseDTO> notifications = notificationService.getUserNotifications(userId, pageable);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Récupérer les notifications non lues d'un utilisateur
     */
    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<List<NotificationResponseDTO>> getUnreadNotifications(@PathVariable Long userId) {
        List<NotificationResponseDTO> notifications = notificationService.getUnreadNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Récupérer le nombre de notifications non lues
     */
    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long userId) {
        long count = notificationService.getUnreadCount(userId);
        Map<String, Long> response = new HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    /**
     * Marquer une notification comme lue
     */
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok().build();
    }

    /**
     * Marquer toutes les notifications comme lues
     */
    @PutMapping("/user/{userId}/read-all")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Traiter une action sur une notification (accepter/rejeter)
     */
    @PostMapping("/{notificationId}/action")
    public ResponseEntity<Void> handleNotificationAction(
            @PathVariable Long notificationId,
            @RequestBody NotificationActionDTO actionDTO) {
        actionDTO.setNotificationId(notificationId);
        notificationService.handleNotificationAction(actionDTO);
        return ResponseEntity.ok().build();
    }

    /**
     * Supprimer une notification
     */
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long notificationId) {
        notificationService.deleteNotification(notificationId);
        return ResponseEntity.ok().build();
    }

    /**
     * Récupérer une notification par son ID
     */
    @GetMapping("/{notificationId}")
    public ResponseEntity<NotificationResponseDTO> getNotificationById(@PathVariable Long notificationId) {
        NotificationResponseDTO notification = notificationService.getNotificationById(notificationId);
        return ResponseEntity.ok(notification);
    }

    /**
     * Récupérer les notifications par produit
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<NotificationResponseDTO>> getNotificationsByProduct(@PathVariable Long productId) {
        List<NotificationResponseDTO> notifications = notificationService.getNotificationsByProduct(productId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Récupérer les notifications par entité cible
     */
    @GetMapping("/target")
    public ResponseEntity<List<NotificationResponseDTO>> getNotificationsByTargetEntity(
            @RequestParam String entityType,
            @RequestParam Long entityId) {
        List<NotificationResponseDTO> notifications = notificationService.getNotificationsByTargetEntity(entityType, entityId);
        return ResponseEntity.ok(notifications);
    }
}