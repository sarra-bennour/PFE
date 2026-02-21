package com.tunisia.commerce.dto.validation;

import lombok.Data;
import java.util.List;

@Data
public class InfoComplementaireRequest {
    private String message;
    private List<Long> documentsIds;  // IDs des documents à compléter (optionnel)
}
