package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.entity.NgpCode;
import com.tunisia.commerce.repository.NgpCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NgpCodeService {

    private final NgpCodeRepository ngpCodeRepository;

    public Optional<NgpCode> findByNgpCode(String ngpCode) {
        return ngpCodeRepository.findByNgpCode(ngpCode);
    }

    public NgpCode getNgpData(String ngpCode) {
        if (ngpCode == null || ngpCode.isEmpty()) {
            return createDefaultNgpCode();
        }

        // Normaliser le code
        String normalizedCode = ngpCode.trim();

        // Chercher le code exact
        Optional<NgpCode> exactMatch = ngpCodeRepository.findByNgpCode(normalizedCode);
        if (exactMatch.isPresent()) {
            return exactMatch.get();
        }

        // Chercher par code court (4 premiers chiffres)
        if (normalizedCode.length() >= 4) {
            String shortCode = normalizedCode.substring(0, 4);
            Optional<NgpCode> shortMatch = ngpCodeRepository.findByNgpCode(shortCode);
            if (shortMatch.isPresent()) {
                return shortMatch.get();
            }
        }

        // Chercher par catégorie (2 premiers chiffres)
        if (normalizedCode.length() >= 2) {
            String categoryCode = normalizedCode.substring(0, 2);
            var categoryMatches = ngpCodeRepository.findByCategoryCode(categoryCode);
            if (!categoryMatches.isEmpty()) {
                return categoryMatches.get(0);
            }
        }

        return createDefaultNgpCode();
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
}