package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.notification.*;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import com.tunisia.commerce.service.NotificationService;
import com.tunisia.commerce.service.impl.AuditService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final AuditService auditService;

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            ip = "127.0.0.1";
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    /**
     * Créer une notification pour l'ajout de produit
     */
    @PostMapping("/product-addition")
    public ResponseEntity<NotificationResponseDTO> createProductAdditionNotification(
            @RequestBody ProductAdditionNotificationDTO productAdditionDTO,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);

        try {
            NotificationResponseDTO notification = notificationService.createProductAdditionNotification(productAdditionDTO);

            // AUDIT: Création notification ajout produit
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("NOTIFICATION_PRODUCT_ADDITION")
                            .actionType(ActionType.CREATION)
                            .description("Création d'une notification d'ajout de produit")
                            .entity(EntityType.NOTIFICATION, notification.getId(), null)
                            .user(productAdditionDTO.getImporterId(), productAdditionDTO.getImporterName(), "IMPORTATEUR")
                            .success()
                            .detail("importer_id", productAdditionDTO.getImporterId())
                            .detail("exporter_id", productAdditionDTO.getExporterId())
                            .detail("product_id", productAdditionDTO.getProductId())
                            .detail("product_name", productAdditionDTO.getProductName())
                            .detail("declaration_id", productAdditionDTO.getDeclarationId())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok(notification);

        } catch (Exception e) {
            // AUDIT: Échec création notification
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("NOTIFICATION_PRODUCT_ADDITION")
                            .actionType(ActionType.CREATION)
                            .description("Échec création notification d'ajout de produit")
                            .user(productAdditionDTO.getImporterId(), productAdditionDTO.getImporterName(), "IMPORTATEUR")
                            .failure(e.getMessage())
                            .detail("product_id", productAdditionDTO.getProductId())
                            .detail("ip_address", clientIp)
            );

            throw e;
        }
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
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long notificationId,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;

        try {
            // Optionnel: récupérer l'utilisateur connecté pour l'audit
            // user = getCurrentUser();
            // userId = user.getId();
            // userEmail = user.getEmail();

            notificationService.markAsRead(notificationId);

            // AUDIT: Marquer notification comme lue
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("NOTIFICATION_MARK_AS_READ")
                            .actionType(ActionType.MODIFICATION)
                            .description("Marquage d'une notification comme lue")
                            .entity(EntityType.NOTIFICATION, notificationId, null)
                            .user(userId, userEmail, null)
                            .success()
                            .detail("notification_id", notificationId)
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok().build();

        } catch (Exception e) {
            // AUDIT: Échec marquage notification
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("NOTIFICATION_MARK_AS_READ")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec marquage notification comme lue")
                            .entity(EntityType.NOTIFICATION, notificationId, null)
                            .user(userId, userEmail, null)
                            .failure(e.getMessage())
                            .detail("notification_id", notificationId)
                            .detail("ip_address", clientIp)
            );

            throw e;
        }
    }


    /**
     * Traiter une action sur une notification (accepter/rejeter)
     */
    @PostMapping("/{notificationId}/action")
    public ResponseEntity<Void> handleNotificationAction(
            @PathVariable Long notificationId,
            @RequestBody NotificationActionDTO actionDTO,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIp(httpRequest);
        Long userId = null;
        String userEmail = null;
        String userRole = null;

        try {
            // Optionnel: récupérer l'utilisateur connecté pour l'audit
            // user = getCurrentUser();
            // userId = user.getId();
            // userEmail = user.getEmail();
            // userRole = user.getRole();

            actionDTO.setNotificationId(notificationId);
            notificationService.handleNotificationAction(actionDTO);

            // AUDIT: Traitement action notification
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("NOTIFICATION_HANDLE_ACTION")
                            .actionType(ActionType.MODIFICATION)
                            .description("Traitement d'une action sur notification")
                            .entity(EntityType.NOTIFICATION, notificationId, null)
                            .user(userId, userEmail, userRole)
                            .success()
                            .detail("notification_id", notificationId)
                            .detail("action", actionDTO.getAction())
                            .detail("comment", actionDTO.getComment())
                            .detail("ip_address", clientIp)
            );

            return ResponseEntity.ok().build();

        } catch (Exception e) {
            // AUDIT: Échec traitement action notification
            auditService.log(
                    AuditService.AuditLogBuilder.builder()
                            .action("NOTIFICATION_HANDLE_ACTION")
                            .actionType(ActionType.MODIFICATION)
                            .description("Échec traitement action sur notification")
                            .entity(EntityType.NOTIFICATION, notificationId, null)
                            .user(userId, userEmail, userRole)
                            .failure(e.getMessage())
                            .detail("notification_id", notificationId)
                            .detail("action", actionDTO.getAction())
                            .detail("ip_address", clientIp)
            );

            throw e;
        }
    }

}