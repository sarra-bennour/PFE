package com.tunisia.commerce.dto.notification;

import com.tunisia.commerce.enums.NotificationAction;
import com.tunisia.commerce.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationRequestDTO {
    private Long senderId;
    private Long receiverId;
    private String title;
    private NotificationType notificationType;
    private NotificationAction action;
    private String targetEntityType;
    private Long targetEntityId;
}