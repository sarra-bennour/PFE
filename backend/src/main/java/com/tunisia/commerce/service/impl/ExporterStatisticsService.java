package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.statistics.*;
import com.tunisia.commerce.repository.ExportateurStatisticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExporterStatisticsService {

    private final ExportateurStatisticsRepository statisticsRepository;

    private static class CountryCoordinates {
        double latitude;
        double longitude;
        String flagCode;
        String countryCode;
        String name;  // ✅ AJOUTÉ: nom complet du pays

        CountryCoordinates(double latitude, double longitude, String flagCode, String countryCode, String name) {
            this.latitude = latitude;
            this.longitude = longitude;
            this.flagCode = flagCode;
            this.countryCode = countryCode;
            this.name = name;
        }
    }

    // ✅ Map avec clés = codes pays ET noms complets
    private static final Map<String, CountryCoordinates> COUNTRY_COORDINATES = new HashMap<>();

    static {
        // Format: (latitude, longitude, flagCode, countryCode, name)
        // Clés par NOM
        COUNTRY_COORDINATES.put("France", new CountryCoordinates(46.603354, 1.888334, "fr", "FR", "France"));
        COUNTRY_COORDINATES.put("Italie", new CountryCoordinates(41.87194, 12.56738, "it", "IT", "Italie"));
        COUNTRY_COORDINATES.put("Espagne", new CountryCoordinates(40.463667, -3.74922, "es", "ES", "Espagne"));
        COUNTRY_COORDINATES.put("Turquie", new CountryCoordinates(38.963745, 35.243322, "tr", "TR", "Turquie"));
        COUNTRY_COORDINATES.put("Allemagne", new CountryCoordinates(51.165691, 10.451526, "de", "DE", "Allemagne"));
        COUNTRY_COORDINATES.put("Maroc", new CountryCoordinates(31.791702, -7.09262, "ma", "MA", "Maroc"));
        COUNTRY_COORDINATES.put("Tunisie", new CountryCoordinates(33.886917, 9.537499, "tn", "TN", "Tunisie"));
        COUNTRY_COORDINATES.put("Algérie", new CountryCoordinates(28.033886, 1.659626, "dz", "DZ", "Algérie"));
        COUNTRY_COORDINATES.put("Égypte", new CountryCoordinates(26.820553, 30.802498, "eg", "EG", "Égypte"));
        COUNTRY_COORDINATES.put("Chine", new CountryCoordinates(35.86166, 104.195397, "cn", "CN", "Chine"));
        COUNTRY_COORDINATES.put("Inde", new CountryCoordinates(20.593684, 78.96288, "in", "IN", "Inde"));
        COUNTRY_COORDINATES.put("Brésil", new CountryCoordinates(-14.235004, -51.92528, "br", "BR", "Brésil"));
        COUNTRY_COORDINATES.put("États-Unis", new CountryCoordinates(37.09024, -95.712891, "us", "US", "États-Unis"));
        COUNTRY_COORDINATES.put("Royaume-Uni", new CountryCoordinates(51.5074, -0.1278, "gb", "GB", "Royaume-Uni"));
        COUNTRY_COORDINATES.put("Canada", new CountryCoordinates(56.1304, -106.3468, "ca", "CA", "Canada"));
        COUNTRY_COORDINATES.put("Pays-Bas", new CountryCoordinates(52.1326, 5.2913, "nl", "NL", "Pays-Bas"));
        COUNTRY_COORDINATES.put("Belgique", new CountryCoordinates(50.8503, 4.3517, "be", "BE", "Belgique"));
        COUNTRY_COORDINATES.put("Suisse", new CountryCoordinates(46.8182, 8.2275, "ch", "CH", "Suisse"));
        COUNTRY_COORDINATES.put("Libye", new CountryCoordinates(26.3351, 17.2283, "ly", "LY", "Libye"));
        COUNTRY_COORDINATES.put("Arabie Saoudite", new CountryCoordinates(23.8859, 45.0792, "sa", "SA", "Arabie Saoudite"));
        COUNTRY_COORDINATES.put("Émirats Arabes Unis", new CountryCoordinates(23.4241, 53.8478, "ae", "AE", "Émirats Arabes Unis"));

        // ✅ AJOUT DES CLÉS PAR CODE PAYS (pour les valeurs comme "CN", "FR", etc.)
        COUNTRY_COORDINATES.put("FR", new CountryCoordinates(46.603354, 1.888334, "fr", "FR", "France"));
        COUNTRY_COORDINATES.put("IT", new CountryCoordinates(41.87194, 12.56738, "it", "IT", "Italie"));
        COUNTRY_COORDINATES.put("ES", new CountryCoordinates(40.463667, -3.74922, "es", "ES", "Espagne"));
        COUNTRY_COORDINATES.put("TR", new CountryCoordinates(38.963745, 35.243322, "tr", "TR", "Turquie"));
        COUNTRY_COORDINATES.put("DE", new CountryCoordinates(51.165691, 10.451526, "de", "DE", "Allemagne"));
        COUNTRY_COORDINATES.put("MA", new CountryCoordinates(31.791702, -7.09262, "ma", "MA", "Maroc"));
        COUNTRY_COORDINATES.put("TN", new CountryCoordinates(33.886917, 9.537499, "tn", "TN", "Tunisie"));
        COUNTRY_COORDINATES.put("DZ", new CountryCoordinates(28.033886, 1.659626, "dz", "DZ", "Algérie"));
        COUNTRY_COORDINATES.put("EG", new CountryCoordinates(26.820553, 30.802498, "eg", "EG", "Égypte"));
        COUNTRY_COORDINATES.put("CN", new CountryCoordinates(35.86166, 104.195397, "cn", "CN", "Chine"));
        COUNTRY_COORDINATES.put("IN", new CountryCoordinates(20.593684, 78.96288, "in", "IN", "Inde"));
        COUNTRY_COORDINATES.put("BR", new CountryCoordinates(-14.235004, -51.92528, "br", "BR", "Brésil"));
        COUNTRY_COORDINATES.put("US", new CountryCoordinates(37.09024, -95.712891, "us", "US", "États-Unis"));
        COUNTRY_COORDINATES.put("GB", new CountryCoordinates(51.5074, -0.1278, "gb", "GB", "Royaume-Uni"));
        COUNTRY_COORDINATES.put("CA", new CountryCoordinates(56.1304, -106.3468, "ca", "CA", "Canada"));
        COUNTRY_COORDINATES.put("NL", new CountryCoordinates(52.1326, 5.2913, "nl", "NL", "Pays-Bas"));
        COUNTRY_COORDINATES.put("BE", new CountryCoordinates(50.8503, 4.3517, "be", "BE", "Belgique"));
        COUNTRY_COORDINATES.put("CH", new CountryCoordinates(46.8182, 8.2275, "ch", "CH", "Suisse"));
        COUNTRY_COORDINATES.put("LY", new CountryCoordinates(26.3351, 17.2283, "ly", "LY", "Libye"));
        COUNTRY_COORDINATES.put("SA", new CountryCoordinates(23.8859, 45.0792, "sa", "SA", "Arabie Saoudite"));
        COUNTRY_COORDINATES.put("AE", new CountryCoordinates(23.4241, 53.8478, "ae", "AE", "Émirats Arabes Unis"));
    }

    private static final Long DENSITE_ELEVEE_SEUIL = 15L;
    private static final Long DENSITE_MOYENNE_SEUIL = 5L;

    public ExporterStatisticsDTO getExporterStatistics() {
        log.info("=== RÉCUPÉRATION STATISTIQUES EXPORTATEURS ===");

        List<CountryExporterDTO> countries = getCountriesWithExporters();
        GlobalStatsDTO globalStats = calculateGlobalStats(countries);
        List<MonthlyEvolutionDTO> monthlyEvolution = getMonthlyEvolution();
        Map<String, String> densityMap = getDensityMap(countries);

        return ExporterStatisticsDTO.builder()
                .globalStats(globalStats)
                .countries(countries)
                .monthlyEvolution(monthlyEvolution)
                .densityMap(densityMap)
                .build();
    }

    private List<CountryExporterDTO> getCountriesWithExporters() {
        List<Object[]> results = statisticsRepository.getExportateurCountByPays();
        List<CountryExporterDTO> countries = new ArrayList<>();

        System.out.println("=== RÉSULTATS BRUTS DE LA BDD ===");
        for (Object[] row : results) {
            System.out.println("Pays: " + row[0] + " - Nombre: " + row[1]);
        }

        for (Object[] row : results) {
            String paysBrut = (String) row[0];
            Long count = ((Number) row[1]).longValue();

            System.out.println("Recherche de: '" + paysBrut + "' - Map contient: " + COUNTRY_COORDINATES.containsKey(paysBrut));

            // ✅ Maintenant la recherche fonctionne avec "CN" ou "Chine"
            CountryCoordinates coords = COUNTRY_COORDINATES.get(paysBrut);

            // Si toujours pas trouvé, essayer de trouver par correspondance
            if (coords == null) {
                for (Map.Entry<String, CountryCoordinates> entry : COUNTRY_COORDINATES.entrySet()) {
                    if (entry.getValue().countryCode.equalsIgnoreCase(paysBrut) ||
                            entry.getValue().name.equalsIgnoreCase(paysBrut)) {
                        coords = entry.getValue();
                        break;
                    }
                }
            }

            Double latitude = coords != null ? coords.latitude : 33.8869;
            Double longitude = coords != null ? coords.longitude : 9.5375;
            String flagCode = coords != null ? coords.flagCode : "tn";
            String countryCode = coords != null ? coords.countryCode : paysBrut;
            String countryName = coords != null ? coords.name : paysBrut;

            String density = calculateDensity(count);

            countries.add(CountryExporterDTO.builder()
                    .name(countryName)
                    .code(countryCode)
                    .count(count)
                    .latitude(latitude)
                    .longitude(longitude)
                    .density(density)
                    .flagCode(flagCode)
                    .build());
        }

        countries.sort((a, b) -> b.getCount().compareTo(a.getCount()));

        System.out.println("=== PAYS TRAITÉS ===");
        for (CountryExporterDTO c : countries) {
            System.out.println(c.getName() + " (" + c.getCode() + ") - " + c.getCount());
        }

        return countries;
    }

    private String calculateDensity(Long count) {
        if (count >= DENSITE_ELEVEE_SEUIL) return "elevée";
        if (count >= DENSITE_MOYENNE_SEUIL) return "moyenne";
        return "faible";
    }

    private GlobalStatsDTO calculateGlobalStats(List<CountryExporterDTO> countries) {
        Long totalExportateurs = countries.stream()
                .mapToLong(CountryExporterDTO::getCount)
                .sum();

        Long totalPays = (long) countries.size();

        MoisStats moisPrecedent = getMoisStats(-1);
        MoisStats moisActuel = getMoisStats(0);

        Long nombreActuel = moisActuel.getNombreExportateurs();
        Long nombrePrecedent = moisPrecedent.getNombreExportateurs();

        Double croissanceMensuelle = 0.0;
        String tendance = "STABLE";

        if (nombrePrecedent > 0) {
            croissanceMensuelle = ((double) (nombreActuel - nombrePrecedent) / nombrePrecedent) * 100;
            croissanceMensuelle = Math.round(croissanceMensuelle * 10) / 10.0;

            if (croissanceMensuelle > 5) {
                tendance = "EN_HAUSSE";
            } else if (croissanceMensuelle < -5) {
                tendance = "EN_BAISSE";
            }
        } else if (nombreActuel > 0 && nombrePrecedent == 0) {
            croissanceMensuelle = 100.0;
            tendance = "EN_HAUSSE";
        }

        return GlobalStatsDTO.builder()
                .totalExportateurs(totalExportateurs)
                .totalPays(totalPays)
                .croissanceMensuelle(croissanceMensuelle)
                .tendance(tendance)
                .moisPrecedent(moisPrecedent)
                .moisActuel(moisActuel)
                .build();
    }

    private MoisStats getMoisStats(int offset) {
        YearMonth targetMonth = YearMonth.now().minusMonths(Math.abs(offset));
        LocalDateTime startDate = targetMonth.atDay(1).atStartOfDay();
        LocalDateTime endDate = targetMonth.atEndOfMonth().atTime(23, 59, 59);

        Long count = statisticsRepository.countExportateursBetweenDates(startDate, endDate);

        return MoisStats.builder()
                .mois(targetMonth.getMonth().name().substring(0, 3))
                .annee(targetMonth.getYear())
                .nombreExportateurs(count != null ? count : 0L)
                .build();
    }

    private List<MonthlyEvolutionDTO> getMonthlyEvolution() {
        LocalDateTime douzeMoisAvant = LocalDateTime.now().minusMonths(12);
        List<Object[]> results = statisticsRepository.findMonthlyRegistrations(douzeMoisAvant);

        Map<String, Long> monthlyMap = new LinkedHashMap<>();

        for (int i = 11; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            String key = ym.getYear() + "-" + String.format("%02d", ym.getMonthValue());
            monthlyMap.put(key, 0L);
        }

        for (Object[] row : results) {
            Integer annee = ((Number) row[0]).intValue();
            Integer mois = ((Number) row[1]).intValue();
            Long count = ((Number) row[2]).longValue();
            String key = annee + "-" + String.format("%02d", mois);
            monthlyMap.put(key, count);
        }

        List<MonthlyEvolutionDTO> evolution = new ArrayList<>();
        Long previousCount = null;

        for (Map.Entry<String, Long> entry : monthlyMap.entrySet()) {
            String[] yearMonth = entry.getKey().split("-");
            Integer annee = Integer.parseInt(yearMonth[0]);
            Integer mois = Integer.parseInt(yearMonth[1]);
            Long count = entry.getValue();

            Double percentageChange = null;
            if (previousCount != null && previousCount > 0) {
                percentageChange = ((double) (count - previousCount) / previousCount) * 100;
                percentageChange = Math.round(percentageChange * 10) / 10.0;
            }

            String monthName = getMonthName(mois);

            evolution.add(MonthlyEvolutionDTO.builder()
                    .month(monthName)
                    .year(annee)
                    .count(count)
                    .percentageChange(percentageChange)
                    .build());

            previousCount = count;
        }

        return evolution;
    }

    private Map<String, String> getDensityMap(List<CountryExporterDTO> countries) {
        Map<String, String> densityMap = new HashMap<>();
        for (CountryExporterDTO country : countries) {
            densityMap.put(country.getName(), country.getDensity());
        }
        return densityMap;
    }

    private String getMonthName(int month) {
        String[] months = {"JAN", "FEV", "MAR", "AVR", "MAI", "JUN",
                "JUL", "AOU", "SEP", "OCT", "NOV", "DEC"};
        return months[month - 1];
    }
}