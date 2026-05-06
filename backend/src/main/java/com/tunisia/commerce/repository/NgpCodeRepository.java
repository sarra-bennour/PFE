package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.NgpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NgpCodeRepository extends JpaRepository<NgpCode, Long> {

    Optional<NgpCode> findByNgpCode(String ngpCode);

    List<NgpCode> findByCategoryCode(String categoryCode);

    List<NgpCode> findByProductType(String productType);

    List<NgpCode> findByProductNameFrContaining(String keyword);

    List<NgpCode> findByProductNameArContaining(String keyword);

    List<NgpCode> findByProductNameEnContaining(String keyword);

    @Query("SELECT n FROM NgpCode n WHERE n.categoryCode = :categoryCode AND n.isActive = true")
    List<NgpCode> findActiveByCategory(@Param("categoryCode") String categoryCode);

    @Query("SELECT n FROM NgpCode n WHERE n.productType = :type AND n.isActive = true ORDER BY n.categoryCode")
    List<NgpCode> findActiveByProductType(@Param("type") String productType);

    boolean existsByNgpCode(String ngpCode);
}