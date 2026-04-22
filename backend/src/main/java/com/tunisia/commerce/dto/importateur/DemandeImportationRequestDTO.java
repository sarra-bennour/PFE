package com.tunisia.commerce.dto.importateur;

import com.tunisia.commerce.dto.validation.DocumentDTO;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class DemandeImportationRequestDTO {
    // Informations exportateur
    private Long exportateurId;
    private String exportateurName;
    private String exportateurCountry;

    // Informations produit
    private Long produitId;
    private String productName;
    private String hsCode;
    private String category;

    // Informations facture
    private String invoiceNumber;
    private String invoiceDate;
    private Double amount;
    private String currency;

    // Informations logistiques
    private String incoterm;
    private String transportMode;
    private String loadingPort;
    private String dischargePort;
    private String arrivalDate;

    // Documents
    private List<DocumentDTO> documents;
}