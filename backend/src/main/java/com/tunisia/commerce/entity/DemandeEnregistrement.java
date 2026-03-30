package com.tunisia.commerce.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.PaymentStatus;
import com.tunisia.commerce.enums.TypeDemandeur;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "demandes_enregistrement")
@Inheritance(strategy = InheritanceType.JOINED)
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DemandeEnregistrement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String reference;

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

    @Column(name = "type_demandeur")
    @Enumerated(EnumType.STRING)
    private TypeDemandeur typeDemandeur;

    @OneToMany(mappedBy = "demande", cascade = CascadeType.ALL)
    @JsonIgnore
    @ToString.Exclude
    private List<DemandeHistory> history = new ArrayList<>();

    @OneToMany(mappedBy = "demande", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<DemandeProduit> demandeProduits = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exportateur_id")
    @ToString.Exclude
    private ExportateurEtranger exportateur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "importateur_id")
    @ToString.Exclude
    private ImportateurTunisien importateur;

}
