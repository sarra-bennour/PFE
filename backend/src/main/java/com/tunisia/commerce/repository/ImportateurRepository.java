package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.ImportateurTunisien;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ImportateurRepository extends JpaRepository<ImportateurTunisien, Long> {
    Optional<ImportateurTunisien> findByEmail(String email);
    Optional<ImportateurTunisien> findByMobileIdMatricule(String mobileIdMatricule);
    boolean existsByMatriculeFiscale(String matriculeFiscale);
}