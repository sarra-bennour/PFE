package com.tunisia.commerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "countries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Country {

    @Id
    private String code;  // Code pays (FR, IT, TR, CN, etc.)

    @Column(nullable = false)
    private String name;

    @Column(name = "dial_code")
    private String dialCode;

    @Column(name = "exchange_rate_to_tnd")
    private BigDecimal exchangeRateToTnd;  // Taux de change vers TND

    @Column(name = "has_free_trade_agreement")
    @Builder.Default
    private Boolean hasFreeTradeAgreement = false;

    @Column(name = "preferential_duty_rate")
    private BigDecimal preferentialDutyRate;  // Taux préférentiel si accord

    @Column(name = "is_eu_member")
    @Builder.Default
    private Boolean isEuMember = false;

    @Column(name = "requires_certificate_of_origin")
    @Builder.Default
    private Boolean requiresCertificateOfOrigin = false;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}