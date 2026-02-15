package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailAndRole(String email, UserRole role);
    List<User> findByRole(UserRole role);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE TYPE(u) = :userType")
    List<User> findByUserType(@Param("userType") Class<?> userType);
}