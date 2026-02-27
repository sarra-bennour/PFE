package com.tunisia.commerce.dto.exportateur;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DossierResponseDTO {
    private boolean success;
    private String message;
    private LocalDateTime timestamp;

    // Statut du dossier
    private boolean hasDossier;
    private Long demandeId;
    private String status;
    private String reference;
    private LocalDateTime submittedAt;

    // Informations
    private boolean requiresCompletion;
    private List<String> prochainesEtapes;
    private ExportateurInfoDTO exportateurInfo;
    private int documentsCount;
    private int declarationsCount;

    /// ✅ Méthode utilitaire pour créer une réponse d'erreur (optionnelle)
    public static DossierResponseDTO error(String message) {
        return DossierResponseDTO.builder()
                .success(false)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    // ✅ Méthode utilitaire pour créer une réponse de succès (optionnelle)
    public static DossierResponseDTO success(String message, Object... data) {
        return DossierResponseDTO.builder()
                .success(true)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
