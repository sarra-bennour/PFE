package com.tunisia.commerce.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "demandes_enregistrement")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DemandeEnregistrement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "exportateur_id" , referencedColumnName = "id")
    @ToString.Exclude
    private ExportateurEtranger exportateur;

    @Column(unique = true)
    private String reference; // EXP-2025-XXXX

    @Enumerated(EnumType.STRING)
    private DemandeStatus status;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "payment_amount")
    private BigDecimal paymentAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.EN_ATTENTE;

    @Column(name = "assigned_to")
    private Long assignedTo; // Agent de validation assigné

    @Column(name = "decision_date")
    private LocalDateTime decisionDate;

    @Column(name = "decision_comment")
    private String decisionComment;

    @Column(name = "numero_agrement")
    private String numeroAgrement;

    @Column(name = "date_agrement")
    private LocalDate dateAgrement;

    @OneToMany(mappedBy = "demande", cascade = CascadeType.ALL)
    @JsonIgnore
    @ToString.Exclude
    private List<DemandeHistory> history = new ArrayList<>();

    public void addHistory(DemandeHistory history) {
        this.history.add(history);
        history.setDemande(this);
    }
}
