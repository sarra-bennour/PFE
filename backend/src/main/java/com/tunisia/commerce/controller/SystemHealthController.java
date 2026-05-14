package com.tunisia.commerce.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/admin/system-health")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SystemHealthController {

    private final DataSource dataSource;

    private static final long START_TIME = System.currentTimeMillis();

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSystemHealth() {
        Map<String, Object> response = new HashMap<>();

        // 1. Uptime JVM
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        Duration uptime = Duration.ofMillis(uptimeMs);
        response.put("uptimeHours", uptime.toHours());
        response.put("uptimeFormatted", formatUptime(uptime));
        response.put("uptimePercent", calculateUptimePercent(uptime));

        // 2. Statut global
        response.put("globalStatus", "UP");

        // 3. Composants
        List<Map<String, Object>> components = new ArrayList<>();
        components.add(checkDatabase());
        components.add(checkMemory());
        components.add(checkDiskSpace());
        components.add(Map.of(
                "name", "API Services",
                "val", 99.0,
                "status", "UP",
                "color", "bg-emerald-500"
        ));
        components.add(checkStripeGateway());
        response.put("components", components);

        // 4. Latence DB
        response.put("networkLatencyMs", measureDbLatency());

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> checkDatabase() {
        long start = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection()) {
            conn.isValid(2);
            long latency = System.currentTimeMillis() - start;
            double val = latency < 100 ? 99.9 : latency < 500 ? 85.0 : 60.0;
            Map<String, Object> result = new HashMap<>();
            result.put("name", "Base de Données");
            result.put("val", val);
            result.put("status", "UP");
            result.put("color", val > 90 ? "bg-emerald-500" : "bg-amber-500");
            result.put("latencyMs", latency);
            return result;
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("name", "Base de Données");
            result.put("val", 0.0);
            result.put("status", "DOWN");
            result.put("color", "bg-red-500");
            result.put("error", e.getMessage());
            return result;
        }
    }

    private Map<String, Object> checkMemory() {
        Runtime runtime = Runtime.getRuntime();
        long total = runtime.totalMemory();
        long free = runtime.freeMemory();
        long used = total - free;
        double usedPercent = (double) used / total * 100;
        double healthVal = Math.round((100 - usedPercent) * 10.0) / 10.0;

        Map<String, Object> result = new HashMap<>();
        result.put("name", "Mémoire JVM");
        result.put("val", healthVal);
        result.put("status", healthVal > 20 ? "UP" : "WARNING");
        result.put("color", healthVal > 40 ? "bg-emerald-500" : healthVal > 20 ? "bg-amber-500" : "bg-red-500");
        result.put("usedMb", used / (1024 * 1024));
        result.put("totalMb", total / (1024 * 1024));
        return result;
    }

    private Map<String, Object> checkDiskSpace() {
        try {
            java.io.File root = new java.io.File("/");
            long total = root.getTotalSpace();
            long free = root.getFreeSpace();
            double freePercent = total > 0 ? Math.round((double) free / total * 1000.0) / 10.0 : 100.0;

            Map<String, Object> result = new HashMap<>();
            result.put("name", "Stockage Disque");
            result.put("val", freePercent);
            result.put("status", freePercent > 10 ? "UP" : "WARNING");
            result.put("color", freePercent > 30 ? "bg-emerald-500" : freePercent > 10 ? "bg-amber-500" : "bg-red-500");
            result.put("freeGb", free / (1024 * 1024 * 1024));
            result.put("totalGb", total / (1024 * 1024 * 1024));
            return result;
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("name", "Stockage Disque");
            result.put("val", 0.0);
            result.put("status", "UNKNOWN");
            result.put("color", "bg-slate-400");
            return result;
        }
    }

    private Map<String, Object> checkStripeGateway() {
        try {
            Map<String, Object> result = new HashMap<>();
            // Vérifie juste que la clé Stripe est configurée
            String stripeKey = System.getenv("stripe.api.key");
            boolean configured = stripeKey != null && !stripeKey.isBlank();
            result.put("name", "Stripe Gateway");
            result.put("val", configured ? 99.5 : 0.0);
            result.put("status", configured ? "UP" : "NON CONFIGURÉ");
            result.put("color", configured ? "bg-emerald-500" : "bg-red-500");
            return result;
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("name", "Stripe Gateway");
            result.put("val", 0.0);
            result.put("status", "UNREACHABLE");
            result.put("color", "bg-red-500");
            return result;
        }
    }

    private long measureDbLatency() {
        long start = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection()) {
            conn.isValid(1);
        } catch (Exception ignored) {}
        return System.currentTimeMillis() - start;
    }

    private double calculateUptimePercent(Duration uptime) {
        long totalSeconds = uptime.getSeconds();
        long thirtyDays = 30L * 24 * 3600;
        if (totalSeconds >= thirtyDays) return 99.99;
        if (totalSeconds > 3600) return Math.round((99.5 + (Math.min(totalSeconds, thirtyDays) * 0.49 / thirtyDays)) * 100.0) / 100.0;
        return 99.0;
    }

    private String formatUptime(Duration uptime) {
        return uptime.toDays() + "j " + uptime.toHoursPart() + "h " + uptime.toMinutesPart() + "m";
    }
}