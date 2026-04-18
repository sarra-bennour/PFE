package com.tunisia.commerce.service;

import com.tunisia.commerce.dto.produits.DemandeEnregistrementDTO;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.dto.validation.ValidationSummaryDTO;
import com.tunisia.commerce.entity.Document;

import java.util.List;

public interface ValidationService {

    /**
     * Récupérer toutes les demandes avec filtres
     */
    List<DemandeEnregistrementDTO> getAllDemandes(String type, String status);

    /**
     * Récupérer les demandes par préfixe de référence (DOS-, DEM-, IMP-)
     */
    //List<DemandeEnregistrementDTO> getDemandesByReferencePrefix(String prefix, String status);

    /**
     * Récupérer une demande par son ID
     */
    //DemandeEnregistrementDTO getDemandeById(Long id);

    /**
     * Approuver une demande
     */
    DemandeEnregistrementDTO approveDemande(Long demandeId, Long agentId, String comment);

    /**
     * Rejeter une demande
     */
    DemandeEnregistrementDTO rejectDemande(Long demandeId, Long agentId, String reason);

    /**
     * Demander plus d'informations
     */
    DemandeEnregistrementDTO requestMoreInfo(Long demandeId, Long agentId, String comment);

    /**
     * Valider un document individuel
     */
    Document validateDocument(Long documentId, Long agentId, String status, String comment);

    /**
     * Récupérer les statistiques de validation
     */
    //ValidationSummaryDTO getValidationSummary();

    /**
     * Récupérer le fichier d'un document
     */
    //org.springframework.core.io.Resource getDocumentFile(Long documentId, Long agentId);

    /**
     * Récupérer les informations d'un document
     */
    //DocumentDTO getDocumentDTOById(Long documentId, Long agentId);
}