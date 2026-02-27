package com.tunisia.commerce.dto.produits;

import com.tunisia.commerce.enums.DocumentType;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentRequestDTO {
    private String fileName;
    private String fileType;
    private Long fileSize;
    private DocumentType documentType;
    private String fileContent; // Base64 encoded file content
}