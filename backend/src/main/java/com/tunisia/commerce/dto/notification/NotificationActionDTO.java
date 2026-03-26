package com.tunisia.commerce.dto.notification;

import com.tunisia.commerce.enums.NotificationAction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationActionDTO {
    private Long notificationId;
    private NotificationAction action;
    private String comment;
}