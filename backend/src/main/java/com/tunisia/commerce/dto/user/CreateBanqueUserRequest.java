package com.tunisia.commerce.dto.user;

import lombok.Data;

@Data
public class CreateBanqueUserRequest {
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private String poste;
    private StructureDTO structure;

    @Data
    public static class StructureDTO {
        private Long id;
        private String type;
        private String officialName;
        private String officialNameAr;
        private String code;
    }
}
