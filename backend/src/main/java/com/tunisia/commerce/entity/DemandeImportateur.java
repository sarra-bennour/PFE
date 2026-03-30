package com.tunisia.commerce.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "demande_importateur")
@DiscriminatorValue("IMPORTATEUR")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DemandeImportateur extends DemandeEnregistrement {

    @Column(name = "invoice_number")
    private String invoiceNumber;

    @Column(name = "invoice_date")
    private LocalDate invoiceDate;

    @Column(name = "amount")
    private BigDecimal amount;

    @Column(name = "currency")
    private String currency;

    @Column(name = "incoterm")
    private String incoterm;

    @Column(name = "transport_mode")
    private String transportMode;

    @Column(name = "loading_port")
    private String loadingPort;

    @Column(name = "discharge_port")
    private String dischargePort;

    @Column(name = "arrival_date")
    private LocalDate arrivalDate;
}