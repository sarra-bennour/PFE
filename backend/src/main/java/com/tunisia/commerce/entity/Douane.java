package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "douane")
@DiscriminatorValue("DOUANE")
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Douane extends User {

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "poste", length = 255)
    private String poste;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_id", nullable = false)
    private StructureInterne structure;

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
        setRole(UserRole.DOUANE);
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}