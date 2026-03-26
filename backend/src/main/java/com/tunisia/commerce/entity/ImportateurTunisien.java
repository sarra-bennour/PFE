package com.tunisia.commerce.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;


@Entity
@Table(name = "importateurs")
@DiscriminatorValue("IMPORTATEUR")
@Data
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
public class ImportateurTunisien extends User {

    /*@Column(name = "numero_registre_commerce_tn", nullable = false, unique = true)
    private String numeroRegistreCommerceTN;

    @Column(name = "adresse_entreprise", nullable = false)
    private String adresseEntreprise;

    @Column(name = "matricule_fiscale", nullable = false, unique = true)
    private String matriculeFiscale;*/

    @Column(name = "is_mobile_id_verified")
    @Builder.Default
    private boolean isMobileIdVerified = false;

    @Column(name = "mobile_id_matricule")
    private String mobileIdMatricule;

    @Column(name = "mobile_id_pin")
    private String mobileIdPin;

    @OneToMany(mappedBy = "importateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<DemandeEnregistrement> demandes = new ArrayList<>();
}