package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.DemandeStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "demande_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DemandeHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "demande_id")
    private DemandeEnregistrement demande;

    @Enumerated(EnumType.STRING)
    private DemandeStatus oldStatus;

    @Enumerated(EnumType.STRING)
    private DemandeStatus newStatus;

    private String action; // SOUMISSION, PAIEMENT, VALIDATION_DOC, etc.

    private String comment;

    @ManyToOne
    @JoinColumn(name = "performed_by")
    private User performedBy;

    @Column(name = "performed_at")
    private LocalDateTime performedAt;
}
