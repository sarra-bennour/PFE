package com.tunisia.commerce.dto.user;

import lombok.Data;

@Data
public class DeactivationRequestDto {
    private String reason;
    private boolean urgent;
}