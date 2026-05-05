package com.tunisia.commerce.service.impl;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
@Slf4j
public class IpApiService {

    private final RestTemplate restTemplate = new RestTemplate();

    // API Keys (à configurer dans application.properties)
    @Value("${ipinfo.token:}")
    private String ipInfoToken;

    @Value("${abstractapi.email.token:}")
    private String abstractApiEmailToken;

    @Value("${numverify.token:}")
    private String numverifyToken;

    // API ip-api.com - GRATUITE, sans clé, 45 req/min
    private static final String IP_GEOLOCATION_URL =
            "http://ip-api.com/json/{ip}?fields=status,country,countryCode,city,lat,lon,proxy,isp,org,as,mobile,hosting,query";

    // API ipinfo.io - 50k req/mois gratuit avec token
    private static final String IPINFO_URL = "https://ipinfo.io/{ip}/json?token={token}";

    // API AbstractAPI - 250 req/mois gratuit
    private static final String ABSTRACT_EMAIL_URL =
            "https://emailvalidation.abstractapi.com/v1/?api_key={apiKey}&email={email}";

    // API Numverify - 100 req/mois gratuit
    private static final String NUMVERIFY_URL =
            "http://apilayer.net/api/validate?access_key={accessKey}&number={number}&country_code={countryCode}&format=1";

    // ==================== IP GEOLOCATION METHODS ====================

    /**
     * Récupère la localisation et détection proxy à partir d'une IP (ip-api.com)
     */
    public IpApiResponse getLocationAndProxy(String ipAddress) {
        if (ipAddress == null || ipAddress.isEmpty() || "0:0:0:0:0:0:0:1".equals(ipAddress)) {
            log.warn("IP invalide ou localhost: {}", ipAddress);
            return null;
        }

        try {
            String url = IP_GEOLOCATION_URL.replace("{ip}", ipAddress);
            IpApiResponse response = restTemplate.getForObject(url, IpApiResponse.class);

            if (response != null && "success".equals(response.getStatus())) {
                log.info("IP {} -> Pays: {}, Proxy: {}, ISP: {}",
                        ipAddress, response.getCountry(), response.isProxy(), response.getIsp());
                return response;
            } else {
                log.warn("IP {} non trouvée ou erreur: {}", ipAddress, response != null ? response.getStatus() : "null");
                return null;
            }
        } catch (Exception e) {
            log.error("Erreur appel ip-api.com pour IP {}: {}", ipAddress, e.getMessage());
            return null;
        }
    }

    /**
     * Récupère une analyse IP enrichie avec ipinfo.io (si token disponible)
     */
    public EnhancedIpAnalysis getEnhancedIpAnalysis(String ipAddress) {
        EnhancedIpAnalysis analysis = new EnhancedIpAnalysis();
        analysis.setIpAddress(ipAddress);

        if (ipAddress == null || ipAddress.isEmpty() || "0:0:0:0:0:0:0:1".equals(ipAddress)) {
            analysis.setCountry("Localhost");
            analysis.setRiskScore(0);
            return analysis;
        }

        // Source 1: ip-api.com (toujours disponible)
        IpApiResponse ipApiResponse = getLocationAndProxy(ipAddress);
        if (ipApiResponse != null && "success".equals(ipApiResponse.getStatus())) {
            analysis.setCountry(ipApiResponse.getCountry());
            analysis.setCountryCode(ipApiResponse.getCountryCode());
            analysis.setCity(ipApiResponse.getCity());
            analysis.setProxyDetected(ipApiResponse.isProxy());
            analysis.setIsp(ipApiResponse.getIsp());
            analysis.setOrg(ipApiResponse.getOrg());
            analysis.setAs(ipApiResponse.getAs());
            analysis.setMobile(ipApiResponse.isMobile());
            analysis.setHosting(ipApiResponse.isHosting());
        }

        // Source 2: ipinfo.io (si token disponible)
        if (ipInfoToken != null && !ipInfoToken.isEmpty() && !"VOTRE_TOKEN_IPINFO".equals(ipInfoToken)) {
            try {
                IpInfoResponse ipInfo = getIpInfo(ipAddress);
                if (ipInfo != null) {
                    if (analysis.getCountry() == null) analysis.setCountry(ipInfo.getCountry());
                    if (analysis.getCity() == null) analysis.setCity(ipInfo.getCity());
                    if (analysis.getIsp() == null) analysis.setIsp(ipInfo.getOrg());
                    analysis.setTimezone(ipInfo.getTimezone());
                    analysis.setLoc(ipInfo.getLoc());

                    if (ipInfo.getPrivacy() != null) {
                        analysis.setVpn(ipInfo.getPrivacy().isVpn());
                        analysis.setTor(ipInfo.getPrivacy().isTor());
                        analysis.setRelay(ipInfo.getPrivacy().isRelay());
                    }
                }
            } catch (Exception e) {
                log.warn("Erreur appel ipinfo.io pour IP {}: {}", ipAddress, e.getMessage());
            }
        }

        // Calcul du score de risque IP
        int ipRiskScore = 0;
        if (analysis.isProxyDetected() || analysis.isVpn()) ipRiskScore += 20;
        if (analysis.isTor()) ipRiskScore += 25;
        if (analysis.isRelay()) ipRiskScore += 10;
        if (analysis.isHosting()) ipRiskScore += 10;
        analysis.setRiskScore(ipRiskScore);
        if (ipRiskScore > 0) analysis.setRiskFactor("IP_SUSPECT");

        return analysis;
    }

