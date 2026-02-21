package com.tunisia.commerce.dto.exportateur;

import com.tunisia.commerce.dto.produits.ProduitDTO;
import lombok.Data;
import java.util.List;

@Data
public class CreerDossierRequest {
    private String raisonSociale;
    private String adresseLegale;
    private String ville;
    private String paysOrigine;
    private String telephone;
    private String siteWeb;
    private String representantLegal;
    private String numeroRegistreCommerce;
    private String numeroTVA;

    // Informations produits (optionnel)
    private List<ProduitDTO> produits;
}
