package com.tunisia.commerce.entity;

import com.tunisia.commerce.enums.TypeDemandeur;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "demande_produit")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DemandeProduit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "demande_id", nullable = false)
    private DemandeEnregistrement demande;

    @ManyToOne
    @JoinColumn(name = "produit_id", nullable = false)
    private Product produit;

    @Column(name = "type_demandeur", nullable = false)
    @Enumerated(EnumType.STRING)
    private TypeDemandeur type;

    @Column(name = "date_association")
    private LocalDateTime dateAssociation;


}