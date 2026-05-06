package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.tax.TaxRequest;
import com.tunisia.commerce.dto.tax.TaxResponse;
import com.tunisia.commerce.entity.NgpCode;
import com.tunisia.commerce.entity.Country;
import com.tunisia.commerce.service.impl.TaxCalculatorService;
import com.tunisia.commerce.service.impl.NgpCodeService;
import com.tunisia.commerce.service.impl.CountryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/taxes")
@CrossOrigin(origins = "*")
public class TaxCalculatorController {

    @Autowired
    private TaxCalculatorService taxCalculatorService;

    @Autowired
    private NgpCodeService ngpCodeService;

    @Autowired
    private CountryService countryService;

    @PostMapping("/calculate")
    public TaxResponse calculate(@RequestBody TaxRequest request) {
        // Récupérer les données NGP et Country
        NgpCode ngpData = ngpCodeService.getNgpData(request.getHsCode());
        Country country = countryService.getCountryData(request.getCountryCode() != null ?
                request.getCountryCode() : "FR");

        // Calculer les taxes
        return taxCalculatorService.calculateTaxes(
                request.getValue(),
                request.getCurrency(),
                ngpData,
                country
        );
    }
}