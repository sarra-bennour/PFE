package com.tunisia.commerce.dto.validation;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationResponseDTO {
    private boolean success;
    private String message;
    private LocalDateTime timestamp;
    private Object data;
}