    /**
     * Récupère les informations depuis ipinfo.io
     */
    private IpInfoResponse getIpInfo(String ipAddress) {
        try {
            String url = IPINFO_URL
                    .replace("{ip}", ipAddress)
                    .replace("{token}", ipInfoToken);
            return restTemplate.getForObject(url, IpInfoResponse.class);
        } catch (Exception e) {
            log.warn("Erreur getIpInfo: {}", e.getMessage());
            return null;
        }
    }

    // ==================== EMAIL VALIDATION METHODS ====================

    /**
     * Validation complète d'email
     */
    public EmailValidationResponse validateEmail(String email) {
        EmailValidationResponse response = new EmailValidationResponse();
        response.setEmail(email);

        if (email == null || email.isEmpty()) {
            response.setValidSyntax(false);
            response.setRiskFactor("EMAIL_MISSING");
            response.setRiskScore(50);
            return response;
        }

        // Tentative avec API externe
        if (abstractApiEmailToken != null && !abstractApiEmailToken.isEmpty()
                && !"VOTRE_TOKEN_ABSTRACTAPI".equals(abstractApiEmailToken)) {
            try {
                String url = ABSTRACT_EMAIL_URL
                        .replace("{apiKey}", abstractApiEmailToken)
                        .replace("{email}", email);
                AbstractEmailResponse apiResponse = restTemplate.getForObject(url, AbstractEmailResponse.class);

                if (apiResponse != null) {
                    response.setDeliverable(apiResponse.isDeliverable());
                    response.setValidSyntax(apiResponse.isValidSyntax());
                    response.setDisposable(apiResponse.isDisposable());
                    response.setFreeProvider(apiResponse.isFreeProvider());
                    response.setRoleAccount(apiResponse.isRoleAccount());
                    response.setQualityScore(apiResponse.getQualityScore());

                    if (apiResponse.isDisposable()) {
                        response.setRiskFactor("EMAIL_DISPOSABLE");
                        response.setRiskScore(85);
                    } else if (!apiResponse.isValidSyntax()) {
                        response.setRiskFactor("EMAIL_INVALID_SYNTAX");
                        response.setRiskScore(90);
                    } else if (apiResponse.isFreeProvider()) {
                        response.setRiskFactor("EMAIL_FREE_PROVIDER");
                        response.setRiskScore(15);
                    } else {
                        response.setRiskScore(0);
                    }
                    return response;
                }
            } catch (Exception e) {
                log.warn("Erreur validation email via AbstractAPI: {}", e.getMessage());
            }
        }

        // Fallback local
        return localEmailValidation(email);
    }

