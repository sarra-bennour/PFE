package com.tunisia.commerce.dto.structure;

import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.enums.StructureType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StructureInterneDTO {
    private Long id;
    private StructureType type;
    private String officialName;
    private String officialNameAr;
    private String code;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserDTO createdBy;
}