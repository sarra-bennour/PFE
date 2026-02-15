package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.ExportateurEtranger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ExportateurRepository extends JpaRepository<ExportateurEtranger, Long> {
    Optional<ExportateurEtranger> findByEmail(String email);
    Optional<ExportateurEtranger> findByNumeroRegistreCommerce(String numeroRegistreCommerce);
    boolean existsByNumeroRegistreCommerce(String numeroRegistreCommerce);
    @Query("SELECT e FROM ExportateurEtranger e WHERE e.verificationToken = :token")
    Optional<ExportateurEtranger> findByVerificationToken(@Param("token") String token);
    Optional<ExportateurEtranger> findByResetPasswordToken(String token);
}