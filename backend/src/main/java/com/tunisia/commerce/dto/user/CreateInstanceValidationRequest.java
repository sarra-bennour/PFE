package com.tunisia.commerce.dto.user;

import com.tunisia.commerce.dto.structure.StructureInterneDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInstanceValidationRequest {
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private StructureInterneDTO structure;
    private Integer slaTraitementJours;
}