    /**
     * Validation email locale (sans API externe)
     */
    private EmailValidationResponse localEmailValidation(String email) {
        EmailValidationResponse response = new EmailValidationResponse();
        response.setEmail(email);

        List<String> disposableDomains = List.of(
                "tempmail.com", "10minutemail.com", "guerrillamail.com",
                "mailinator.com", "yopmail.com", "throwawaymail.com",
                "temp-mail.org", "tempmail.org", "guerrillamail.net",
                "sharklasers.com", "grr.la", "guerrillamail.biz", "guerrillamail.org"
        );

        List<String> freeProviders = List.of(
                "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                "aol.com", "protonmail.com", "mail.com", "icloud.com",
                "live.com", "msn.com", "yandex.com", "gmx.com"
        );

        List<String> highRiskDomains = List.of(
                "mail.ru", "bk.ru", "list.ru", "inbox.ru", "rambler.ru"
        );

        try {
            // Validation syntaxe de base
            boolean hasAtSign = email.contains("@");
            boolean hasDot = email.contains(".");
            boolean validLength = email.length() >= 5 && email.length() <= 100;
            boolean validChars = email.matches("^[A-Za-z0-9+_.-]+@(.+)$");

            response.setValidSyntax(hasAtSign && hasDot && validLength && validChars);

            String domain = email.substring(email.indexOf('@') + 1).toLowerCase();

            if (disposableDomains.contains(domain)) {
                response.setDisposable(true);
                response.setRiskFactor("EMAIL_DISPOSABLE");
                response.setRiskScore(85);
            } else if (highRiskDomains.contains(domain)) {
                response.setRiskFactor("EMAIL_HIGH_RISK_DOMAIN");
                response.setRiskScore(40);
                response.setFreeProvider(true);
            } else if (freeProviders.contains(domain)) {
                response.setFreeProvider(true);
                response.setRiskFactor("EMAIL_FREE_PROVIDER");
                response.setRiskScore(15);
            } else {
                response.setDeliverable(true);
                response.setRiskScore(0);
                response.setRiskFactor("EMAIL_PROFESSIONAL");
            }

        } catch (Exception e) {
            response.setValidSyntax(false);
            response.setRiskFactor("EMAIL_INVALID_FORMAT");
            response.setRiskScore(90);
        }

        return response;
    }

    // ==================== PHONE VALIDATION METHODS ====================

    /**
     * Validation téléphone
     * @param phoneNumber numéro de téléphone
     * @param countryCode code pays (ex: FR, TN, DZ...)
     */
    public PhoneValidationResponse validatePhone(String phoneNumber, String countryCode) {
        PhoneValidationResponse response = new PhoneValidationResponse();
        response.setPhoneNumber(phoneNumber);

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            response.setValid(false);
            response.setRiskFactor("PHONE_MISSING");
            response.setRiskScore(40);
            return response;
        }

        // Tentative avec API externe
        if (numverifyToken != null && !numverifyToken.isEmpty()
                && !"VOTRE_TOKEN_NUMVERIFY".equals(numverifyToken)) {
            try {
                String url = NUMVERIFY_URL
                        .replace("{accessKey}", numverifyToken)
                        .replace("{number}", phoneNumber)
                        .replace("{countryCode}", countryCode != null ? countryCode : "");
                NumverifyResponse apiResponse = restTemplate.getForObject(url, NumverifyResponse.class);

                if (apiResponse != null) {
                    response.setValid(apiResponse.isValid());
                    response.setCountryCode(apiResponse.getCountryCode());
                    response.setCarrier(apiResponse.getCarrier());
                    response.setLineType(apiResponse.getLineType());

                    if (!apiResponse.isValid()) {
                        response.setRiskFactor("PHONE_INVALID");
                        response.setRiskScore(60);
                    } else if ("voip".equalsIgnoreCase(apiResponse.getLineType())) {
                        response.setRiskFactor("PHONE_VOIP");
                        response.setRiskScore(40);
                    } else if ("mobile".equalsIgnoreCase(apiResponse.getLineType())) {
                        response.setCarrierValid(true);
                        response.setRiskScore(0);
                    } else if ("landline".equalsIgnoreCase(apiResponse.getLineType())) {
                        response.setRiskScore(5);
                    }
                    return response;
                }
            } catch (Exception e) {
                log.warn("Erreur validation téléphone via Numverify: {}", e.getMessage());
            }
        }

