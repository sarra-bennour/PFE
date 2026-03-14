package com.tunisia.commerce.repository;

import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailAndRole(String email, UserRole role);
    List<User> findByRole(UserRole role);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE TYPE(u) = :userType")
    List<User> findByUserType(@Param("userType") Class<?> userType);

    @Modifying
    @Query(value = "UPDATE users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login_attempt = CURRENT_TIMESTAMP WHERE email = :email", nativeQuery = true)
    void incrementFailedAttempts(@Param("email") String email);

    @Modifying
    @Query(value = "UPDATE users SET user_statut = :status, failed_login_attempts = 0, last_failed_login_attempt = NULL WHERE email = :email", nativeQuery = true)
    void lockAccount(@Param("email") String email, @Param("status") String status);

    @Modifying
    @Query(value = "UPDATE users SET failed_login_attempts = 0, last_failed_login_attempt = NULL, last_login = CURRENT_TIMESTAMP WHERE email = :email", nativeQuery = true)
    void resetFailedAttempts(@Param("email") String email);

    @Query(value = "SELECT failed_login_attempts FROM users WHERE email = :email", nativeQuery = true)
    Integer getFailedAttempts(@Param("email") String email);

    @Query(value = "SELECT user_statut FROM users WHERE email = :email", nativeQuery = true)
    String getUserStatus(@Param("email") String email);

    @Query(value = "SELECT last_failed_login_attempt FROM users WHERE email = :email", nativeQuery = true)
    LocalDateTime getLastFailedAttempt(@Param("email") String email);
}