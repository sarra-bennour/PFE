package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "poste", length = 255)
    private String poste;

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

    @OneToMany(mappedBy = "instance", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DemandeValidateur> demandesAValider = new ArrayList<>();

    @PostLoad
    protected void onLoad() {
        setRole(UserRole.INSTANCE_VALIDATION);
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}