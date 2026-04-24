package com.tunisia.commerce.dto.user;

import com.tunisia.commerce.dto.produits.ProduitDTO;
import com.tunisia.commerce.enums.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class UserDTO {
    private Long id;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private UserRole role;
    private UserStatus statut;
    private LocalDateTime dateCreation;
    private LocalDateTime lastLogin;
    private boolean emailVerified;

    // Champs spécifiques aux exportateurs
    private String companyName;
    private String country;
    private boolean isTwoFactorEnabled;
    private String paysOrigine;
    private String raisonSociale;
    private String numeroRegistreCommerce;
    private String adresseLegale;
    private String ville;
    private String siteWeb;
    private String representantLegal;
    private String numeroTVA;
    private StatutAgrement statutAgrement;
    private String numeroAgrement;
    private LocalDate dateAgrement;
    private int documentsCount;

    private String username;
    private String numeroOfficielEnregistrement;
    private SiteType siteType;
    private String representantRole;
    private String representantEmail;
    private Double capaciteAnnuelle;
    private boolean preKycCompleted;
    private LocalDateTime preKycCompletedAt;

    // Champs spécifiques aux importateurs
    private String mobileIdMatricule;
    private String mobileIdPin;

    // Champs spécifiques aux instances de validation

    private String poste;
    private Integer slaTraitementJours;
    private String verificationToken;
    private LocalDateTime verificationTokenExpiry;
    private LocalDateTime updatedAt;

    private List<ProduitDTO> produits;

    private Long structureId;
    private String structureName;
    private String structureCode;
    private StructureType structureType;

}