        // Fallback local
        return localPhoneValidation(phoneNumber);
    }

    /**
     * Validation téléphone locale (sans API externe)
     */
    private PhoneValidationResponse localPhoneValidation(String phoneNumber) {
        PhoneValidationResponse response = new PhoneValidationResponse();
        response.setPhoneNumber(phoneNumber);

        // Nettoyer le numéro (enlever espaces, tirets, etc.)
        String cleaned = phoneNumber.replaceAll("[\\s\\-\\+\\(\\)]", "");

        // Vérification basique
        boolean isValid = false;

        if (cleaned.matches("^[0-9]{8,15}$")) {
            isValid = true;
            response.setRiskScore(0);

            // Détection de patterns suspects
            if (cleaned.matches("^(\\d)\\1{7,}$")) {
                response.setRiskFactor("PHONE_REPEATED_DIGITS");
                response.setRiskScore(30);
                isValid = true;
            } else if (cleaned.length() < 9) {
                response.setRiskFactor("PHONE_TOO_SHORT");
                response.setRiskScore(25);
                isValid = true;
            } else {
                response.setCarrierValid(true);
            }
        } else if (cleaned.matches("^[0-9]{5,7}$")) {
            isValid = true;
            response.setRiskFactor("PHONE_SHORT_NUMBER");
            response.setRiskScore(20);
        } else if (cleaned.matches("^[0-9]{16,}$")) {
            response.setRiskFactor("PHONE_TOO_LONG");
            response.setRiskScore(35);
            isValid = false;
        } else {
            response.setRiskFactor("PHONE_INVALID_FORMAT");
            response.setRiskScore(50);
            isValid = false;
        }

        response.setValid(isValid);
        return response;
    }

    // ==================== INNER CLASSES ====================

    @Data
    public static class IpApiResponse {
        private String status;
        private String country;
        private String countryCode;
        private String city;
        private Double lat;
        private Double lon;
        private boolean proxy;
        private String isp;
        private String org;
        private String as;
        private boolean mobile;
        private boolean hosting;
        private String query;
    }

    @Data
    public static class EnhancedIpAnalysis {
        private String ipAddress;
        private String country;
        private String countryCode;
        private String city;
        private boolean proxyDetected;
        private boolean vpn;
        private boolean tor;
        private boolean relay;
        private String isp;
        private String org;
        private String as;
        private boolean mobile;
        private boolean hosting;
        private String timezone;
        private String loc;
        private int riskScore;
        private String riskFactor;
    }

    @Data
    public static class IpInfoResponse {
        private String ip;
        private String city;
        private String region;
        private String country;
        private String loc;
        private String org;
        private String postal;
        private String timezone;
        private Privacy privacy;

        @Data
        public static class Privacy {
            private boolean vpn;
            private boolean tor;
            private boolean relay;
            private String hosting;
            private String service;
        }
    }

    @Data
    public static class AbstractEmailResponse {
        private String email;
        private boolean deliverable;
        private boolean validSyntax;
        private boolean disposable;
        private boolean freeProvider;
        private boolean roleAccount;
        private int qualityScore;
    }

    @Data
    public static class NumverifyResponse {
        private boolean valid;
        private String number;
        private String localFormat;
        private String internationalFormat;
        private String countryPrefix;
        private String countryCode;
        private String countryName;
        private String location;
        private String carrier;
        private String lineType;
    }

    @Data
    public static class EmailValidationResponse {
        private String email;
        private boolean deliverable;
        private boolean validSyntax;
        private boolean disposable;
        private boolean freeProvider;
        private boolean roleAccount;
        private int qualityScore;
        private String riskFactor;
        private int riskScore;
    }

    @Data
    public static class PhoneValidationResponse {
        private String phoneNumber;
        private boolean valid;
        private String countryCode;
        private String carrier;
        private String lineType;
        private boolean carrierValid;
        private String riskFactor;
        private int riskScore;
    }
}