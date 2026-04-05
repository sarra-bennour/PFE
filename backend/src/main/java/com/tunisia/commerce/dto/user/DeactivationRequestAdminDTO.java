// DeactivationRequestAdminDTO.java
package com.tunisia.commerce.dto.user;

import com.tunisia.commerce.enums.DeactivationRequestType;
import com.tunisia.commerce.enums.DeactivationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeactivationRequestAdminDTO {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String companyName;
    private String reason;
    private String comment;
    private DeactivationRequestType requestType;
    private DeactivationStatus status;
    private LocalDateTime requestDate;
    private boolean isUrgent;
    private boolean notificationSent;
    private LocalDateTime processedDate;
}