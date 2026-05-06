package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.validation.PredictiveDashboardDTO;
import com.tunisia.commerce.service.impl.PredictiveAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/predictive")
@RequiredArgsConstructor
public class PredictiveAnalyticsController {

    private final PredictiveAnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<PredictiveDashboardDTO> getPredictions() {
        return ResponseEntity.ok(analyticsService.generatePredictions());
    }
}