package com.tunisia.commerce.dto.user;

import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.enums.UserStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserDTO {
    private Long id;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private UserRole role;
    private UserStatus statut;
    private LocalDateTime dateCreation;
    private LocalDateTime lastLogin;
    private boolean emailVerified;

    // Champs spécifiques aux exportateurs
    private String companyName;
    private String country;
    private boolean isTwoFactorEnabled;

    // Champs spécifiques aux importateurs
    private String matriculeFiscale;
    private String numeroRegistreCommerceTN;


}