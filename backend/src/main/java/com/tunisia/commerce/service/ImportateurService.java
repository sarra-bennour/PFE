package com.tunisia.commerce.service;

import com.tunisia.commerce.dto.user.UserDTO;

import java.util.List;

public interface ImportateurService {

    /**
     * Recherche des exportateurs validés par critères
     * @param searchTerm terme de recherche (pays, nom entreprise, produit, code NGP)
     * @return liste des exportateurs validés correspondant aux critères
     */
    List<UserDTO> rechercherExportateursValides(String searchTerm);

    /**
     * Recherche des exportateurs validés par pays d'origine
     * @param pays pays d'origine
     * @return liste des exportateurs validés du pays spécifié
     */
    List<UserDTO> rechercherParPays(String pays);

    /**
     * Recherche des exportateurs validés par raison sociale
     * @param raisonSociale nom de l'entreprise
     * @return liste des exportateurs validés correspondant au nom
     */
    List<UserDTO> rechercherParRaisonSociale(String raisonSociale);

    /**
     * Recherche des exportateurs validés par produit
     * @param produit nom du produit
     * @return liste des exportateurs validés proposant ce produit
     */
    List<UserDTO> rechercherParProduit(String produit);

    /**
     * Recherche des exportateurs validés par code NGP
     * @param codeNGP code NGP du produit
     * @return liste des exportateurs validés proposant des produits avec ce code NGP
     */
    List<UserDTO> rechercherParCodeNGP(String codeNGP);

    /**
     * Récupère les détails d'un exportateur validé par son ID
     * @param exportateurId ID de l'exportateur
     * @return détails de l'exportateur
     */
    UserDTO getExportateurValideById(Long exportateurId);

    /**
     * Liste tous les exportateurs validés
     * @return liste de tous les exportateurs validés
     */
    List<UserDTO> getAllExportateursValides();
}