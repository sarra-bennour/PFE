package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.ValidationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "demande_validateur",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_demande_instance", columnNames = {"demande_id", "instance_id"})
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandeValidateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ===== RELATIONS =====
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demande_id", nullable = false)
    @ToString.Exclude
    private DemandeEnregistrement demande;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instance_id", nullable = false)
    private InstanceValidation instance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_id", nullable = false)
    private StructureInterne structure;

    // ===== STATUT ET VALIDATION =====
    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false)
    @Builder.Default
    private ValidationStatus validationStatus = ValidationStatus.EN_ATTENTE;

    @Column(name = "validation_comment", columnDefinition = "TEXT")
    private String validationComment;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    // ===== WORKFLOW =====
    @Column(name = "validation_order")
    private Integer validationOrder;

    @Column(name = "is_mandatory", nullable = false)
    @Builder.Default
    private Boolean isMandatory = true;

    // ===== GESTION DES DÉLAIS =====
    @Column(name = "deadline")
    private LocalDateTime deadline;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @Column(name = "reminder_count")
    @Builder.Default
    private Integer reminderCount = 0;

    @Column(name = "last_reminder_at")
    private LocalDateTime lastReminderAt;

    // ===== INFORMATIONS SUPPLÉMENTAIRES =====
    @Column(name = "categories_to_validate", columnDefinition = "TEXT")
    private String categoriesToValidate;

    @Column(name = "is_completed")
    @Builder.Default
    private Boolean isCompleted = false;

    @Column(name = "validation_duration_hours")
    private Double validationDurationHours;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ===== MÉTHODES UTILITAIRES =====

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public void approve(String comment) {
        this.validationStatus = ValidationStatus.VALIDEE;
        this.validationComment = comment;
        this.validatedAt = LocalDateTime.now();
        this.isCompleted = true;
        if (this.notifiedAt != null) {
            this.validationDurationHours = (double) java.time.Duration.between(this.notifiedAt, this.validatedAt).toHours();
        }
    }

    public void reject(String comment) {
        this.validationStatus = ValidationStatus.REJETEE;
        this.validationComment = comment;
        this.validatedAt = LocalDateTime.now();
        this.isCompleted = true;
    }

    public boolean isOverdue() {
        if (this.deadline == null) return false;
        if (this.validationStatus != ValidationStatus.EN_ATTENTE) return false;
        return LocalDateTime.now().isAfter(this.deadline);
    }

    public void incrementReminder() {
        this.reminderCount++;
        this.lastReminderAt = LocalDateTime.now();
    }
}