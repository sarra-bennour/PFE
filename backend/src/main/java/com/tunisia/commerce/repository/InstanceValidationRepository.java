package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.InstanceValidation;
import com.tunisia.commerce.entity.StructureInterne;
import com.tunisia.commerce.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InstanceValidationRepository extends JpaRepository<InstanceValidation, Long> {

    Optional<InstanceValidation> findByEmail(String email);
    Optional<InstanceValidation> findByVerificationToken(String verificationToken);
    Optional<InstanceValidation> findByResetPasswordToken(String token);
    List<InstanceValidation> findByStructureAndUserStatut(StructureInterne structure, UserStatus statut);


}