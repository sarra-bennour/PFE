package com.tunisia.commerce.service;

import com.tunisia.commerce.dto.importateur.ImportateurStatutsDTO;
import com.tunisia.commerce.dto.user.UserDTO;

import java.util.List;
import java.util.Map;

public interface ImportateurService {

    /**
     * Recherche des exportateurs validés par critères
     * @param searchTerm terme de recherche (pays, nom entreprise, produit, code NGP)
     * @return liste des exportateurs validés correspondant aux critères
     */
    List<UserDTO> rechercherExportateursValides(String searchTerm);


    /**
     * Liste tous les exportateurs validés
     * @return liste de tous les exportateurs validés
     */
    List<UserDTO> getAllExportateursValides();

    /**
     * Récupère les statuts des produits pour un importateur
     */
    ImportateurStatutsDTO getProduitsStatuts(Long importateurId);

    byte[] generateRapportPDF(Long importateurId);
    Map<String, Object> getDashboardStats(Long importateurId);

}