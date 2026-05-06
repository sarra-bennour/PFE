package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.Country;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CountryRepository extends JpaRepository<Country, String> {

    Optional<Country> findByCode(String code);

    List<Country> findByHasFreeTradeAgreement(boolean hasFreeTradeAgreement);

    List<Country> findByIsEuMember(boolean isEuMember);

    List<Country> findByRequiresCertificateOfOrigin(boolean requiresCertificateOfOrigin);

    boolean existsByCode(String code);
}