package com.tunisia.commerce.dto.user;

import lombok.Data;

@Data
public class PasswordResetRequest {
    private String token;
    private String newPassword;
}