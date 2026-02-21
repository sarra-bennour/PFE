package com.tunisia.commerce.dto.exportateur;

import com.tunisia.commerce.entity.ExportateurEtranger;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ExportateurInfoDTO {
    private Long id;
    private String nom;
    private String prenom;
    private String email;
    private String raisonSociale;
    private String paysOrigine;
    private String telephone;
    private String statutAgrement;

    public static ExportateurInfoDTO fromEntity(ExportateurEtranger exportateur) {
        if (exportateur == null) return null;

        return ExportateurInfoDTO.builder()
                .id(exportateur.getId())
                .nom(exportateur.getNom())
                .prenom(exportateur.getPrenom())
                .email(exportateur.getEmail())
                .raisonSociale(exportateur.getRaisonSociale())
                .paysOrigine(exportateur.getPaysOrigine())
                .telephone(exportateur.getTelephone())
                .statutAgrement(exportateur.getStatutAgrement() != null ?
                        exportateur.getStatutAgrement().name() : null)
                .build();
    }
}
