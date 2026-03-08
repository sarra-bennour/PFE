package com.tunisia.commerce.dto.user;

import com.tunisia.commerce.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorVerifyResponse {
    private boolean success;
    private String token;
    private String email;
    private UserRole role;
    private String message;
}