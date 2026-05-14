package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Banque;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BanqueRepository extends JpaRepository<Banque, Long> {
    boolean existsByEmail(String email);
    Optional<Banque> findByEmail(String email);
    Optional<Banque> findByVerificationToken(String verificationToken);

}