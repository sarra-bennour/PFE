package com.tunisia.commerce.dto.user;

import com.tunisia.commerce.enums.StatutAgrement;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.enums.UserStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    // Champs spécifiques aux importateurs
    private String mobileIdMatricule;
    private String mobileIdPin;


}