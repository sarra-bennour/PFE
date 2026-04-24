package com.tunisia.commerce.dto.user;

import com.tunisia.commerce.dto.structure.StructureInterneDTO;
import com.tunisia.commerce.enums.SiteType;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    // Champs communs
    private String telephone;
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
    private StructureInterneDTO structureInterne;
    private String poste;
    private Integer slaTraitementJours;
}