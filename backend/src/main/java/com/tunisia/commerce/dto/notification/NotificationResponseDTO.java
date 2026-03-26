package com.tunisia.commerce.dto.notification;

import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.NotificationAction;
import com.tunisia.commerce.enums.NotificationStatus;
import com.tunisia.commerce.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponseDTO {
    private Long id;
    private UserDTO sender;
    private UserDTO receiver;
    private String title;
    private NotificationType notificationType;
    private NotificationStatus status;
    private NotificationAction action;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
    private String targetEntityType;
    private Long targetEntityId;
    private boolean isEmailSent;
    private boolean isSmsSent;
    private boolean isUnread;

    public static NotificationResponseDTO fromEntity(Notification notification) {
        if (notification == null) return null;

        return NotificationResponseDTO.builder()
                .id(notification.getId())
                .sender(convertToUserDTO(notification.getSender()))
                .receiver(convertToUserDTO(notification.getReceiver()))
                .title(notification.getTitle())
                .notificationType(notification.getNotificationType())
                .status(notification.getStatus())
                .action(notification.getAction())
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .targetEntityType(notification.getTargetEntityType())
                .targetEntityId(notification.getTargetEntityId())
                .isEmailSent(notification.isEmailSent())
                .isSmsSent(notification.isSmsSent())
                .isUnread(notification.getStatus() == NotificationStatus.NON_LU)
                .build();
    }

    private static UserDTO convertToUserDTO(User user) {
        if (user == null) return null;

        UserDTO dto = new UserDTO();

        // Champs de base de User
        dto.setId(user.getId());
        dto.setNom(user.getNom());
        dto.setPrenom(user.getPrenom());
        dto.setEmail(user.getEmail());
        dto.setTelephone(user.getTelephone());
        dto.setRole(user.getRole());
        dto.setStatut(user.getUserStatut());
        dto.setDateCreation(user.getDateCreation());
        dto.setLastLogin(user.getLastLogin());
        dto.setEmailVerified(false);

        // Vérifier le type d'utilisateur et remplir les champs spécifiques
        if (user instanceof ExportateurEtranger) {
            ExportateurEtranger exportateur = (ExportateurEtranger) user;

            // Champs spécifiques aux exportateurs étrangers
            dto.setCompanyName(exportateur.getRaisonSociale());
            dto.setPaysOrigine(exportateur.getPaysOrigine());
            dto.setRaisonSociale(exportateur.getRaisonSociale());
            dto.setNumeroRegistreCommerce(exportateur.getNumeroRegistreCommerce());
            dto.setAdresseLegale(exportateur.getAdresseLegale());
            dto.setVille(exportateur.getVille());
            dto.setSiteWeb(exportateur.getSiteWeb());
            dto.setRepresentantLegal(exportateur.getRepresentantLegal());
            dto.setNumeroTVA(exportateur.getNumeroTVA());
            dto.setStatutAgrement(exportateur.getStatutAgrement());
            dto.setNumeroAgrement(exportateur.getNumeroAgrement());
            dto.setDateAgrement(exportateur.getDateAgrement());
            dto.setSiteType(exportateur.getSiteType());
            dto.setRepresentantRole(exportateur.getRepresentantRole());
            dto.setRepresentantEmail(exportateur.getRepresentantEmail());
            dto.setEmailVerified(exportateur.isEmailVerified());

        } else if (user instanceof ImportateurTunisien) {
            ImportateurTunisien importateur = (ImportateurTunisien) user;

            // Champs spécifiques aux importateurs tunisiens
            dto.setMobileIdMatricule(importateur.getMobileIdMatricule());
            dto.setMobileIdPin(importateur.getMobileIdPin());

            // Les autres champs restent à null car ils ne sont pas dans ImportateurTunisien
            dto.setPaysOrigine(null);
            dto.setRaisonSociale(null);
            dto.setNumeroRegistreCommerce(null);
            dto.setAdresseLegale(null);
            dto.setVille(null);
            dto.setSiteWeb(null);
            dto.setRepresentantLegal(null);
            dto.setNumeroTVA(null);
            dto.setStatutAgrement(null);
            dto.setNumeroAgrement(null);
            dto.setDateAgrement(null);
            dto.setSiteType(null);
            dto.setRepresentantRole(null);
            dto.setRepresentantEmail(null);

        } else {
            // Pour les autres types d'utilisateurs (ADMIN, VALIDATOR, etc.)
            dto.setPaysOrigine(null);
            dto.setRaisonSociale(null);
            dto.setNumeroRegistreCommerce(null);
            dto.setAdresseLegale(null);
            dto.setVille(null);
            dto.setSiteWeb(null);
            dto.setRepresentantLegal(null);
            dto.setNumeroTVA(null);
            dto.setStatutAgrement(null);
            dto.setNumeroAgrement(null);
            dto.setDateAgrement(null);
            dto.setSiteType(null);
            dto.setRepresentantRole(null);
            dto.setRepresentantEmail(null);
            dto.setMobileIdMatricule(null);
            dto.setMobileIdPin(null);
        }

        return dto;
    }
}