package com.tunisia.commerce.dto.admin;

import com.tunisia.commerce.enums.DocumentStatus;
import com.tunisia.commerce.enums.DocumentType;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class DocumentAdminDTO {
    private Long id;
    private String name;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private String filePath;
    private DocumentType documentType;
    private DocumentStatus status;
    private LocalDateTime uploadedAt;
    private LocalDateTime validatedAt;
    private String validationComment;
    private String validatedByName;
}