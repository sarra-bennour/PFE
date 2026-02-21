package com.tunisia.commerce.dto.validation;

import lombok.Data;

@Data
public class DecisionRequest {
    private boolean approuve;  // true = approuver, false = rejeter
    private String comment;
}
