package com.tunisia.commerce.dto.exportateur;

import com.tunisia.commerce.enums.SiteType;
import lombok.Data;

@Data
public class PreKycRequest {
    private String username;
    private String numeroOfficielEnregistrement;
    private SiteType siteType;
    private String representantRole;
    private String representantEmail;
    private Double capaciteAnnuelle;
    private String numeroTVA;
}