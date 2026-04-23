package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.InstanceValidationType;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "instances_validation")
@DiscriminatorValue("INSTANCE_VALIDATION")
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class InstanceValidation extends User {

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_id", nullable = false)
    private StructureInterne structure;

    @Column(name = "sla_traitement_jours", nullable = false)
    private Integer slaTraitementJours;

    @Column(name = "email_verified")
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "verification_token")
    private String verificationToken;

    @Column(name = "verification_token_expiry")
    private LocalDateTime verificationTokenExpiry;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "reset_password_token", length = 64)
    private String resetPasswordToken;

    @Column(name = "reset_password_token_expiry")
    private LocalDateTime resetPasswordTokenExpiry;
    @Column(name = "last_password_change")
    private LocalDateTime lastPasswordChange;

    @PostLoad
    protected void onLoad() {
        setRole(UserRole.INSTANCE_VALIDATION);
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}