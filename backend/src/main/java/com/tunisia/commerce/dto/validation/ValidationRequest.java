package com.tunisia.commerce.dto.validation;


import lombok.Data;

@Data
public class ValidationRequest {
    private String comment;
    private boolean valide;  // true = valider, false = rejeter
}
