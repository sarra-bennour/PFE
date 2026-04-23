package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.InstanceValidation;
import com.tunisia.commerce.enums.InstanceValidationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InstanceValidationRepository extends JpaRepository<InstanceValidation, Long> {

    Optional<InstanceValidation> findByEmail(String email);
    Optional<InstanceValidation> findByVerificationToken(String verificationToken);
    Optional<InstanceValidation> findByResetPasswordToken(String token);

}