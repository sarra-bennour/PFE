package com.tunisia.commerce.dto.validation;

import com.tunisia.commerce.enums.DocumentType;
import com.tunisia.commerce.enums.DocumentStatus;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDTO {
    private Long id;
    private String fileName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    private DocumentType documentType;
    private DocumentStatus status;
    private String validationComment;
    private LocalDateTime uploadedAt;
    private LocalDateTime validatedAt;
    private String validatedBy;
    private String downloadUrl;
}
