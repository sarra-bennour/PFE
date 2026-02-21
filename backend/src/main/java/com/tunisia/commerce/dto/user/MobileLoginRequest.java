package com.tunisia.commerce.dto.user;

import lombok.Data;

@Data
public class MobileLoginRequest {
    private String matricule;
    private String pin;
}