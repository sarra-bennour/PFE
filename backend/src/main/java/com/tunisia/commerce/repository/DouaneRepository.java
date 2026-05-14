package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Douane;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DouaneRepository extends JpaRepository<Douane, Long> {
    boolean existsByEmail(String email);
    Optional<Douane> findByEmail(String email);
    Optional<Douane> findByVerificationToken(String verificationToken);

}