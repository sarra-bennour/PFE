package com.tunisia.commerce.dto.user;

import lombok.Data;

@Data
public class TwoFactorVerifyRequest {
    private String email;
    private String code;
}