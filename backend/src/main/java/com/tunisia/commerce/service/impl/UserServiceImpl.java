package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.exception.AuthException;
import com.tunisia.commerce.exception.MobileAuthException;
import com.tunisia.commerce.repository.*;
import com.tunisia.commerce.service.EmailService;
import com.tunisia.commerce.service.UserService;
import com.tunisia.commerce.config.JwtUtil;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
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
    private final TwoFactorAuthService twoFactorAuthService;


    @Value("${app.verification.expiry-hours}")
    private int verificationExpiryHours;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${spring.mail.username}")
    private String adminEmail;

    Logger logger = Logger.getLogger(getClass().getName());


    @Override
    @Transactional
    public UserDTO registerExportateur(ExportateurSignupRequest request) {
        logger.info("=== INSCRIPTION EXPORTATEUR ===");

        // Validation des champs obligatoires
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw AuthException.missingRequiredField("email");
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw AuthException.missingRequiredField("password");
        }
        if (request.getCompanyName() == null || request.getCompanyName().trim().isEmpty()) {
            throw AuthException.missingRequiredField("companyName");
        }
        if (request.getTinNumber() == null || request.getTinNumber().trim().isEmpty()) {
            throw AuthException.missingRequiredField("tinNumber");
        }
        if (request.getCountry() == null || request.getCountry().trim().isEmpty()) {
            throw AuthException.missingRequiredField("country");
        }

        // Validation du format email
        if (!isValidEmail(request.getEmail())) {
            throw AuthException.invalidEmailFormat(request.getEmail());
        }

        // Validation du pays
        if (!isValidCountryCode(request.getCountry())) {
            throw AuthException.invalidCountryCode(request.getCountry());
        }

        // Validation du mot de passe (minimum 8 caractères)
        if (request.getPassword().length() < 8) {
            throw AuthException.weakPassword("Le mot de passe doit contenir au moins 8 caractères");
        }

        // Validation supplémentaire du mot de passe (si besoin)
        if (!hasStrongPassword(request.getPassword())) {
            throw AuthException.weakPassword("Le mot de passe doit contenir au moins une majuscule, un chiffre et un caractère spécial");
        }

        // Validation du numéro de téléphone (optionnel mais recommandé)
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            if (!isValidPhoneNumber(request.getPhone())) {
                throw AuthException.invalidPhoneNumber(request.getPhone());
            }
        }

        // Vérification email déjà utilisé
        if (userRepository.existsByEmail(request.getEmail())) {
            throw AuthException.emailAlreadyUsed(request.getEmail());
        }

        // Vérification numéro registre commerce déjà utilisé
        if (exportateurRepository.existsByNumeroRegistreCommerce(request.getTinNumber())) {
            throw AuthException.tinNumberAlreadyUsed(request.getTinNumber());
        }

        // Générer le token de vérification
        String verificationToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(verificationExpiryHours);

        // Création de l'exportateur
        ExportateurEtranger exportateur = new ExportateurEtranger();

        // === CHAMPS DE LA CLASSE PARENT (User) ===
        exportateur.setNom(request.getCompanyName());        // Nom de l'entreprise
        exportateur.setPrenom(request.getLegalRep());        // Représentant légal
        exportateur.setEmail(request.getEmail());            // Email
        exportateur.setTelephone(request.getPhone());        // Téléphone
        exportateur.setRole(UserRole.EXPORTATEUR);          // Rôle
        exportateur.setUserStatut(UserStatus.INACTIF);           // Statut (inactif tant que email non vérifié)
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

        // Sauvegarde
        ExportateurEtranger saved;
        try {
            saved = exportateurRepository.save(exportateur);
        } catch (Exception e) {
            logger.severe("Erreur lors de la sauvegarde de l'exportateur: " + e.getMessage());
            throw AuthException.registrationFailed(e.getMessage());
        }

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
            // On ne bloque pas l'inscription mais on log l'erreur
            // On pourrait aussi lancer une exception si on veut que l'inscription échoue en cas d'échec d'envoi d'email
            // throw AuthException.emailSendingFailed(request.getEmail(), e.getMessage());
        }

        return mapToUserDTO(saved);
    }

    // Méthodes utilitaires privées
    private boolean isValidEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@(.+)$";
        return email != null && email.matches(emailRegex);
    }

    private boolean isValidCountryCode(String countryCode) {
        // Liste des codes pays valides (à adapter selon vos besoins)
        List<String> validCountryCodes = Arrays.asList("FR", "IT", "TR", "CN", "ES", "DE", "US", "AE", "DZ", "LY", "SA", "MA", "BE", "CH", "UK");
        return countryCode != null && validCountryCodes.contains(countryCode);
    }

    private boolean isValidPhoneNumber(String phoneNumber) {
        // Validation simple: commence par + suivi de chiffres
        String phoneRegex = "^\\+?[0-9]{8,15}$";
        return phoneNumber != null && phoneNumber.matches(phoneRegex);
    }

    private boolean hasStrongPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }

        boolean hasUpperCase = !password.equals(password.toLowerCase());
        boolean hasDigit = password.matches(".*\\d.*");
        boolean hasSpecialChar = password.matches(".*[!@#$%^&*(),.?\":{}|<>].*");

        return hasUpperCase && hasDigit && hasSpecialChar;
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
        exportateur.setUserStatut(UserStatus.ACTIF);
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
    @Transactional(noRollbackFor = AuthException.class)  // ← 1. AJOUTER ICI
    public LoginResponse login(LoginRequest request) {
        try {
            // 1. Vérifier si l'utilisateur existe
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(AuthException::userNotFound);

            // 2. Vérifier le statut
            String currentStatus = userRepository.getUserStatus(request.getEmail());

            if (UserStatus.INACTIF.name().equals(currentStatus)) {
                LocalDateTime lastAttempt = userRepository.getLastFailedAttempt(request.getEmail());

                if (lastAttempt != null) {
                    LocalDateTime unlockTime = lastAttempt.plusMinutes(30);
                    if (LocalDateTime.now().isAfter(unlockTime)) {
                        userRepository.lockAccount(request.getEmail(), UserStatus.ACTIF.name());
                        logger.info("Compte automatiquement débloqué pour: {}"+ request.getEmail());
                    } else {
                        long minutesRemaining = Duration.between(LocalDateTime.now(), unlockTime).toMinutes();
                        throw AuthException.accountLocked((int) minutesRemaining);
                    }
                } else {
                    throw AuthException.accountDisabled();
                }
            }

            // 3. Vérifier le mot de passe
            boolean passwordMatches = false;
            ExportateurEtranger exportateur = null;

            if (user.getRole() == UserRole.EXPORTATEUR || user.getRole() == UserRole.ADMIN) {
                exportateur = exportateurRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                passwordMatches = passwordEncoder.matches(request.getPassword(), exportateur.getPasswordHash());
            }

            if (!passwordMatches) {
                // 4. Incrémenter les tentatives
                userRepository.incrementFailedAttempts(request.getEmail());

                // 5. FORCER L'ÉCRITURE IMMÉDIATE EN BASE
                userRepository.flush();  // ← 2. AJOUTER CETTE LIGNE

                logger.info("=== Tentative échouée pour {} ==="+ request.getEmail());

                // 6. Lire la valeur depuis la base
                int currentAttempts = userRepository.getFailedAttempts(request.getEmail());
                logger.info("Tentatives actuelles en base: {}"+ currentAttempts);

                if (currentAttempts >= 5) {
                    userRepository.lockAccount(request.getEmail(), UserStatus.INACTIF.name());
                    userRepository.flush();  // ← AJOUTER ICI AUSSI
                    logger.info("⚠️ Compte désactivé après {} tentatives"+ currentAttempts);
                    throw AuthException.maxAttemptsExceeded(30);
                }

                int remainingAttempts = 5 - currentAttempts;
                logger.info("Tentatives restantes: {}"+ remainingAttempts);
                throw AuthException.invalidCredentials(remainingAttempts);
            }

            // 7. Succès
            userRepository.resetFailedAttempts(request.getEmail());
            userRepository.flush();  // ← AJOUTER ICI
            logger.info("✅ Connexion réussie pour {}"+ request.getEmail());

            // 8. Recharger l'utilisateur
            User refreshedUser = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(AuthException::userNotFound);

            // 9. Vérifier l'email
            if (refreshedUser.getRole() == UserRole.EXPORTATEUR) {
                ExportateurEtranger freshExportateur = exportateurRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                if (!freshExportateur.isEmailVerified()) {
                    throw AuthException.emailNotVerified(request.getEmail());
                }
            }

            // 10. Générer le token
            String token = jwtUtil.generateToken(refreshedUser.getEmail(), refreshedUser.getRole().name());

            boolean requiresTwoFactor = isTwoFactorEnabled(refreshedUser);

            // Si le 2FA est activé, on ne renvoie pas encore le token d'accès complet
            // Mais on renvoie un token temporaire pour la phase 2FA
            if (requiresTwoFactor) {
                // Générer un token temporaire pour la vérification 2FA
                String tempToken = jwtUtil.generateTempToken(refreshedUser.getEmail(), refreshedUser.getRole().name());

                return LoginResponse.builder()
                        .token(tempToken)
                        .requiresTwoFactor(true)
                        .user(mapToUserDTO(refreshedUser))
                        .build();
            }

            return LoginResponse.builder()
                    .token(token)
                    .requiresTwoFactor(isTwoFactorEnabled(refreshedUser))
                    .user(mapToUserDTO(refreshedUser))
                    .build();

        } catch (AuthException e) {
            throw e;
        } catch (Exception e) {
            logger.warning("Erreur inattendue"+ e);
            throw new RuntimeException("Erreur lors de la connexion: " + e.getMessage());
        }
    }

    private boolean isTwoFactorEnabled(User user) {
        if (user instanceof ExportateurEtranger) {
            return ((ExportateurEtranger) user).isTwoFactorEnabled();
        }
        return false;
    }
    @Override
    @Transactional
    public LoginResponse mobileLogin(MobileLoginRequest request) {
        logger.info("=== LOGIN MOBILE ===");
        logger.info("Matricule reçu: " + request.getMatricule());

        // Validation du format du matricule
        if (request.getMatricule() == null || !request.getMatricule().matches("\\d{10}")) {
            throw MobileAuthException.invalidMatriculeFormat();
        }

        // Validation du format du PIN
        if (request.getPin() == null || !request.getPin().matches("\\d{6}")) {
            throw MobileAuthException.invalidPinFormat();
        }

        // Rechercher l'importateur par matricule Mobile ID
        ImportateurTunisien importateur = importateurRepository
                .findByMobileIdMatricule(request.getMatricule())
                .orElseThrow(() -> MobileAuthException.importateurNotFound(request.getMatricule()));

        logger.info("Importateur trouvé: " + importateur.getEmail() + " avec statut: " + importateur.getUserStatut());

        // Vérifier si le compte est actif
        if (importateur.getUserStatut() != UserStatus.ACTIF) {
            if (importateur.getUserStatut() == UserStatus.INACTIF) {
                // Vérifier si le compte est verrouillé temporairement
                if (importateur.getLastFailedLoginAttempt() != null) {
                    LocalDateTime unlockTime = importateur.getLastFailedLoginAttempt().plusMinutes(30);
                    if (LocalDateTime.now().isBefore(unlockTime)) {
                        long minutesRemaining = Duration.between(LocalDateTime.now(), unlockTime).toMinutes();
                        throw MobileAuthException.accountLocked((int) minutesRemaining);
                    } else {
                        // Déverrouiller automatiquement
                        importateur.setUserStatut(UserStatus.ACTIF);
                        importateur.setFailedLoginAttempts(0);
                        importateur.setLastFailedLoginAttempt(null);
                    }
                } else {
                    throw MobileAuthException.accountInactive(importateur.getUserStatut().name());
                }
            } else {
                throw MobileAuthException.accountInactive(importateur.getUserStatut().name());
            }
        }

        // Vérifier si Mobile ID est vérifié
        if (!importateur.isMobileIdVerified()) {
            throw MobileAuthException.mobileIdNotVerified();
        }

        // Vérifier le PIN
        if (!importateur.getMobileIdPin().equals(request.getPin())) {
            // Incrémenter les tentatives échouées
            int failedAttempts = importateur.getFailedLoginAttempts() + 1;
            importateur.setFailedLoginAttempts(failedAttempts);
            importateur.setLastFailedLoginAttempt(LocalDateTime.now());

            logger.warning("PIN incorrect pour le matricule: " + request.getMatricule() +
                    " (tentative " + failedAttempts + "/5)");

            // Verrouiller après 5 tentatives
            if (failedAttempts >= 5) {
                importateur.setUserStatut(UserStatus.INACTIF);
                importateurRepository.save(importateur);
                logger.warning("Compte verrouillé après " + failedAttempts + " tentatives");
                throw MobileAuthException.accountLocked(30);
            }

            importateurRepository.save(importateur);
            throw MobileAuthException.invalidPin();
        }

        // Réinitialiser les tentatives échouées
        importateur.setFailedLoginAttempts(0);
        importateur.setLastFailedLoginAttempt(null);

        // Mettre à jour la dernière connexion
        importateur.setLastLogin(LocalDateTime.now());
        importateurRepository.save(importateur);

        // Générer le token JWT
        String token = jwtUtil.generateToken(importateur.getEmail(), importateur.getRole().name());

        // Mapper vers DTO
        UserDTO userDTO = mapToUserDTO(importateur);

        logger.info("✅ Login mobile réussi pour: " + importateur.getEmail());

        return LoginResponse.builder()
                .token(token)
                .requiresTwoFactor(false)
                .user(userDTO)
                .build();
    }

    @Override
    public UserDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return mapToUserDTO(user);
    }




    private UserDTO mapToUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setNom(user.getNom());
        dto.setPrenom(user.getPrenom());
        dto.setEmail(user.getEmail());
        dto.setTelephone(user.getTelephone());
        dto.setRole(user.getRole());
        dto.setStatut(user.getUserStatut());
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

        if (user instanceof ImportateurTunisien) {
            ImportateurTunisien importateur = (ImportateurTunisien) user;
            dto.setMobileIdMatricule(importateur.getMobileIdMatricule());
            dto.setMobileIdPin(importateur.getMobileIdPin());
            dto.setEmailVerified(true);
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

    @Override
    @Transactional
    public TwoFactorSetupResponse setupTwoFactorAuth(String email) {
        logger.info("=== CONFIGURATION 2FA ===");
        logger.info("Email: " + email);

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        // Si le 2FA est déjà activé, retourner simplement l'état
        if (exportateur.isTwoFactorEnabled()) {
            return TwoFactorSetupResponse.builder()
                    .alreadyEnabled(true)
                    .build();
        }

        // Générer un vrai secret TOTP (Base32)
        String secret = twoFactorAuthService.generateSecret();

        // Sauvegarder le secret
        exportateur.setTwoFactorSecret(secret);
        exportateurRepository.save(exportateur);

        // Générer l'URL du QR code
        String issuer = "Tunisia Commerce";
        String qrCodeBase64 = twoFactorAuthService.generateQrCodeWithZxing(secret, email, issuer);

        logger.info("Configuration 2FA générée pour: " + email);
        logger.info("Secret (Base32): " + secret);

        return TwoFactorSetupResponse.builder()
                .secret(secret)
                .qrCodeUrl(twoFactorAuthService.getUriForSecret(secret, email, issuer))
                .qrCodeBase64(qrCodeBase64)
                .alreadyEnabled(false)
                .build();
    }

    @Override
    @Transactional
    public boolean enableTwoFactorAuth(String email, String code) {
        logger.info("=== ACTIVATION 2FA ===");
        logger.info("Email: " + email);
        logger.info("Code reçu: '" + code + "'");

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        if (exportateur.isTwoFactorEnabled()) {
            logger.warning("Le 2FA est déjà activé pour: " + email);
            return true;
        }

        String secret = exportateur.getTwoFactorSecret();
        if (secret == null || secret.isEmpty()) {
            throw new RuntimeException("Aucune configuration 2FA trouvée. Veuillez d'abord initialiser la configuration.");
        }

        logger.info("Secret: " + secret);

        // Nettoyer le code
        code = code.trim();

        // Vérifier le code avec une marge (pour la première activation)
        boolean isValid = twoFactorAuthService.verifyCodeWithMargin(secret, code);

        if (isValid) {
            exportateur.setTwoFactorEnabled(true);
            exportateurRepository.save(exportateur);
            logger.info("✅ 2FA activé avec succès pour: " + email);
        } else {
            logger.severe("❌ Code 2FA invalide pour: " + email);

            // Pour déboguer
            try {
                TimeProvider timeProvider = new SystemTimeProvider();
                long currentTime = timeProvider.getTime();
                CodeGenerator codeGenerator = new DefaultCodeGenerator();

                logger.info("Codes attendus pour le secret " + secret + ":");
                logger.info("  Période actuelle (-0s): " + codeGenerator.generate(secret, currentTime));
                logger.info("  Période précédente (-30s): " + codeGenerator.generate(secret, currentTime - 30));
                logger.info("  Période suivante (+30s): " + codeGenerator.generate(secret, currentTime + 30));
            } catch (Exception e) {
                logger.severe("Erreur génération codes test: " + e.getMessage());
            }
        }

        return isValid;
    }

    @Override
    @Transactional
    public boolean disableTwoFactorAuth(String email, String code) {
        logger.info("=== DÉSACTIVATION 2FA ===");
        logger.info("Email: " + email);

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        if (!exportateur.isTwoFactorEnabled()) {
            logger.warning("Le 2FA n'est pas activé pour: " + email);
            return true;
        }

        // Vérifier le code avant de désactiver
        boolean isValid = twoFactorAuthService.verifyCode(exportateur.getTwoFactorSecret(), code);

        if (isValid) {
            exportateur.setTwoFactorEnabled(false);
            // Optionnel: conserver le secret ou le réinitialiser
            // exportateur.setTwoFactorSecret(null);
            exportateurRepository.save(exportateur);
            logger.info("2FA désactivé avec succès pour: " + email);
        } else {
            logger.warning("Code 2FA invalide pour désactivation: " + email);
        }

        return isValid;
    }

    @Override
    public boolean verifyTwoFactorCode(String email, String code) {
        logger.info("=== VÉRIFICATION 2FA ===");
        logger.info("Email: " + email);
        logger.info("Code reçu: '" + code + "'");

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        if (!exportateur.isTwoFactorEnabled()) {
            logger.warning("Tentative de vérification 2FA pour un compte sans 2FA: " + email);
            return false;
        }

        String secret = exportateur.getTwoFactorSecret();
        logger.info("Secret: " + secret);

        if (secret == null || secret.isEmpty()) {
            logger.warning("Secret 2FA manquant pour: " + email);
            return false;
        }

        // Nettoyer le code (enlever les espaces)
        code = code.trim();

        // Vérifier avec la méthode standard
        boolean isValid = twoFactorAuthService.verifyCode(secret, code);

        // Si pas valide, essayer avec marge
        if (!isValid) {
            logger.info("Code non valide avec vérification standard, essai avec marge...");
            isValid = twoFactorAuthService.verifyCodeWithMargin(secret, code);
        }

        if (isValid) {
            logger.info("✅ Code 2FA valide pour: " + email);
        } else {
            logger.severe("❌ Code 2FA invalide pour: " + email);

            // Pour déboguer, afficher les codes attendus
            try {
                TimeProvider timeProvider = new SystemTimeProvider();
                long currentTime = timeProvider.getTime();
                CodeGenerator codeGenerator = new DefaultCodeGenerator();

                logger.info("Codes attendus pour le secret " + secret + ":");
                logger.info("  Période actuelle (-0s): " + codeGenerator.generate(secret, currentTime));
                logger.info("  Période précédente (-30s): " + codeGenerator.generate(secret, currentTime - 30));
                logger.info("  Période suivante (+30s): " + codeGenerator.generate(secret, currentTime + 30));
            } catch (Exception e) {
                logger.severe("Erreur génération codes test: " + e.getMessage());
            }
        }

        return isValid;
    }

    @Override
    public void resendTwoFactorCode(String email) {
        logger.info("=== RENVOI CODE 2FA ===");
        logger.info("Email: " + email);

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        if (!exportateur.isTwoFactorEnabled()) {
            throw new RuntimeException("Le 2FA n'est pas activé pour ce compte");
        }

        // Logique pour renvoyer le code 2FA
        // Par exemple, générer un nouveau code TOTP et l'envoyer par email
        try {
            emailService.sendTwoFactorCode(
                    email,
                    exportateur.getRaisonSociale(),
                    generateTwoFactorCode(exportateur.getTwoFactorSecret())
            );
            logger.info("Code 2FA renvoyé à: " + email);
        } catch (Exception e) {
            logger.severe("Erreur lors de l'envoi du code 2FA: " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi du code 2FA");
        }
    }

    private String generateTwoFactorCode(String secret) {
        // Générer un code TOTP à partir du secret
        // À implémenter avec votre bibliothèque TOTP
        return twoFactorAuthService.generateCurrentCode(secret);
    }

}