package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.tax.TaxResponse;
import com.tunisia.commerce.entity.Country;
import com.tunisia.commerce.entity.NgpCode;
import com.tunisia.commerce.entity.DemandeImportateur;
import com.tunisia.commerce.entity.Product;
import com.tunisia.commerce.repository.CountryRepository;
import com.tunisia.commerce.repository.NgpCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TaxCalculatorService {

    private final NgpCodeRepository ngpCodeRepository;
    private final CountryRepository countryRepository;

    // Taux fixes tunisiens
    private static final BigDecimal FODEC_RATE = new BigDecimal("0.0025");  // 0.25%
    private static final BigDecimal CCC_RATE = new BigDecimal("0.001");     // 0.1%
    private static final BigDecimal TVA_RECOVERY_RATE = new BigDecimal("0.01"); // 1%
    private static final BigDecimal MIN_FODEC_AMOUNT = new BigDecimal("1.0");

    // Taux de change par défaut
    private static final BigDecimal DEFAULT_EUR_TO_TND = new BigDecimal("3.30");
    private static final BigDecimal DEFAULT_USD_TO_TND = new BigDecimal("3.10");
    private static final BigDecimal DEFAULT_GBP_TO_TND = new BigDecimal("3.90");

    // Pays éligibles au SPG (Système de Préférences Généralisées)
    private static final Set<String> GSP_COUNTRIES = new HashSet<>(Arrays.asList(
            "CN", "IN", "VN", "BD", "KH", "PK", "PH", "LK", "ID", "MM", "NP", "LA"
    ));

    // Catégories de produits à TVA réduite (7%)
    private static final Set<String> REDUCED_VAT_CATEGORIES = new HashSet<>(Arrays.asList(
            "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
            "11", "12", "13", "14", "15", "16"
    ));

    // Codes à TVA réduite
    private static final Set<String> REDUCED_VAT_CODES = new HashSet<>(Arrays.asList(
            "49"  // Livres et fournitures scolaires
    ));

    public TaxResponse calculateTaxesForDemande(DemandeImportateur demande, Product product, String countryCode) {
        // Récupérer le pays depuis la base de données
        Country country = countryRepository.findById(countryCode)
                .orElseGet(() -> countryRepository.findById("FR").orElse(null));

        // Récupérer le code NGP depuis la base de données
        String hsCode = product.getHsCode();
        NgpCode ngpCode = ngpCodeRepository.findByNgpCode(hsCode)
                .orElseGet(() -> ngpCodeRepository.findByCategoryCode(hsCode.length() >= 2 ? hsCode.substring(0, 2) : "99")
                        .stream().findFirst().orElse(null));

        BigDecimal value = BigDecimal.valueOf(demande.getAmount());
        String currency = demande.getCurrency();

        return calculateTaxes(value, currency, ngpCode, country);
    }

    public TaxResponse calculateTaxes(BigDecimal value, String currency,
                                      NgpCode ngpCode,
                                      Country country) {

        // Si ngpCode est null, utiliser des valeurs par défaut
        if (ngpCode == null) {
            ngpCode = createDefaultNgpCode();
        }

        if (country == null) {
            country = createDefaultCountry();
        }

        // Conversion en TND
        BigDecimal valueInTnd = convertToTnd(value, currency, country);

        // Taux de droit de douane (avec préférences selon pays d'origine)
        BigDecimal dutyRate = getEffectiveDutyRate(ngpCode, country);
        BigDecimal customsDuty = valueInTnd.multiply(dutyRate).setScale(3, RoundingMode.HALF_UP);

        // Taxes additionnelles
        BigDecimal fodec = calculateFodec(valueInTnd);
        BigDecimal ccc = valueInTnd.multiply(CCC_RATE).setScale(3, RoundingMode.HALF_UP);
        BigDecimal paf = valueInTnd.multiply(TVA_RECOVERY_RATE).setScale(3, RoundingMode.HALF_UP);

        // TVA
        BigDecimal vatBase = valueInTnd.add(customsDuty).add(fodec);
        BigDecimal vatRate = getEffectiveVatRate(ngpCode);
        BigDecimal vat = vatBase.multiply(vatRate).setScale(3, RoundingMode.HALF_UP);

        // Autres taxes
        BigDecimal otherTaxes = fodec.add(ccc).add(paf);

        // Total
        BigDecimal total = customsDuty.add(vat).add(otherTaxes);

        return TaxResponse.builder()
                .customsDuty(customsDuty)
                .vat(vat)
                .otherTaxes(otherTaxes)
                .total(total)
                .currency("TND")
                .build();
    }

    private BigDecimal getEffectiveDutyRate(NgpCode ngpCode, Country country) {
        BigDecimal standardRate = ngpCode.getDutyRate();

        // Application des préférences tarifaires selon l'origine
        if (Boolean.TRUE.equals(country.getHasFreeTradeAgreement())) {
            // Accord de libre-échange avec la Tunisie
            if (country.getPreferentialDutyRate() != null) {
                return country.getPreferentialDutyRate();
            }
            return BigDecimal.ZERO;
        }

        // Pays de l'UE (accord ALECA)
        if (Boolean.TRUE.equals(country.getIsEuMember())) {
            return BigDecimal.ZERO;
        }

        // Pays bénéficiant du Système de Préférences Généralisées (SPG)
        if (isGspEligible(country)) {
            return standardRate.multiply(new BigDecimal("0.67")).setScale(4, RoundingMode.HALF_UP); // Réduction de 33%
        }

        return standardRate;
    }

    private BigDecimal getEffectiveVatRate(NgpCode ngpCode) {
        String categoryCode = ngpCode.getCategoryCode();
        String ngpCodeStr = ngpCode.getNgpCode();
        String productNameFr = ngpCode.getProductNameFr();

        // Produits de première nécessité : TVA 7%
        if (REDUCED_VAT_CATEGORIES.contains(categoryCode)) {
            return new BigDecimal("0.07");
        }

        // Codes spécifiques à TVA réduite
        if (ngpCodeStr != null && ngpCodeStr.length() >= 2) {
            String prefix = ngpCodeStr.substring(0, 2);
            if (REDUCED_VAT_CODES.contains(prefix)) {
                return new BigDecimal("0.07");
            }
        }

        // Équipements médicaux : TVA 7%
        if (productNameFr != null &&
                (productNameFr.contains("chirurgical") ||
                        productNameFr.contains("médical") ||
                        productNameFr.contains("surgical"))) {
            return new BigDecimal("0.07");
        }

        // Taux normal 19%
        return ngpCode.getVatRate() != null ? ngpCode.getVatRate() : new BigDecimal("0.19");
    }

    private BigDecimal calculateFodec(BigDecimal value) {
        BigDecimal fodec = value.multiply(FODEC_RATE);
        if (fodec.compareTo(MIN_FODEC_AMOUNT) < 0) {
            return MIN_FODEC_AMOUNT;
        }
        return fodec.setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal convertToTnd(BigDecimal value, String currency, Country country) {
        if ("TND".equalsIgnoreCase(currency)) {
            return value;
        }

        BigDecimal exchangeRate = getExchangeRate(country, currency);
        return value.multiply(exchangeRate).setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal getExchangeRate(Country country, String currency) {
        // D'abord essayer le taux du pays
        if (country != null && country.getExchangeRateToTnd() != null) {
            return country.getExchangeRateToTnd();
        }

        // Sinon taux par défaut selon la devise
        switch (currency.toUpperCase()) {
            case "EUR":
                return DEFAULT_EUR_TO_TND;
            case "USD":
                return DEFAULT_USD_TO_TND;
            case "GBP":
                return DEFAULT_GBP_TO_TND;
            case "CHF":
                return new BigDecimal("3.50");
            case "TRY":
                return new BigDecimal("0.11");
            case "CNY":
                return new BigDecimal("0.43");
            case "AED":
                return new BigDecimal("0.84");
            case "SAR":
                return new BigDecimal("0.83");
            case "MAD":
                return new BigDecimal("0.31");
            case "DZD":
                return new BigDecimal("0.023");
            case "LYD":
                return new BigDecimal("0.64");
            default:
                return BigDecimal.ONE;
        }
    }

    private boolean isGspEligible(Country country) {
        return GSP_COUNTRIES.contains(country.getCode());
    }

    private NgpCode createDefaultNgpCode() {
        return NgpCode.builder()
                .ngpCode("DEFAULT")
                .categoryCode("99")
                .productNameFr("Produits divers")
                .productNameAr("منتجات متنوعة")
                .productNameEn("Miscellaneous products")
                .productType("INDUSTRIEL")
                .dutyRate(new BigDecimal("0.15"))
                .vatRate(new BigDecimal("0.19"))
                .additionalTaxesRate(new BigDecimal("0.02"))
                .isActive(true)
                .build();
    }

    private Country createDefaultCountry() {
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