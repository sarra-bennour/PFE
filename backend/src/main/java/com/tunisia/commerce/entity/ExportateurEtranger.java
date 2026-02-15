package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.StatutAgrement;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "exportateurs")
@DiscriminatorValue("EXPORTATEUR")
@Data
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
public class ExportateurEtranger extends User {

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "pays_origine", nullable = false)
    private String paysOrigine;

    @Column(name = "raison_sociale", nullable = false)
    private String raisonSociale;

    @Column(name = "numero_registre_commerce", nullable = false, unique = true)
    private String numeroRegistreCommerce;

    @Column(name = "adresse_legale", nullable = false)
    private String adresseLegale;

    @Column(nullable = false)
    private String ville;

    @Column(name = "site_web")
    private String siteWeb;

    @Column(name = "representant_legal")
    private String representantLegal;

    @Column(name = "numero_tva")
    private String numeroTVA;

    /*@OneToMany(mappedBy = "exportateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Document> documents = new ArrayList<>();*/

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_agrement")
    @Builder.Default
    private StatutAgrement statutAgrement = StatutAgrement.EN_ATTENTE;

    @Column(name = "numero_agrement", unique = true)
    private String numeroAgrement;

    @Column(name = "date_agrement")
    private LocalDate dateAgrement;

    @Column(name = "is_two_factor_enabled")
    @Builder.Default
    private boolean isTwoFactorEnabled = false;

    @Column(name = "two_factor_secret")
    private String twoFactorSecret;

    @Column(name = "is_email_verified")
    @Builder.Default
    private boolean isEmailVerified = false;

    @Column(name = "verification_token", length = 64)
    private String verificationToken;

    @Column(name = "verification_token_expiry")
    private LocalDateTime verificationTokenExpiry;

    @Column(name = "reset_password_token", length = 64)
    private String resetPasswordToken;

    @Column(name = "reset_password_token_expiry")
    private LocalDateTime resetPasswordTokenExpiry;
    @Column(name = "last_password_change")
    private LocalDateTime lastPasswordChange;
}
