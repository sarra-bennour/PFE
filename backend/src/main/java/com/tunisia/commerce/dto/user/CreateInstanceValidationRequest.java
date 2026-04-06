package com.tunisia.commerce.dto.user;

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
    private String nomOfficiel;
    private String codeMinistere;
    private String typeAutorite;
    private Integer slaTraitementJours;
}