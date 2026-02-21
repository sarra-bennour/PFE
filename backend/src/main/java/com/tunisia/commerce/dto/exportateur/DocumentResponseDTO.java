package com.tunisia.commerce.dto.exportateur;

import com.tunisia.commerce.dto.validation.DocumentDTO;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DocumentResponseDTO {
    private boolean success;
    private String message;
    private LocalDateTime timestamp;
    private Long documentId;

    private String fileName;
    private String documentType;
    private String status;
    private Long fileSize;
    private LocalDateTime uploadedAt;

    // Dans DossierResponseDTO.java
    public static DossierResponseDTO error(String message) {
        return DossierResponseDTO.builder()
                .success(false)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
