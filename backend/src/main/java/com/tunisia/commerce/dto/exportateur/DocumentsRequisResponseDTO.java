package com.tunisia.commerce.dto.exportateur;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class DocumentsRequisResponseDTO {
    private List<DocumentRequisDTO> documents;
}
