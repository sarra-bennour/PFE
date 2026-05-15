package com.tunisia.commerce.entity;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.tunisia.commerce.enums.ActionType;
import com.tunisia.commerce.enums.EntityType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "audit_log", indexes = {
        @Index(name = "idx_entity", columnList = "entity_type, entity_id"),
        @Index(name = "idx_user_action", columnList = "user_id, action_type"),
        @Index(name = "idx_performed_at", columnList = "performed_at"),
        @Index(name = "idx_ip_address", columnList = "user_ip_address")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Slf4j
public class AuditLog {

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Informations sur l'action
    @Column(nullable = false, columnDefinition = "TEXT")
    private String action;

    @Enumerated(EnumType.STRING)
    private ActionType actionType;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Entité concernée
    @Enumerated(EnumType.STRING)
    private EntityType entityType;

    private Long entityId;

    @Column(columnDefinition = "TEXT")
    private String entityReference;

    // Utilisateur
    private Long userId;
    private String userEmail;
    private String userRole;
    private String userIpAddress;

    @Column(columnDefinition = "TEXT")
    private String userAgent;

    // Détails de l'action (JSON)
    @Column(columnDefinition = "TEXT")
    private String details;

    // Statut de l'action
    private String status;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    // Métadonnées
    @CreationTimestamp
    private LocalDateTime performedAt;

    private String sessionId;
    private String requestId;

    /**
     * Convertit une Map en JSON et la stocke dans details
     */
    public void setDetailsMap(Map<String, Object> detailsMap) {
        if (detailsMap == null || detailsMap.isEmpty()) {
            this.details = null;
            return;
        }

        try {
            this.details = objectMapper.writeValueAsString(detailsMap);
        } catch (JsonProcessingException e) {
            log.error("Erreur lors de la conversion de la Map en JSON: {}", e.getMessage());
            this.details = "{\"error\":\"Failed to serialize details\"}";
        }
    }

    /**
     * Récupère les détails sous forme de Map
     */
    public Map<String, Object> getDetailsMap() {
        if (this.details == null || this.details.isEmpty()) {
            return new HashMap<>();
        }

        try {
            return objectMapper.readValue(this.details, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            log.error("Erreur lors de la conversion du JSON en Map: {}", e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("error", "Failed to deserialize details");
            errorMap.put("raw", this.details);
            return errorMap;
        }
    }

    /**
     * Ajoute une entrée individuelle aux détails
     */
    public void addDetail(String key, Object value) {
        Map<String, Object> currentDetails = getDetailsMap();
        currentDetails.put(key, value);
        setDetailsMap(currentDetails);
    }

    /**
     * Récupère une valeur spécifique des détails
     */
    public Object getDetail(String key) {
        return getDetailsMap().get(key);
    }
}