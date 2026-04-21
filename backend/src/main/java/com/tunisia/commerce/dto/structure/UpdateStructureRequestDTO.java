package com.tunisia.commerce.dto.structure;

import com.tunisia.commerce.enums.StructureType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStructureRequestDTO {

    @NotNull(message = "Le type de structure est requis")
    private StructureType type;

    @NotBlank(message = "Le nom officiel est requis")
    private String officialName;

    private Boolean isActive;
}