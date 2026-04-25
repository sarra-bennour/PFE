package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.DemandeValidateur;
import com.tunisia.commerce.entity.InstanceValidation;
import com.tunisia.commerce.enums.ValidationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface DemandeValidateurRepository extends JpaRepository<DemandeValidateur, Long> {

    List<DemandeValidateur> findByDemandeId(Long demandeId);

    long countByInstanceAndValidationStatus(
            InstanceValidation instance, ValidationStatus status);
    List<DemandeValidateur> findByInstanceId(Long instanceId);

    Optional<DemandeValidateur> findByDemandeIdAndInstanceId(Long demandeId, Long instanceId);
    long countByInstanceIdAndValidationStatus(Long instanceId, ValidationStatus validationStatus);

}