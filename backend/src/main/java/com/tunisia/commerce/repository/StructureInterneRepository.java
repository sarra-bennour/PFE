package com.tunisia.commerce.repository;


import com.tunisia.commerce.entity.StructureInterne;
import com.tunisia.commerce.enums.StructureType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StructureInterneRepository extends JpaRepository<StructureInterne, Long> {

    Optional<StructureInterne> findByOfficialName(String name);
    List<StructureInterne> findByOfficialNameContaining(String name);
    List<StructureInterne> findByIsActiveTrue();

    List<StructureInterne> findByType(StructureType type);

    List<StructureInterne> findByOfficialNameContainingIgnoreCase(String name);
    boolean existsByOfficialNameIgnoreCase(String officialName);


    boolean existsByCode(String code);

    boolean existsByOfficialName(String officialName);
    boolean existsByOfficialNameAr(String officialName);


}