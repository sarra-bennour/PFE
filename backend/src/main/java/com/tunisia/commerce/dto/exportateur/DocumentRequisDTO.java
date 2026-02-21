package com.tunisia.commerce.dto.exportateur;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DocumentRequisDTO {
    private String type;
    private String libelle;
    private boolean obligatoire;
    private String description;
}
