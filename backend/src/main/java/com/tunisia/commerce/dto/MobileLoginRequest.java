package com.tunisia.commerce.dto;

import lombok.Data;

@Data
public class MobileLoginRequest {
    private String matricule;
    private String pin;
}