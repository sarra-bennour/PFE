package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.repository.*;
import com.tunisia.commerce.service.EmailService;
import com.tunisia.commerce.service.UserService;
import com.tunisia.commerce.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final ExportateurRepository exportateurRepository;
    private final ImportateurRepository importateurRepository;
    private final DeactivationRequestRepository deactivationRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    @Value("${app.verification.expiry-hours}")
    private int verificationExpiryHours;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.admin.email}")  // AJOUTEZ CETTE LIGNE
    private String adminEmail;

    Logger logger = Logger.getLogger(getClass().getName());


    @Override
    @Transactional
    public UserDTO registerExportateur(ExportateurSignupRequest request) {
        logger.info("=== INSCRIPTION EXPORTATEUR ===");

        // Validation
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }
        if (exportateurRepository.existsByNumeroRegistreCommerce(request.getTinNumber())) {
            throw new IllegalArgumentException("Numéro de registre de commerce déjà utilisé");
        }

        // Générer le token de vérification
        String verificationToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(verificationExpiryHours);

        // ✅ SOLUTION: Créer DIRECTEMENT l'exportateur avec TOUS les champs
        // Les champs de User sont accessibles car ExportateurEtranger extends User
        ExportateurEtranger exportateur = new ExportateurEtranger();

        // === CHAMPS DE LA CLASSE PARENT (User) ===
        exportateur.setNom(request.getCompanyName());        // Nom de l'entreprise
        exportateur.setPrenom(request.getLegalRep());        // Représentant légal
        exportateur.setEmail(request.getEmail());            // Email
        exportateur.setTelephone(request.getPhone());        // Téléphone
        exportateur.setRole(UserRole.EXPORTATEUR);          // Rôle
        exportateur.setStatut(UserStatus.INACTIF);           // Statut (inactif tant que email non vérifié)
        exportateur.setDateCreation(LocalDateTime.now());    // Date de création

        // === CHAMPS SPÉCIFIQUES À L'EXPORTATEUR ===
        exportateur.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        exportateur.setPaysOrigine(request.getCountry());
        exportateur.setRaisonSociale(request.getCompanyName());
        exportateur.setNumeroRegistreCommerce(request.getTinNumber());
        exportateur.setAdresseLegale(request.getAddress());
        exportateur.setVille(request.getCity());
        exportateur.setSiteWeb(request.getWebsite());
        exportateur.setRepresentantLegal(request.getLegalRep());

        // === CHAMPS DE VÉRIFICATION ===
        exportateur.setEmailVerified(false);
        exportateur.setVerificationToken(verificationToken);
        exportateur.setVerificationTokenExpiry(tokenExpiry);

        // Optionnel: TVA
        if (request.getNumeroTVA() != null) {
            exportateur.setNumeroTVA(request.getNumeroTVA());
        }

        logger.info("Création de l'exportateur avec email: " + exportateur.getEmail());
        logger.info("Rôle défini: " + exportateur.getRole());

        // ✅ Une seule sauvegarde - Hibernate s'occupe de tout !
        // Grâce à l'héritage JOINED, Hibernate va:
        // 1. Insérer d'abord dans la table 'users'
        // 2. Récupérer l'ID généré
        // 3. Insérer dans la table 'exportateurs' avec le même ID
        ExportateurEtranger saved = exportateurRepository.save(exportateur);

        logger.info("Exportateur sauvegardé avec ID: " + saved.getId());
        logger.info("Vérification dans users: " + userRepository.findById(saved.getId()).isPresent());

        // Envoyer l'email de vérification
        try {
            emailService.sendVerificationEmail(
                    request.getEmail(),
                    verificationToken,
                    request.getCompanyName()
            );
            logger.info("Email de vérification envoyé à: " + request.getEmail());
        } catch (Exception e) {
            logger.severe("Erreur lors de l'envoi de l'email: " + e.getMessage());
        }

        return mapToUserDTO(saved);
    }


    private String generateVerificationToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    @Override
    @Transactional
    public boolean verifyEmail(String token) {
        logger.info("=== DÉBUT VÉRIFICATION EMAIL ===");
        logger.info("Token reçu: '" + token + "'");
        logger.info("Longueur token: " + token.length());

        // Log 1: Vérifier si le repository trouve le token
        logger.info("Recherche du token dans la base...");
        Optional<ExportateurEtranger> exportateurOpt = exportateurRepository.findByVerificationToken(token);

        if (!exportateurOpt.isPresent()) {
            logger.severe("ÉCHEC: Aucun exportateur trouvé avec ce token!");

            // Log tous les tokens pour debug
            logger.info("Liste de tous les tokens dans la base:");
            List<ExportateurEtranger> all = exportateurRepository.findAll();
            for (ExportateurEtranger exp : all) {
                logger.info(" - Email: " + exp.getEmail() +
                        " | Token: " + exp.getVerificationToken() +
                        " | Token length: " + (exp.getVerificationToken() != null ? exp.getVerificationToken().length() : 0));
            }

            throw new RuntimeException("Token de vérification invalide");
        }

        ExportateurEtranger exportateur = exportateurOpt.get();
        logger.info("SUCCÈS: Exportateur trouvé!");
        logger.info("Email: " + exportateur.getEmail());
        logger.info("Email vérifié actuellement: " + exportateur.isEmailVerified());
        logger.info("Token expiry: " + exportateur.getVerificationTokenExpiry());

        // Vérifier l'expiration
        if (exportateur.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            logger.warning("Token expiré!");
            throw new RuntimeException("Le token de vérification a expiré");
        }

        // Mettre à jour
        exportateur.setEmailVerified(true);
        exportateur.setStatut(UserStatus.PROFILE_INCOMPLETE);
        exportateur.setVerificationToken(null);
        exportateur.setVerificationTokenExpiry(null);

        ExportateurEtranger saved = exportateurRepository.save(exportateur);
        logger.info("SUCCÈS COMPLET: Email vérifié pour " + saved.getEmail());
        logger.info("Nouveau statut email vérifié: " + saved.isEmailVerified());

        return true;
    }
    @Override
    public void resendVerificationEmail(String email) {
        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        if (exportateur.isEmailVerified()) {
            throw new RuntimeException("L'email est déjà vérifié");
        }

        // Générer un nouveau token
        String newToken = generateVerificationToken();
        LocalDateTime newExpiry = LocalDateTime.now().plusHours(verificationExpiryHours);

        exportateur.setVerificationToken(newToken);
        exportateur.setVerificationTokenExpiry(newExpiry);

        exportateurRepository.save(exportateur);

        // Renvoyer l'email
        emailService.sendVerificationEmail(
                email,
                newToken,
                exportateur.getRaisonSociale()
        );
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier le mot de passe pour les exportateurs et administrateurs
        if (user.getRole() == UserRole.EXPORTATEUR || user.getRole() == UserRole.ADMIN) {
            ExportateurEtranger exportateur = exportateurRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

            if (!passwordEncoder.matches(request.getPassword(), exportateur.getPasswordHash())) {
                throw new IllegalArgumentException("Mot de passe incorrect");
            }
        }

        // Mettre à jour la dernière connexion
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        System.out.println("userrrrrrrr"+ user);

        // Générer le token JWT
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());

        // Vérifier si 2FA est activé
        boolean requires2FA = false;
        if (user instanceof ExportateurEtranger) {
            requires2FA = ((ExportateurEtranger) user).isTwoFactorEnabled();
        }

        return LoginResponse.builder()
                .token(token)
                .requiresTwoFactor(requires2FA)
                .user(mapToUserDTO(user))
                .build();
    }

    @Override
    @Transactional
    public LoginResponse mobileLogin(MobileLoginRequest request) {
        // Rechercher l'importateur par matricule Mobile ID
        ImportateurTunisien importateur = importateurRepository
                .findByMobileIdMatricule(request.getMatricule())
                .orElseThrow(() -> new RuntimeException("Importateur non trouvé"));

        // Vérifier le PIN (dans un cas réel, cela serait vérifié via l'API Mobile ID)
        if (!importateur.getMobileIdPin().equals(request.getPin())) {
            throw new IllegalArgumentException("PIN incorrect");
        }

        // Mettre à jour la dernière connexion
        importateur.setLastLogin(LocalDateTime.now());
        importateurRepository.save(importateur);

        // Générer le token JWT
        String token = jwtUtil.generateToken(importateur.getEmail(), importateur.getRole().name());

        return LoginResponse.builder()
                .token(token)
                .requiresTwoFactor(false)
                .user(mapToUserDTO(importateur))
                .build();
    }

    @Override
    @Cacheable(value = "users", key = "#email")
    public UserDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return mapToUserDTO(user);
    }

    @Override
    public void enableTwoFactorAuth(String email) {
        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        // Générer un secret pour 2FA (dans un cas réel, utiliser TOTP)
        String secret = UUID.randomUUID().toString();
        exportateur.setTwoFactorSecret(secret);
        exportateur.setTwoFactorEnabled(true);

        exportateurRepository.save(exportateur);
    }

    @Override
    public boolean verifyTwoFactorCode(String email, String code) {
        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        // Vérifier le code (dans un cas réel, valider avec TOTP)
        // Pour l'exemple, on accepte tout code qui n'est pas vide
        return exportateur.isTwoFactorEnabled() &&
                exportateur.getTwoFactorSecret() != null &&
                !code.trim().isEmpty();
    }

    private UserDTO mapToUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setNom(user.getNom());
        dto.setPrenom(user.getPrenom());
        dto.setEmail(user.getEmail());
        dto.setTelephone(user.getTelephone());
        dto.setRole(user.getRole());
        dto.setStatut(user.getStatut());
        dto.setDateCreation(user.getDateCreation());
        dto.setLastLogin(user.getLastLogin());

        if (user instanceof ExportateurEtranger) {
            ExportateurEtranger exportateur = (ExportateurEtranger) user;

            // MAPPER TOUS LES CHAMPS DE L'EXPORTATEUR
            dto.setPaysOrigine(exportateur.getPaysOrigine());
            dto.setRaisonSociale(exportateur.getRaisonSociale());
            dto.setNumeroRegistreCommerce(exportateur.getNumeroRegistreCommerce());
            dto.setAdresseLegale(exportateur.getAdresseLegale());
            dto.setVille(exportateur.getVille());
            dto.setSiteWeb(exportateur.getSiteWeb());
            dto.setRepresentantLegal(exportateur.getRepresentantLegal());
            dto.setNumeroTVA(exportateur.getNumeroTVA());
            dto.setStatutAgrement(exportateur.getStatutAgrement());
            dto.setNumeroAgrement(exportateur.getNumeroAgrement());
            dto.setDateAgrement(exportateur.getDateAgrement());
            dto.setEmailVerified(exportateur.isEmailVerified());
            dto.setTwoFactorEnabled(exportateur.isTwoFactorEnabled());
            dto.setDocumentsCount(exportateur.getDocuments() != null ? exportateur.getDocuments().size() : 0);
        }

        return dto;
    }

    private final Set<String> invalidatedTokens = Collections.newSetFromMap(new ConcurrentHashMap<>());

    @Override
    public void logout(String token) {
        logger.info("=== LOGOUT ===");

        if (token == null || token.isEmpty()) {
            throw new IllegalArgumentException("Token manquant");
        }

        // Extraire le token du format "Bearer <token>"
        String jwtToken = extractJwtToken(token);

        // Ajouter le token à la liste des tokens invalides
        invalidatedTokens.add(jwtToken);

        // Optionnel : Stocker dans Redis pour la distribution
        try {
            // Stocker avec expiration (même durée que le JWT)
            long expirationTime = jwtUtil.getExpirationTime(jwtToken);
            long ttl = Math.max(0, expirationTime - System.currentTimeMillis());

            // Si vous utilisez Redis, stockez le token invalidé
            // redisTemplate.opsForValue().set("blacklist:" + jwtToken, "invalid", ttl, TimeUnit.MILLISECONDS);

            logger.info("Token invalidé avec succès. Expire dans: " + ttl + "ms");
        } catch (Exception e) {
            logger.severe("Erreur lors du stockage du token invalidé: " + e.getMessage());
        }
    }

    // Méthode utilitaire pour extraire le JWT
    private String extractJwtToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader; // Si déjà sans "Bearer "
    }

    // Méthode pour vérifier si un token est invalidé
    public boolean isTokenInvalidated(String token) {
        return invalidatedTokens.contains(token);
    }

    // Méthode pour nettoyer les tokens expirés (optionnel)
    @Scheduled(fixedRate = 3600000) // Toutes les heures
    public void cleanupInvalidatedTokens() {
        // Ici, vous pourriez nettoyer les tokens expirés de la liste
        // ou de Redis si vous l'utilisez
        logger.info("Nettoyage des tokens invalidés...");
        // Pour Redis, les tokens expireront automatiquement
    }

    // ==================== PASSWORD MANAGEMENT ====================

    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        logger.info("=== CHANGEMENT DE MOT DE PASSE ===");
        logger.info("Email: " + email);

        // Récupérer l'exportateur
        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        logger.info("Exportateur trouvé: " + exportateur.getEmail());

        // Vérifier le mot de passe actuel
        if (!passwordEncoder.matches(request.getCurrentPassword(), exportateur.getPasswordHash())) {
            logger.severe("Mot de passe actuel incorrect");
            throw new IllegalArgumentException("Mot de passe actuel incorrect");
        }

        logger.info("Mot de passe actuel validé");

        // Vérifier que le nouveau mot de passe est différent de l'ancien
        if (passwordEncoder.matches(request.getNewPassword(), exportateur.getPasswordHash())) {
            logger.warning("Le nouveau mot de passe est identique à l'ancien");
            throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'actuel");
        }

        // Vérifier la force du mot de passe
        validatePasswordStrength(request.getNewPassword());

        // Mettre à jour le mot de passe
        exportateur.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));

        // Mettre à jour la date de changement (si ce champ existe dans l'entité)
        try {
            exportateur.getClass().getMethod("setLastPasswordChange", LocalDateTime.class);
            exportateur.setLastPasswordChange(LocalDateTime.now());
        } catch (NoSuchMethodException e) {
            // Le champ n'existe pas, ce n'est pas grave
            logger.info("Le champ lastPasswordChange n'existe pas dans l'entité");
        }

        // Si l'utilisateur avait un token de réinitialisation, le nettoyer
        exportateur.setResetPasswordToken(null);
        exportateur.setResetPasswordTokenExpiry(null);

        ExportateurEtranger saved = exportateurRepository.save(exportateur);

        logger.info("Mot de passe changé avec succès pour: " + saved.getEmail());

        // Envoyer une notification par email
        try {
            emailService.sendPasswordChangeNotification(
                    email,
                    exportateur.getRaisonSociale()
            );
            logger.info("Notification de changement de mot de passe envoyée à: " + email);
        } catch (Exception e) {
            logger.warning("Erreur lors de l'envoi de la notification: " + e.getMessage());
            // Ne pas lancer d'exception, le changement de mot de passe a réussi
        }
    }

    @Override
    @Transactional
    public void initiatePasswordReset(String email) {
        logger.info("=== INITIATION RÉINITIALISATION MOT DE PASSE ===");

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        // Générer le token de réinitialisation
        String resetToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(24); // 24 heures

        // Sauvegarder le token
        exportateur.setResetPasswordToken(resetToken);
        exportateur.setResetPasswordTokenExpiry(tokenExpiry);
        exportateurRepository.save(exportateur);

        // Envoyer l'email
        try {
            emailService.sendPasswordResetEmail(
                    email,
                    resetToken,
                    exportateur.getRaisonSociale()
            );
            logger.info("Email de réinitialisation envoyé à: " + email);
        } catch (Exception e) {
            logger.severe("Erreur lors de l'envoi de l'email de réinitialisation: " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email de réinitialisation");
        }
    }

    @Override
    @Transactional
    public boolean validateResetToken(String token) {
        logger.info("=== VALIDATION TOKEN RÉINITIALISATION ===");

        ExportateurEtranger exportateur = exportateurRepository.findByResetPasswordToken(token)
                .orElseThrow(() -> new RuntimeException("Token de réinitialisation invalide"));

        // Vérifier si le token a expiré
        if (exportateur.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Le token de réinitialisation a expiré");
        }

        return true;
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        logger.info("=== RÉINITIALISATION MOT DE PASSE ===");

        ExportateurEtranger exportateur = exportateurRepository.findByResetPasswordToken(token)
                .orElseThrow(() -> new RuntimeException("Token de réinitialisation invalide"));

        // Vérifier si le token a expiré
        if (exportateur.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Le token de réinitialisation a expiré");
        }

        // Vérifier la force du mot de passe
        validatePasswordStrength(newPassword);

        // Mettre à jour le mot de passe
        exportateur.setPasswordHash(passwordEncoder.encode(newPassword));

        // Mettre à jour la date de changement (si ce champ existe dans l'entité)
        try {
            exportateur.getClass().getMethod("setLastPasswordChange", LocalDateTime.class);
            exportateur.setLastPasswordChange(LocalDateTime.now());
        } catch (NoSuchMethodException e) {
            // Le champ n'existe pas, ce n'est pas grave
            logger.info("Le champ lastPasswordChange n'existe pas dans l'entité");
        }

        // Invalider le token
        exportateur.setResetPasswordToken(null);
        exportateur.setResetPasswordTokenExpiry(null);

        exportateurRepository.save(exportateur);

        logger.info("Mot de passe réinitialisé pour: " + exportateur.getEmail());

        // Envoyer une notification
        try {
            emailService.sendPasswordChangeNotification(
                    exportateur.getEmail(),
                    exportateur.getRaisonSociale()
            );
        } catch (Exception e) {
            logger.warning("Erreur lors de l'envoi de la notification: " + e.getMessage());
        }
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Le mot de passe doit contenir au moins 6 caractères");
        }

        // Exigences de sécurité optionnelles
        if (password.length() < 8) {
            logger.warning("Mot de passe faible: moins de 8 caractères");
        }

        // Vérifications facultatives pour renforcer la sécurité
        boolean hasUpperCase = false;
        boolean hasLowerCase = false;
        boolean hasDigit = false;

        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpperCase = true;
            if (Character.isLowerCase(c)) hasLowerCase = true;
            if (Character.isDigit(c)) hasDigit = true;
        }

        // Avertissements mais pas d'erreur
        if (!hasUpperCase) {
            logger.warning("Mot de passe sans majuscule - sécurité faible");
        }
        if (!hasLowerCase) {
            logger.warning("Mot de passe sans minuscule - sécurité faible");
        }
        if (!hasDigit) {
            logger.warning("Mot de passe sans chiffre - sécurité faible");
        }
    }


    @Override
    @Transactional
    public UserDTO updateProfile(String email, UpdateProfileRequest request) {
        logger.info("=== MISE À JOUR DU PROFIL ===");
        logger.info("Email: " + email);

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        // Mettre à jour uniquement les champs fournis (non null)
        if (request.getCompanyName() != null && !request.getCompanyName().isEmpty()) {
            exportateur.setRaisonSociale(request.getCompanyName());
            exportateur.setNom(request.getCompanyName()); // Mettre à jour aussi le champ nom dans User
        }

        if (request.getPhone() != null && !request.getPhone().isEmpty()) {
            exportateur.setTelephone(request.getPhone());
        }

        if (request.getAddress() != null && !request.getAddress().isEmpty()) {
            exportateur.setAdresseLegale(request.getAddress());
        }

        if (request.getCountry() != null && !request.getCountry().isEmpty()) {
            exportateur.setPaysOrigine(request.getCountry());
        }

        if (request.getCity() != null && !request.getCity().isEmpty()) {
            exportateur.setVille(request.getCity());
        }

        if (request.getTinNumber() != null && !request.getTinNumber().isEmpty()) {
            exportateur.setNumeroRegistreCommerce(request.getTinNumber());
        }

        if (request.getWebsite() != null && !request.getWebsite().isEmpty()) {
            exportateur.setSiteWeb(request.getWebsite());
        }

        if (request.getLegalRep() != null && !request.getLegalRep().isEmpty()) {
            exportateur.setRepresentantLegal(request.getLegalRep());
            exportateur.setPrenom(request.getLegalRep()); // Mettre à jour aussi le champ prenom dans User
        }

        ExportateurEtranger saved = exportateurRepository.save(exportateur);
        logger.info("Profil mis à jour avec succès pour: " + saved.getEmail());

        return mapToUserDTO(saved);
    }

    @Override
    @Transactional
    public void createDeactivationRequest(String email, String reason, boolean isUrgent) {
        logger.info("=== DEMANDE DE DÉSACTIVATION DE COMPTE ===");
        logger.info("Email: " + email);
        logger.info("Urgent: " + isUrgent);

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        // Vérifier si une demande est déjà en cours
        boolean hasPendingRequest = deactivationRequestRepository.existsByUserIdAndStatusIn(
                exportateur.getId(),
                List.of(DeactivationStatus.PENDING, DeactivationStatus.IN_REVIEW)
        );

        if (hasPendingRequest) {
            throw new RuntimeException("Une demande de désactivation est déjà en cours de traitement");
        }

        // Déterminer le type de demande
        DeactivationRequestType requestType = isUrgent ?
                DeactivationRequestType.URGENT :
                (reason != null && !reason.isEmpty() ?
                        DeactivationRequestType.WITH_REASON :
                        DeactivationRequestType.WITHOUT_REASON);

        // Créer et sauvegarder la demande
        DeactivationRequest deactivationRequest = DeactivationRequest.builder()
                .user(exportateur)
                .reason(reason)
                .requestType(requestType)
                .status(DeactivationStatus.PENDING)
                .isUrgent(isUrgent)
                .notificationSent(false)
                .build();

        deactivationRequest = deactivationRequestRepository.save(deactivationRequest);
        logger.info("Demande enregistrée avec ID: " + deactivationRequest.getId());

        // Envoyer les emails
        sendDeactivationEmails(exportateur, deactivationRequest, reason, isUrgent);

        logger.info("Demande de désactivation créée avec succès pour: " + email);
    }

    private void sendDeactivationEmails(ExportateurEtranger exportateur,
                                        DeactivationRequest request,
                                        String reason,
                                        boolean isUrgent) {

        // Email à l'admin
        Map<String, Object> adminParams = new HashMap<>();
        adminParams.put("companyName", exportateur.getRaisonSociale());
        adminParams.put("email", exportateur.getEmail());
        adminParams.put("phone", exportateur.getTelephone());
        adminParams.put("tinNumber", exportateur.getNumeroRegistreCommerce());
        adminParams.put("country", exportateur.getPaysOrigine());
        adminParams.put("requestId", request.getId().toString());
        adminParams.put("requestDate", request.getRequestDate().toString());
        adminParams.put("reason", reason);
        adminParams.put("isUrgent", isUrgent);
        adminParams.put("adminUrl", frontendUrl + "/#/admin/deactivation-requests/" + request.getId());

        if (isUrgent) {
            adminParams.put("urgentMessage", "⚠️ DEMANDE URGENTE À TRAITER IMMÉDIATEMENT ⚠️");
            adminParams.put("processingDeadline", "24 heures");
        }

        emailService.sendValidationNotification(
                adminEmail,
                "Administration",
                ValidationNotificationType.DEACTIVATION_REQUEST,
                adminParams
        );

        // Email de confirmation à l'utilisateur
        Map<String, Object> userParams = new HashMap<>();
        userParams.put("companyName", exportateur.getRaisonSociale());
        userParams.put("requestId", "DEM-" + String.format("%06d", request.getId()));
        userParams.put("requestDate", request.getRequestDate().toString());
        userParams.put("reason", reason);
        userParams.put("dashboardUrl", frontendUrl + "/#/profile");
        userParams.put("supportEmail", "support@tunisia-commerce.gov.tn");

        if (isUrgent) {
            userParams.put("processingTime", "sous 24h");
            userParams.put("priorityMessage", "Votre demande a été marquée comme prioritaire.");
        } else {
            userParams.put("processingTime", "sous 48h");
        }

        emailService.sendValidationNotification(
                exportateur.getEmail(),
                exportateur.getRaisonSociale(),
                ValidationNotificationType.DEACTIVATION_CONFIRMATION,
                userParams
        );

        // Marquer la notification comme envoyée
        request.setNotificationSent(true);
        request.setNotificationDate(LocalDateTime.now());
        deactivationRequestRepository.save(request);
    }

    // Méthode pour annuler une demande (par l'utilisateur)
    @Transactional
    public void cancelDeactivationRequest(String email, Long requestId) {
        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        DeactivationRequest request = deactivationRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        // Vérifier que la demande appartient bien à cet utilisateur
        if (!request.getUser().getId().equals(exportateur.getId())) {
            throw new RuntimeException("Cette demande ne vous appartient pas");
        }

        // Vérifier que la demande peut être annulée
        if (request.getStatus() != DeactivationStatus.PENDING) {
            throw new RuntimeException("Cette demande ne peut plus être annulée car elle est déjà en cours de traitement");
        }

        request.setStatus(DeactivationStatus.CANCELLED);
        deactivationRequestRepository.save(request);

        logger.info("Demande de désactivation annulée pour: " + email);
    }

    // Méthode pour récupérer l'historique des demandes d'un utilisateur
    public List<DeactivationRequest> getUserDeactivationRequests(String email) {
        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        return deactivationRequestRepository.findByUserIdOrderByRequestDateDesc(exportateur.getId());
    }

    // Méthode pour vérifier si l'utilisateur peut faire une nouvelle demande
    public boolean canCreateDeactivationRequest(String email) {
        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        return !deactivationRequestRepository.existsByUserIdAndStatusIn(
                exportateur.getId(),
                List.of(DeactivationStatus.PENDING, DeactivationStatus.IN_REVIEW)
        );
    }

}