package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.entity.Country;
import com.tunisia.commerce.repository.CountryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CountryService {

    private final CountryRepository countryRepository;

    public Optional<Country> findByCode(String code) {
        return countryRepository.findByCode(code);
    }

    public Country getCountryData(String countryCode) {
        if (countryCode == null || countryCode.isEmpty()) {
            return getDefaultCountry();
        }

        return countryRepository.findByCode(countryCode.toUpperCase())
                .orElseGet(this::getDefaultCountry);
    }

    public BigDecimal getExchangeRate(String countryCode, String currency) {
        Optional<Country> country = countryRepository.findByCode(countryCode);
        if (country.isPresent() && country.get().getExchangeRateToTnd() != null) {
            return country.get().getExchangeRateToTnd();
        }

        // Taux par devise par défaut
        switch (currency.toUpperCase()) {
            case "EUR": return new BigDecimal("3.30");
            case "USD": return new BigDecimal("3.10");
            case "GBP": return new BigDecimal("3.90");
            case "CHF": return new BigDecimal("3.50");
            case "TRY": return new BigDecimal("0.11");
            case "CNY": return new BigDecimal("0.43");
            default: return BigDecimal.ONE;
        }
    }

    private Country getDefaultCountry() {
        return Country.builder()
                .code("FR")
                .name("France")
                .dialCode("+33")
                .exchangeRateToTnd(new BigDecimal("3.30"))
                .hasFreeTradeAgreement(true)
                .preferentialDutyRate(BigDecimal.ZERO)
                .isEuMember(true)
                .requiresCertificateOfOrigin(false)
                .build();
    }
}