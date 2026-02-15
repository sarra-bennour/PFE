package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.NiveauAccesAdmin;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "administrateurs")
@DiscriminatorValue("ADMIN")
@Data
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
public class Administrateur extends User {

    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "niveau_acces")
    @Builder.Default
    private NiveauAccesAdmin niveauAcces = NiveauAccesAdmin.SUPER_ADMIN;

    @Column(name = "is_super_admin")
    @Builder.Default
    private boolean isSuperAdmin = false;
}