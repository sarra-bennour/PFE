package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.notification.*;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.NotificationAction;
import com.tunisia.commerce.enums.NotificationStatus;
import com.tunisia.commerce.enums.NotificationType;
import com.tunisia.commerce.repository.NotificationRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    public NotificationResponseDTO createProductAdditionNotification(ProductAdditionNotificationDTO productAdditionDTO) {
        log.info("Création d'une notification pour l'ajout de produit: {}", productAdditionDTO);

        // Vérifier si une notification similaire existe déjà pour éviter les doublons
        boolean exists = notificationRepository.existsBySenderIdAndReceiverIdAndTargetEntityTypeAndTargetEntityIdAndNotificationType(
                productAdditionDTO.getImporterId(),
                productAdditionDTO.getExporterId(),
                "PRODUCT",
                productAdditionDTO.getProductId(),
                NotificationType.ACTION
        );

        if (exists) {
            log.warn("Une notification similaire existe déjà pour ce produit");
            // Récupérer la notification existante
            List<Notification> existingNotifications = notificationRepository.findBySenderAndReceiverAndProduct(
                    productAdditionDTO.getImporterId(),
                    productAdditionDTO.getExporterId(),
                    productAdditionDTO.getProductId()
            );
            if (!existingNotifications.isEmpty()) {
                return NotificationResponseDTO.fromEntity(existingNotifications.get(0));
            }
        }

        // Récupérer les utilisateurs
        User importer = userRepository.findById(productAdditionDTO.getImporterId())
                .orElseThrow(() -> new RuntimeException("Importateur non trouvé avec ID: " + productAdditionDTO.getImporterId()));

        User exporter = userRepository.findById(productAdditionDTO.getExporterId())
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé avec ID: " + productAdditionDTO.getExporterId()));

        // Construire le titre avec les informations du produit
        String title = String.format("Demande d'ajout de produit: %s", productAdditionDTO.getProductName());

        // Créer la notification
        Notification notification = Notification.builder()
                .sender(importer)
                .receiver(exporter)
                .title(title)
                .notificationType(NotificationType.ACTION)
                .status(NotificationStatus.NON_LU)
                .action(NotificationAction.PENDING)
                .targetEntityType("PRODUCT")
                .targetEntityId(productAdditionDTO.getProductId())
                .isEmailSent(false)
                .isSmsSent(false)
                .build();

        Notification savedNotification = notificationRepository.save(notification);
        log.info("Notification créée avec succès: ID {}", savedNotification.getId());

        return NotificationResponseDTO.fromEntity(savedNotification);
    }

    @Override
    public NotificationResponseDTO createNotification(NotificationRequestDTO requestDTO) {
        log.info("Création d'une notification générique");

        User sender = requestDTO.getSenderId() != null ?
                userRepository.findById(requestDTO.getSenderId())
                        .orElseThrow(() -> new RuntimeException("Expéditeur non trouvé")) : null;

        User receiver = userRepository.findById(requestDTO.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Destinataire non trouvé"));

        Notification notification = Notification.builder()
                .sender(sender)
                .receiver(receiver)
                .title(requestDTO.getTitle())
                .notificationType(requestDTO.getNotificationType())
                .status(NotificationStatus.NON_LU)
                .action(requestDTO.getAction())
                .targetEntityType(requestDTO.getTargetEntityType())
                .targetEntityId(requestDTO.getTargetEntityId())
                .isEmailSent(false)
                .isSmsSent(false)
                .build();

        Notification savedNotification = notificationRepository.save(notification);
        log.info("Notification créée avec succès: ID {}", savedNotification.getId());

        return NotificationResponseDTO.fromEntity(savedNotification);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponseDTO> getUserNotifications(Long userId, Pageable pageable) {
        log.debug("Récupération des notifications pour l'utilisateur: {}", userId);

        // Vérifier que l'utilisateur existe
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("Utilisateur non trouvé avec ID: " + userId);
        }

        return notificationRepository.findByReceiverIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationResponseDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponseDTO> getUnreadNotifications(Long userId) {
        log.debug("Récupération des notifications non lues pour l'utilisateur: {}", userId);

        // Vérifier que l'utilisateur existe
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("Utilisateur non trouvé avec ID: " + userId);
        }

        return notificationRepository.findUnreadByReceiverId(userId, NotificationStatus.NON_LU)
                .stream()
                .map(NotificationResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        // Vérifier que l'utilisateur existe
        if (!userRepository.existsById(userId)) {
            return 0;
        }
        return notificationRepository.countByReceiverIdAndStatus(userId, NotificationStatus.NON_LU);
    }

    @Override
    public void markAsRead(Long notificationId) {
        log.info("Marquage de la notification comme lue: {}", notificationId);

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification non trouvée avec ID: " + notificationId));

        notification.setStatus(NotificationStatus.LU);
        notification.setReadAt(LocalDateTime.now());

        notificationRepository.save(notification);
        log.info("Notification {} marquée comme lue", notificationId);
    }

    @Override
    public void markAllAsRead(Long userId) {
        log.info("Marquage de toutes les notifications comme lues pour l'utilisateur: {}", userId);

        // Vérifier que l'utilisateur existe
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("Utilisateur non trouvé avec ID: " + userId);
        }

        notificationRepository.markAllAsRead(
                userId,
                NotificationStatus.LU,
                LocalDateTime.now(),
                NotificationStatus.NON_LU
        );
        log.info("Toutes les notifications de l'utilisateur {} ont été marquées comme lues", userId);
    }

    @Override
    public void handleNotificationAction(NotificationActionDTO actionDTO) {
        log.info("Traitement de l'action pour la notification: {}, action: {}",
                actionDTO.getNotificationId(), actionDTO.getAction());

        Notification notification = notificationRepository.findById(actionDTO.getNotificationId())
                .orElseThrow(() -> new RuntimeException("Notification non trouvée avec ID: " + actionDTO.getNotificationId()));

        // Vérifier que c'est bien une notification d'action
        if (notification.getNotificationType() != NotificationType.ACTION) {
            throw new IllegalStateException("Cette notification n'est pas de type action");
        }

        // Vérifier que l'action est encore en attente
        if (notification.getAction() != NotificationAction.PENDING) {
            throw new IllegalStateException("Cette notification a déjà été traitée");
        }

        if (actionDTO.getAction() == NotificationAction.ACCEPT) {
            // Traiter l'acceptation
            log.info("Acceptation de la demande pour le produit ID: {}", notification.getTargetEntityId());
            // Ici, vous pouvez appeler d'autres services pour traiter l'acceptation

            // Créer une notification de confirmation pour l'importateur
            createConfirmationNotification(notification, true, actionDTO.getComment());

        } else if (actionDTO.getAction() == NotificationAction.REJECT) {
            // Traiter le rejet
            log.info("Rejet de la demande pour le produit ID: {}", notification.getTargetEntityId());
            // Ici, vous pouvez appeler d'autres services pour traiter le rejet

            // Créer une notification de rejet pour l'importateur
            createConfirmationNotification(notification, false, actionDTO.getComment());

        } else {
            throw new IllegalArgumentException("Action non reconnue: " + actionDTO.getAction());
        }

        // Mettre à jour l'action de la notification
        notification.setAction(actionDTO.getAction());
        notification.setStatus(NotificationStatus.LU);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);

        log.info("Notification {} traitée avec succès", actionDTO.getNotificationId());
    }

    private void createConfirmationNotification(Notification originalNotification, boolean accepted, String comment) {
        User importer = originalNotification.getSender();
        User exporter = originalNotification.getReceiver();

        String title = accepted ? "Demande de produit acceptée" : "Demande de produit refusée";
        String productName = extractProductNameFromTitle(originalNotification.getTitle());

        String exporterName = getExporterName(exporter);

        String message = accepted ?
                String.format("%s a accepté votre demande d'ajout du produit \"%s\"",
                        exporterName, productName) :
                String.format("%s a refusé votre demande d'ajout du produit \"%s\"%s",
                        exporterName, productName,
                        comment != null && !comment.isEmpty() ? " avec le commentaire: " + comment : "");

        // Utiliser NotificationType.ACTION au lieu de SUCCESS/WARNING
        Notification confirmationNotification = Notification.builder()
                .sender(exporter)
                .receiver(importer)
                .title(title)
                .notificationType(NotificationType.ACTION)
                .status(NotificationStatus.NON_LU)
                .action(accepted ? NotificationAction.ACCEPT : NotificationAction.REJECT)
                .targetEntityType("PRODUCT_ADDITION_RESPONSE")
                .targetEntityId(originalNotification.getId())
                .isEmailSent(false)
                .isSmsSent(false)
                .build();

        notificationRepository.save(confirmationNotification);
        log.info("Notification de confirmation créée pour l'importateur {}", importer.getId());
    }

    private String getExporterName(User exporter) {
        if (exporter instanceof ExportateurEtranger) {
            ExportateurEtranger exportateur = (ExportateurEtranger) exporter;
            return exportateur.getRaisonSociale() != null ? exportateur.getRaisonSociale() :
                    (exportateur.getNom() + " " + exportateur.getPrenom());
        } else if (exporter instanceof ImportateurTunisien) {
            return exporter.getNom() + " " + exporter.getPrenom();
        } else {
            return exporter.getNom() + " " + exporter.getPrenom();
        }
    }

    private String extractProductNameFromTitle(String title) {
        // Extraire le nom du produit du titre: "Demande d'ajout de produit: Nom du produit"
        if (title != null && title.contains(": ")) {
            return title.substring(title.indexOf(": ") + 2);
        }
        return "le produit";
    }

    @Override
    public void deleteNotification(Long notificationId) {
        log.info("Suppression de la notification: {}", notificationId);

        if (!notificationRepository.existsById(notificationId)) {
            throw new RuntimeException("Notification non trouvée avec ID: " + notificationId);
        }

        notificationRepository.deleteById(notificationId);
        log.info("Notification {} supprimée", notificationId);
    }

    @Override
    public void archiveOldNotifications(int daysOld) {
        log.info("Archivage des notifications plus anciennes que {} jours", daysOld);

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysOld);
        int deletedCount = notificationRepository.deleteByCreatedAtBefore(cutoffDate);
        log.info("{} notifications ont été archivées", deletedCount);
    }

    @Override
    @Transactional
    public void sendPendingEmailNotifications() {
        log.info("Envoi des notifications par email en attente");

        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Notification> pendingNotifications = notificationRepository.findPendingEmailNotifications(since);

        int sentCount = 0;
        for (Notification notification : pendingNotifications) {
            try {
                // Ici, vous appelleriez votre service d'email
                // emailService.sendNotificationEmail(notification);

                notification.setEmailSent(true);
                notification.setEmailSentAt(LocalDateTime.now());
                notificationRepository.save(notification);
                sentCount++;

                log.debug("Email envoyé pour la notification: {}", notification.getId());
            } catch (Exception e) {
                log.error("Erreur lors de l'envoi de l'email pour la notification: {}", notification.getId(), e);
            }
        }

        log.info("{} emails ont été envoyés", sentCount);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationResponseDTO getNotificationById(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification non trouvée avec ID: " + notificationId));

        return NotificationResponseDTO.fromEntity(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponseDTO> getNotificationsByTargetEntity(String entityType, Long entityId) {
        log.debug("Récupération des notifications pour l'entité: {} - {}", entityType, entityId);

        return notificationRepository.findByTargetEntityTypeAndTargetEntityId(entityType, entityId)
                .stream()
                .map(NotificationResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public void updateNotificationAction(Long notificationId, NotificationAction action) {
        log.info("Mise à jour de l'action de la notification: {} -> {}", notificationId, action);

        if (!notificationRepository.existsById(notificationId)) {
            throw new RuntimeException("Notification non trouvée avec ID: " + notificationId);
        }

        notificationRepository.updateAction(notificationId, action);
        log.info("Action de la notification {} mise à jour vers {}", notificationId, action);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponseDTO> getNotificationsByProduct(Long productId) {
        log.debug("Récupération des notifications pour le produit: {}", productId);

        return notificationRepository.findByProductId(productId)
                .stream()
                .map(NotificationResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }
}