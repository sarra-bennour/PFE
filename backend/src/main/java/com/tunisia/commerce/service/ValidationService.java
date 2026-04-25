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

    long countPendingDemandesByInstance(Long instanceId);
    List<DemandeEnregistrementDTO> getDemandesByInstance(Long instanceId, String type, String status);
}