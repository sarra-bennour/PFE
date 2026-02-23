package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.DeactivationRequestType;
import com.tunisia.commerce.enums.DeactivationStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "deactivation_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeactivationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private ExportateurEtranger user;

    @Column(name = "reason", length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false)
    private DeactivationRequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DeactivationStatus status;

    @Column(name = "request_date", nullable = false)
    private LocalDateTime requestDate;

    @Column(name = "processed_date")
    private LocalDateTime processedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    private User processedBy;

    @Column(name = "admin_comment", length = 500)
    private String adminComment;

    @Column(name = "is_urgent")
    private boolean isUrgent;

    @Column(name = "notification_sent")
    private boolean notificationSent;

    @Column(name = "notification_date")
    private LocalDateTime notificationDate;

    @PrePersist
    protected void onCreate() {
        requestDate = LocalDateTime.now();
        if (status == null) {
            status = DeactivationStatus.PENDING;
        }
    }
}