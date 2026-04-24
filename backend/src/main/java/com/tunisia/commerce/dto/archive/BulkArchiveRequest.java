package com.tunisia.commerce.dto.archive;

import lombok.Data;
import java.util.List;

@Data
public class BulkArchiveRequest {
    private List<Long> demandeIds;
    private String reason;
}
