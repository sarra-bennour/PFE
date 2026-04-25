// StructureCompetenceRepository.java
package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.StructureCompetence;
import com.tunisia.commerce.entity.StructureInterne;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Set;

public interface StructureCompetenceRepository extends JpaRepository<StructureCompetence, Long> {

    // Trouver les structures qui peuvent valider une catégorie spécifique
    List<StructureCompetence> findByStructure(StructureInterne structure);

    // Trouver les structures compétentes pour plusieurs catégories
    @Query("SELECT sc FROM StructureCompetence sc WHERE sc.productCategory IN :categories AND sc.isActive = true")
    List<StructureCompetence> findByProductCategories(@Param("categories") Set<String> categories);

    // Trouver les compétences d'une structure
    List<StructureCompetence> findByStructureAndIsActiveTrue(StructureInterne structure);

    // Trouver le validateur par défaut (compétence 'default')
    @Query("SELECT sc FROM StructureCompetence sc WHERE sc.productCategory = 'default' AND sc.isActive = true")
    List<StructureCompetence> findDefaultValidators();
}