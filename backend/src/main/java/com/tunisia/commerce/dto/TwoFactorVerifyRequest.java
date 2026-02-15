package com.tunisia.commerce.dto;

import lombok.Data;

@Data
public class TwoFactorVerifyRequest {
    private String email;
    private String code;
}