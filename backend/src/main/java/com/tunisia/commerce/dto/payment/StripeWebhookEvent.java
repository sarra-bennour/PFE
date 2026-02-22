package com.tunisia.commerce.dto.payment;

import lombok.Data;

@Data
public class StripeWebhookEvent {
    private String id;
    private String type;
    private DataObject data;

    @lombok.Data
    public static class DataObject {
        private PaymentIntentObject object;
    }

    @lombok.Data
    public static class PaymentIntentObject {
        private String id;
        private Long amount;
        private String currency;
        private String status;
        private String clientSecret;
        private Metadata metadata;
    }

    @lombok.Data
    public static class Metadata {
        private Long demandeId;
        private Long exportateurId;
    }
}