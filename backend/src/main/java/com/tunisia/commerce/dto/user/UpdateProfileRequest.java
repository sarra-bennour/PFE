package com.tunisia.commerce.dto.user;

import com.tunisia.commerce.enums.InstanceValidationType;
import com.tunisia.commerce.enums.SiteType;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    // Champs communs
    private String phone;
    private String city;
    private String companyName;
    private String address;
    private String legalRep;
    private String nom;
    private String prenom;

    // Champs exportateur
    private String country;
    private String tinNumber;
    private String website;
    private SiteType siteType;
    private Double capaciteAnnuelle;

    // Champs importateur
    private String matriculeFiscale;
    private String mobileIdMatricule;

    // Champs instance validation
    private String nomOfficiel;
    private String codeMinistere;
    private InstanceValidationType typeAutorite;
    private Integer slaTraitementJours;
}