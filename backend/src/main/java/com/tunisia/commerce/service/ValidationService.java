package com.tunisia.commerce.service;

import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.enums.DemandeStatus;
import java.util.List;

public interface ValidationService {

    List<DemandeEnregistrement> getDemandesAAfficher(Long agentId, DemandeStatus status);
    DemandeEnregistrement assignerDemande(Long demandeId, Long agentId);
    DemandeEnregistrement getDemandeById(Long demandeId);
    void validerDocument(Long documentId, Long agentId, String comment, boolean isValide);
    DemandeEnregistrement prendreDecisionFinale(Long demandeId, Long agentId, boolean isApprouve, String comment);

    void demanderInformationsComplementaires(Long demandeId, Long agentId, String message, List<Long> documentsIds);
}