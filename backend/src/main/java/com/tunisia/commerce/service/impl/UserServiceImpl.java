package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.exception.AuthException;
import com.tunisia.commerce.exception.InstanceValidationException;
import com.tunisia.commerce.exception.MobileAuthException;
import com.tunisia.commerce.repository.*;
import com.tunisia.commerce.service.EmailService;
import com.tunisia.commerce.service.UserService;
import com.tunisia.commerce.config.JwtUtil;
import com.tunisia.commerce.util.PasswordGenerator;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;
import java.util.regex.Pattern;

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
    private final AdministrateurRepository administrateurRepository;
    private final InstanceValidationRepository instanceValidationRepository;
    private final StructureInterneRepository structureRepository;
    private final BanqueRepository banqueRepository;
    private final DouaneRepository douaneRepository;




    @Value("${app.verification.expiry-hours}")
    private int verificationExpiryHours;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${spring.mail.username}")
    private String adminEmail;

    Logger logger = Logger.getLogger(getClass().getName());


    @Override
    @Transactional
    public UserDTO registerExportateur(ExportateurSignupRequest request, String clientIp) {
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

        if (clientIp != null && !clientIp.isEmpty()) {
            exportateur.setIpAddressSignup(clientIp);
            logger.info("IP enregistrée pour l'exportateur: {}"+ clientIp);
        } else {
            logger.severe("Impossible de récupérer l'IP du client");
        }

        // === CHAMPS DE LA CLASSE PARENT (User) ===
        // Récupérer le nom complet du représentant légal
        String legalRep = request.getLegalRep();

        if (legalRep != null && !legalRep.isEmpty()) {
            String[] nameParts = legalRep.trim().split("\\s+", 2);

            if (nameParts.length == 1) {
                // Un seul mot : on le met dans le prénom
                exportateur.setPrenom(nameParts[0]);
                exportateur.setNom("");
            } else {
                // Premier mot = prénom, le reste = nom
                exportateur.setPrenom(nameParts[0]);
                exportateur.setNom(nameParts[1]);
            }
        }
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

        // 1. Chercher d'abord dans les exportateurs
        Optional<ExportateurEtranger> exportateurOpt = exportateurRepository.findByVerificationToken(token);

        if (exportateurOpt.isPresent()) {
            return verifyExportateurEmail(exportateurOpt.get());
        }

        // 2. Chercher dans les instances de validation
        Optional<InstanceValidation> instanceOpt = instanceValidationRepository.findByVerificationToken(token);

        if (instanceOpt.isPresent()) {
            return verifyInstanceValidationEmail(instanceOpt.get());
        }

        // 3. 👇 Chercher dans les utilisateurs banque
        Optional<Banque> banqueOpt = banqueRepository.findByVerificationToken(token);
        if (banqueOpt.isPresent()) {
            return verifyBanqueUserEmail(banqueOpt.get());
        }

        // 4. 👇 Chercher dans les utilisateurs douane
        Optional<Douane> douaneOpt = douaneRepository.findByVerificationToken(token);
        if (douaneOpt.isPresent()) {
            return verifyDouaneUserEmail(douaneOpt.get());
        }


        // 3. Aucun token trouvé
        logger.severe("ÉCHEC: Aucun utilisateur trouvé avec ce token!");
        throw new RuntimeException("Token de vérification invalide");
    }

    private boolean verifyExportateurEmail(ExportateurEtranger exportateur) {
        logger.info("Exportateur trouvé: "+ exportateur.getEmail());

        if (exportateur.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Le token de vérification a expiré");
        }

        exportateur.setEmailVerified(true);
        exportateur.setUserStatut(UserStatus.ACTIF);
        exportateur.setVerificationToken(null);
        exportateur.setVerificationTokenExpiry(null);
        exportateurRepository.save(exportateur);

        return true;
    }

    private boolean verifyInstanceValidationEmail(InstanceValidation instance) {
        logger.info("Instance Validation trouvée: "+ instance.getEmail());

        if (instance.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Le token de vérification a expiré");
        }

        instance.setEmailVerified(true);
        instance.setUserStatut(UserStatus.ACTIF);
        instance.setVerificationToken(null);
        instance.setVerificationTokenExpiry(null);
        instanceValidationRepository.save(instance);

        return true;
    }

    private boolean verifyBanqueUserEmail(Banque user) {
        logger.info("Utilisateur BANQUE trouvé: " + user.getEmail());

        if (user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Le token de vérification a expiré");
        }

        user.setEmailVerified(true);
        user.setUserStatut(UserStatus.ACTIF);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        banqueRepository.save(user);

        return true;
    }

    private boolean verifyDouaneUserEmail(Douane user) {
        logger.info("Utilisateur DOUANE trouvé: " + user.getEmail());

        if (user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Le token de vérification a expiré");
        }

        user.setEmailVerified(true);
        user.setUserStatut(UserStatus.ACTIF);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        douaneRepository.save(user);

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
    @Transactional(noRollbackFor = AuthException.class)
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
                        logger.info("Compte automatiquement débloqué pour: "+ request.getEmail());
                    } else {
                        long minutesRemaining = Duration.between(LocalDateTime.now(), unlockTime).toMinutes();
                        throw AuthException.accountLocked((int) minutesRemaining);
                    }
                } else {
                    throw AuthException.accountDisabled();
                }
            }

            // 3. Vérifier le mot de passe selon le rôle
            boolean passwordMatches = false;

            // Pour les ADMIN
            if (user.getRole() == UserRole.ADMIN) {
                Administrateur admin = administrateurRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                passwordMatches = passwordEncoder.matches(request.getPassword(), admin.getPasswordHash());
            }
            // Pour les EXPORTATEUR
            else if (user.getRole() == UserRole.EXPORTATEUR) {
                ExportateurEtranger exportateur = exportateurRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                passwordMatches = passwordEncoder.matches(request.getPassword(), exportateur.getPasswordHash());
            }
            // 👇 AJOUT: Pour les INSTANCE_VALIDATION
            else if (user.getRole() == UserRole.INSTANCE_VALIDATION) {
                InstanceValidation instance = instanceValidationRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                passwordMatches = passwordEncoder.matches(request.getPassword(), instance.getPasswordHash());
                logger.info("Vérification mot de passe pour instance: "+ passwordMatches);
            }
            else if (user.getRole() == UserRole.BANQUE) {
                Banque banqueUser = banqueRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                passwordMatches = passwordEncoder.matches(request.getPassword(), banqueUser.getPasswordHash());
            }
            else if (user.getRole() == UserRole.DOUANE) {
                Douane douaneUser = douaneRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                passwordMatches = passwordEncoder.matches(request.getPassword(), douaneUser.getPasswordHash());
            }
            // Pour les autres rôles (si nécessaire)
            else {
                // Fallback - essayer de trouver dans exportateur
                Optional<ExportateurEtranger> exportateurOpt = exportateurRepository.findByEmail(request.getEmail());
                if (exportateurOpt.isPresent()) {
                    passwordMatches = passwordEncoder.matches(request.getPassword(), exportateurOpt.get().getPasswordHash());
                }
            }

            if (!passwordMatches) {
                // 4. Incrémenter les tentatives
                userRepository.incrementFailedAttempts(request.getEmail());

                // 5. FORCER L'ÉCRITURE IMMÉDIATE EN BASE
                userRepository.flush();

                logger.info("=== Tentative échouée pour "+ request.getEmail()+" ===");

                // 6. Lire la valeur depuis la base
                int currentAttempts = userRepository.getFailedAttempts(request.getEmail());
                logger.info("Tentatives actuelles en base: "+ currentAttempts);

                if (currentAttempts >= 5) {
                    userRepository.lockAccount(request.getEmail(), UserStatus.INACTIF.name());
                    userRepository.flush();
                    logger.info("⚠️ Compte désactivé après "+ currentAttempts+" tentatives");
                    throw AuthException.maxAttemptsExceeded(30);
                }

                int remainingAttempts = 5 - currentAttempts;
                logger.info("Tentatives restantes: "+ remainingAttempts);
                throw AuthException.invalidCredentials(remainingAttempts);
            }

            // 7. Succès - Réinitialiser les tentatives
            userRepository.resetFailedAttempts(request.getEmail());
            userRepository.flush();
            logger.info("✅ Connexion réussie pour "+ request.getEmail());

            // 8. Recharger l'utilisateur
            User refreshedUser = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(AuthException::userNotFound);

            // 9. Vérifier l'email (selon le rôle)
            if (refreshedUser.getRole() == UserRole.EXPORTATEUR) {
                ExportateurEtranger freshExportateur = exportateurRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                if (!freshExportateur.isEmailVerified()) {
                    throw AuthException.emailNotVerified(request.getEmail());
                }
            }
            // 👇 AJOUT: Vérification email pour les instances de validation
            else if (refreshedUser.getRole() == UserRole.INSTANCE_VALIDATION) {
                InstanceValidation freshInstance = instanceValidationRepository.findByEmail(request.getEmail())
                        .orElseThrow(AuthException::userNotFound);
                if (!freshInstance.isEmailVerified()) {
                    logger.warning("❌ Instance non vérifiée: "+ request.getEmail());
                    throw AuthException.emailNotVerified(request.getEmail());
                }
                logger.info("✅ Instance vérifiée: "+ request.getEmail());
            }

            // Pour les admins, pas besoin de vérification d'email
            if (refreshedUser.getRole() == UserRole.ADMIN) {
                logger.info("✅ Connexion admin réussie pour: "+ request.getEmail());
            }

            // 10. Générer le token
            String token = jwtUtil.generateToken(refreshedUser.getEmail(), refreshedUser.getRole().name());

            // Vérifier si le 2FA est activé (uniquement pour exportateurs)
            boolean requiresTwoFactor = false;
            if (refreshedUser.getRole() == UserRole.EXPORTATEUR) {
                requiresTwoFactor = isTwoFactorEnabled(refreshedUser);
            }

            // Si le 2FA est activé, on renvoie un token temporaire
            if (requiresTwoFactor) {
                String tempToken = jwtUtil.generateTempToken(refreshedUser.getEmail(), refreshedUser.getRole().name());
                return LoginResponse.builder()
                        .token(tempToken)
                        .requiresTwoFactor(true)
                        .user(mapToUserDTO(refreshedUser))
                        .build();
            }

            return LoginResponse.builder()
                    .token(token)
                    .requiresTwoFactor(false)
                    .user(mapToUserDTO(refreshedUser))
                    .build();

        } catch (AuthException e) {
            throw e;
        } catch (Exception e) {
            logger.severe("Erreur inattendue: " + e.getMessage());
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
            dto.setSiteType(exportateur.getSiteType());
            dto.setNumeroOfficielEnregistrement(exportateur.getNumeroOfficielEnregistrement());
            dto.setUsername(exportateur.getUsername());
            dto.setRepresentantRole(exportateur.getRepresentantRole());
            dto.setRepresentantEmail(exportateur.getRepresentantEmail());
            dto.setPreKycCompletedAt(exportateur.getPreKycCompletedAt());
            dto.setPreKycCompleted(exportateur.isPreKycCompleted());
            dto.setCapaciteAnnuelle(exportateur.getCapaciteAnnuelle());
            dto.setDocumentsCount(exportateur.getDocuments() != null ? exportateur.getDocuments().size() : 0);
        }else if (user instanceof ImportateurTunisien) {
            ImportateurTunisien importateur = (ImportateurTunisien) user;
            dto.setMobileIdMatricule(importateur.getMobileIdMatricule());
            dto.setMobileIdPin(importateur.getMobileIdPin());
            dto.setRaisonSociale(importateur.getRaisonSociale());
            dto.setEmailVerified(true);
        }else if(user instanceof InstanceValidation){
            InstanceValidation instanceValidation = (InstanceValidation) user;
            dto.setSlaTraitementJours(instanceValidation.getSlaTraitementJours());
            dto.setStructureId(instanceValidation.getStructure().getId());
            dto.setStructureName(instanceValidation.getStructure().getOfficialName());
            dto.setStructureCode(instanceValidation.getStructure().getCode());
            dto.setStructureType(instanceValidation.getStructure().getType());
            dto.setPoste(instanceValidation.getPoste());
        }else if(user instanceof Banque){
            Banque banque = (Banque) user;
            dto.setStructureId(banque.getStructure().getId());
            dto.setStructureName(banque.getStructure().getOfficialName());
            dto.setStructureCode(banque.getStructure().getCode());
            dto.setStructureType(banque.getStructure().getType());
            dto.setPoste(banque.getPoste());
        }else if(user instanceof Douane){
            Douane douane = (Douane) user;
            dto.setStructureId(douane.getStructure().getId());
            dto.setStructureName(douane.getStructure().getOfficialName());
            dto.setStructureCode(douane.getStructure().getCode());
            dto.setStructureType(douane.getStructure().getType());
            dto.setPoste(douane.getPoste());
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

        // Chercher l'utilisateur dans les deux tables
        Optional<ExportateurEtranger> exportateurOpt = exportateurRepository.findByEmail(email);
        Optional<InstanceValidation> instanceValidationOpt = instanceValidationRepository.findByEmail(email);
        Optional<Banque> banqueOpt = banqueRepository.findByEmail(email);
        Optional<Douane> douaneOpt = douaneRepository.findByEmail(email);

        if (exportateurOpt.isEmpty() && instanceValidationOpt.isEmpty() && banqueOpt.isEmpty() && douaneOpt.isEmpty()) {
            throw new RuntimeException("Utilisateur non trouvé");
        }

        if (exportateurOpt.isPresent()) {
            // Cas ExportateurEtranger
            ExportateurEtranger exportateur = exportateurOpt.get();
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

            // Mettre à jour la date de changement
            if (exportateur.getLastPasswordChange() != null) {
                exportateur.setLastPasswordChange(LocalDateTime.now());
            }

            // Nettoyer le token de réinitialisation s'il existe
            exportateur.setResetPasswordToken(null);
            exportateur.setResetPasswordTokenExpiry(null);

            exportateurRepository.save(exportateur);

            logger.info("Mot de passe changé avec succès pour Exportateur: " + exportateur.getEmail());

            // Envoyer une notification par email
            try {
                emailService.sendPasswordChangeNotification(
                        email,
                        exportateur.getRaisonSociale()
                );
                logger.info("Notification de changement de mot de passe envoyée à: " + email);
            } catch (Exception e) {
                logger.warning("Erreur lors de l'envoi de la notification: " + e.getMessage());
            }

        } else if (instanceValidationOpt.isPresent()) {
            // Cas InstanceValidation
            InstanceValidation instanceValidation = instanceValidationOpt.get();
            logger.info("InstanceValidation trouvé: " + instanceValidation.getEmail());

            // Vérifier le mot de passe actuel
            if (!passwordEncoder.matches(request.getCurrentPassword(), instanceValidation.getPasswordHash())) {
                logger.severe("Mot de passe actuel incorrect");
                throw new IllegalArgumentException("Mot de passe actuel incorrect");
            }

            logger.info("Mot de passe actuel validé");

            // Vérifier que le nouveau mot de passe est différent de l'ancien
            if (passwordEncoder.matches(request.getNewPassword(), instanceValidation.getPasswordHash())) {
                logger.warning("Le nouveau mot de passe est identique à l'ancien");
                throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'actuel");
            }

            // Vérifier la force du mot de passe
            validatePasswordStrength(request.getNewPassword());

            // Mettre à jour le mot de passe
            instanceValidation.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));

            // Mettre à jour la date de changement
            if (instanceValidation.getLastPasswordChange() != null) {
                instanceValidation.setLastPasswordChange(LocalDateTime.now());
            }

            // Nettoyer le token de réinitialisation s'il existe
            instanceValidation.setResetPasswordToken(null);
            instanceValidation.setResetPasswordTokenExpiry(null);

            instanceValidationRepository.save(instanceValidation);

            logger.info("Mot de passe changé avec succès pour InstanceValidation: " + instanceValidation.getEmail());

            // Envoyer une notification par email
            try {
                emailService.sendPasswordChangeNotification(
                        email,
                        instanceValidation.getStructure().getOfficialName()
                );
                logger.info("Notification de changement de mot de passe envoyée à: " + email);
            } catch (Exception e) {
                logger.warning("Erreur lors de l'envoi de la notification: " + e.getMessage());
            }
        }
        else if (banqueOpt.isPresent()) {
            // Cas InstanceValidation
            Banque banque = banqueOpt.get();
            logger.info("banque trouvé: " + banque.getEmail());

            // Vérifier le mot de passe actuel
            if (!passwordEncoder.matches(request.getCurrentPassword(), banque.getPasswordHash())) {
                logger.severe("Mot de passe actuel incorrect");
                throw new IllegalArgumentException("Mot de passe actuel incorrect");
            }

            logger.info("Mot de passe actuel validé");

            // Vérifier que le nouveau mot de passe est différent de l'ancien
            if (passwordEncoder.matches(request.getNewPassword(), banque.getPasswordHash())) {
                logger.warning("Le nouveau mot de passe est identique à l'ancien");
                throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'actuel");
            }

            // Vérifier la force du mot de passe
            validatePasswordStrength(request.getNewPassword());

            // Mettre à jour le mot de passe
            banque.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));

            // Mettre à jour la date de changement
            if (banque.getLastPasswordChange() != null) {
                banque.setLastPasswordChange(LocalDateTime.now());
            }

            // Nettoyer le token de réinitialisation s'il existe
            banque.setResetPasswordToken(null);
            banque.setResetPasswordTokenExpiry(null);

            banqueRepository.save(banque);

            logger.info("Mot de passe changé avec succès pour banque: " + banque.getEmail());

            // Envoyer une notification par email
            try {
                emailService.sendPasswordChangeNotification(
                        email,
                        banque.getStructure().getOfficialName()
                );
                logger.info("Notification de changement de mot de passe envoyée à: " + email);
            } catch (Exception e) {
                logger.warning("Erreur lors de l'envoi de la notification: " + e.getMessage());
            }
        }else if (douaneOpt.isPresent()) {
            // Cas InstanceValidation
            Douane douane = douaneOpt.get();
            logger.info("douane trouvé: " + douane.getEmail());

            // Vérifier le mot de passe actuel
            if (!passwordEncoder.matches(request.getCurrentPassword(), douane.getPasswordHash())) {
                logger.severe("Mot de passe actuel incorrect");
                throw new IllegalArgumentException("Mot de passe actuel incorrect");
            }

            logger.info("Mot de passe actuel validé");

            // Vérifier que le nouveau mot de passe est différent de l'ancien
            if (passwordEncoder.matches(request.getNewPassword(), douane.getPasswordHash())) {
                logger.warning("Le nouveau mot de passe est identique à l'ancien");
                throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'actuel");
            }

            // Vérifier la force du mot de passe
            validatePasswordStrength(request.getNewPassword());

            // Mettre à jour le mot de passe
            douane.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));

            // Mettre à jour la date de changement
            if (douane.getLastPasswordChange() != null) {
                douane.setLastPasswordChange(LocalDateTime.now());
            }

            // Nettoyer le token de réinitialisation s'il existe
            douane.setResetPasswordToken(null);
            douane.setResetPasswordTokenExpiry(null);

            douaneRepository.save(douane);

            logger.info("Mot de passe changé avec succès pour douane: " + douane.getEmail());

            // Envoyer une notification par email
            try {
                emailService.sendPasswordChangeNotification(
                        email,
                        douane.getStructure().getOfficialName()
                );
                logger.info("Notification de changement de mot de passe envoyée à: " + email);
            } catch (Exception e) {
                logger.warning("Erreur lors de l'envoi de la notification: " + e.getMessage());
            }
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
    public void resetPassword(String token, String newPassword) {
        logger.info("=== RÉINITIALISATION MOT DE PASSE ===");

        // Chercher d'abord dans ExportateurEtranger
        Optional<ExportateurEtranger> exportateurOpt = exportateurRepository.findByResetPasswordToken(token);
        Optional<InstanceValidation> instanceValidationOpt = instanceValidationRepository.findByResetPasswordToken(token);

        if (exportateurOpt.isEmpty() && instanceValidationOpt.isEmpty()) {
            throw new RuntimeException("Token de réinitialisation invalide");
        }

        // Vérifier la force du mot de passe
        validatePasswordStrength(newPassword);

        if (exportateurOpt.isPresent()) {
            // Cas ExportateurEtranger
            ExportateurEtranger exportateur = exportateurOpt.get();

            // Vérifier si le token a expiré
            if (exportateur.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
                throw new RuntimeException("Le token de réinitialisation a expiré");
            }

            // Mettre à jour le mot de passe
            exportateur.setPasswordHash(passwordEncoder.encode(newPassword));

            // Mettre à jour la date de changement
            if (exportateur.getLastPasswordChange() != null) {
                exportateur.setLastPasswordChange(LocalDateTime.now());
            }

            // Invalider le token
            exportateur.setResetPasswordToken(null);
            exportateur.setResetPasswordTokenExpiry(null);

            exportateurRepository.save(exportateur);

            logger.info("Mot de passe réinitialisé pour Exportateur: " + exportateur.getEmail());

            // Envoyer une notification
            try {
                emailService.sendPasswordChangeNotification(
                        exportateur.getEmail(),
                        exportateur.getRaisonSociale()
                );
            } catch (Exception e) {
                logger.warning("Erreur lors de l'envoi de la notification: " + e.getMessage());
            }

        } else if (instanceValidationOpt.isPresent()) {
            // Cas InstanceValidation
            InstanceValidation instanceValidation = instanceValidationOpt.get();

            // Vérifier si le token a expiré
            if (instanceValidation.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
                throw new RuntimeException("Le token de réinitialisation a expiré");
            }

            // Mettre à jour le mot de passe
            instanceValidation.setPasswordHash(passwordEncoder.encode(newPassword));

            // Mettre à jour la date de changement
            if (instanceValidation.getLastPasswordChange() != null) {
                instanceValidation.setLastPasswordChange(LocalDateTime.now());
            }

            // Invalider le token
            instanceValidation.setResetPasswordToken(null);
            instanceValidation.setResetPasswordTokenExpiry(null);

            instanceValidationRepository.save(instanceValidation);

            logger.info("Mot de passe réinitialisé pour InstanceValidation: " + instanceValidation.getEmail());

            // Envoyer une notification
            try {
                emailService.sendPasswordChangeNotification(
                        instanceValidation.getEmail(),
                        instanceValidation.getStructure().getOfficialName()
                );
            } catch (Exception e) {
                logger.warning("Erreur lors de l'envoi de la notification: " + e.getMessage());
            }
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

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Mettre à jour les champs communs
        if (request.getTelephone() != null && !request.getTelephone().isEmpty()) {
            user.setTelephone(request.getTelephone());
        }


        User savedUser = null;

        // Gestion selon le rôle
        if (user instanceof ExportateurEtranger) {
            ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

            if (request.getCity() != null && !request.getCity().isEmpty()) {
                exportateur.setVille(request.getCity());
            }
            if (request.getCompanyName() != null && !request.getCompanyName().isEmpty()) {
                exportateur.setRaisonSociale(request.getCompanyName());
                exportateur.setNom(request.getCompanyName());
            }

            if (request.getAddress() != null && !request.getAddress().isEmpty()) {
                exportateur.setAdresseLegale(request.getAddress());
            }

            if (request.getCountry() != null && !request.getCountry().isEmpty()) {
                exportateur.setPaysOrigine(request.getCountry());
            }


            if (request.getTinNumber() != null && !request.getTinNumber().isEmpty()) {
                exportateur.setNumeroRegistreCommerce(request.getTinNumber());
            }

            if (request.getWebsite() != null && !request.getWebsite().isEmpty()) {
                exportateur.setSiteWeb(request.getWebsite());
            }

            if (request.getLegalRep() != null && !request.getLegalRep().isEmpty()) {
                exportateur.setRepresentantLegal(request.getLegalRep());
                // Séparer le nom complet en prénom et nom
                String[] nameParts = request.getLegalRep().trim().split("\\s+", 2);
                if (nameParts.length == 1) {
                    exportateur.setPrenom(nameParts[0]);
                    exportateur.setNom("");
                } else {
                    exportateur.setPrenom(nameParts[0]);
                    exportateur.setNom(nameParts[1]);
                }
            }

            if (request.getSiteType() != null) {
                exportateur.setSiteType(request.getSiteType());
            }

            if (request.getCapaciteAnnuelle() != null) {
                exportateur.setCapaciteAnnuelle(request.getCapaciteAnnuelle());
            }

            savedUser = exportateurRepository.save(exportateur);
            logger.info("Profil exportateur mis à jour avec succès pour: " + savedUser.getEmail());

        } else if (user instanceof ImportateurTunisien) {
            ImportateurTunisien importateur = importateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Importateur non trouvé"));

            if (request.getCompanyName() != null && !request.getCompanyName().isEmpty()) {
                importateur.setRaisonSociale(request.getCompanyName());
            }

            if (request.getNom() != null && !request.getNom().isEmpty()) {
                importateur.setNom(request.getNom());
            }

            if (request.getPrenom() != null && !request.getPrenom().isEmpty()) {
                importateur.setPrenom(request.getPrenom());
            }

            savedUser = importateurRepository.save(importateur);
            logger.info("Profil importateur mis à jour avec succès pour: " + savedUser.getEmail());

        }  else if (user instanceof InstanceValidation) {
        InstanceValidation instance = instanceValidationRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Instance de validation non trouvée"));

        // ✅ AJOUTER LA MISE À JOUR DES CHAMPS COMMUNS
        if (request.getNom() != null && !request.getNom().isEmpty()) {
            instance.setNom(request.getNom());
        }

        if (request.getPrenom() != null && !request.getPrenom().isEmpty()) {
            instance.setPrenom(request.getPrenom());
        }

        if (request.getTelephone() != null && !request.getTelephone().isEmpty()) {
            instance.setTelephone(request.getTelephone());
        }

        if (request.getPoste() != null) {
            instance.setPoste(request.getPoste());
        }

        // Mise à jour de la structure (si nécessaire)
        if (request.getStructureInterne() != null && request.getStructureInterne().getId() != null) {
            StructureInterne structure = structureRepository.findById(request.getStructureInterne().getId())
                    .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + request.getStructureInterne().getId()));
            instance.setStructure(structure);
        }

        // Mise à jour du SLA (si nécessaire)
        if (request.getSlaTraitementJours() != null) {
            instance.setSlaTraitementJours(request.getSlaTraitementJours());
        }

        savedUser = instanceValidationRepository.save(instance);
        logger.info("Profil instance de validation mis à jour avec succès pour: " + savedUser.getEmail());
    }
        else if (user instanceof Banque) {
            Banque banque = banqueRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("banque non trouvée"));

            // ✅ AJOUTER LA MISE À JOUR DES CHAMPS COMMUNS
            if (request.getNom() != null && !request.getNom().isEmpty()) {
                banque.setNom(request.getNom());
            }

            if (request.getPrenom() != null && !request.getPrenom().isEmpty()) {
                banque.setPrenom(request.getPrenom());
            }

            if (request.getTelephone() != null && !request.getTelephone().isEmpty()) {
                banque.setTelephone(request.getTelephone());
            }

            if (request.getPoste() != null) {
                banque.setPoste(request.getPoste());
            }

            // Mise à jour de la structure (si nécessaire)
            if (request.getStructureInterne() != null && request.getStructureInterne().getId() != null) {
                StructureInterne structure = structureRepository.findById(request.getStructureInterne().getId())
                        .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + request.getStructureInterne().getId()));
                banque.setStructure(structure);
            }


            savedUser = banqueRepository.save(banque);
            logger.info("Profil banque mis à jour avec succès pour: " + savedUser.getEmail());
        }  else if (user instanceof Douane) {
            Douane douane = douaneRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("douane non trouvée"));

            // ✅ AJOUTER LA MISE À JOUR DES CHAMPS COMMUNS
            if (request.getNom() != null && !request.getNom().isEmpty()) {
                douane.setNom(request.getNom());
            }

            if (request.getPrenom() != null && !request.getPrenom().isEmpty()) {
                douane.setPrenom(request.getPrenom());
            }

            if (request.getTelephone() != null && !request.getTelephone().isEmpty()) {
                douane.setTelephone(request.getTelephone());
            }

            if (request.getPoste() != null) {
                douane.setPoste(request.getPoste());
            }

            // Mise à jour de la structure (si nécessaire)
            if (request.getStructureInterne() != null && request.getStructureInterne().getId() != null) {
                StructureInterne structure = structureRepository.findById(request.getStructureInterne().getId())
                        .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + request.getStructureInterne().getId()));
                douane.setStructure(structure);
            }

            savedUser = douaneRepository.save(douane);
            logger.info("Profil douane mis à jour avec succès pour: " + savedUser.getEmail());
        }

        return mapToUserDTO(savedUser != null ? savedUser : user);
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


    @Override
    public List<UserDTO> getAllUsers() {
        logger.info("=== RÉCUPÉRATION DE TOUS LES UTILISATEURS (SAUF ADMIN) ===");

        List<User> users = userRepository.findAll();
        List<UserDTO> result = new ArrayList<>();

        for (User user : users) {
            // Exclure les utilisateurs avec le rôle ADMIN
            if (user.getRole() != UserRole.ADMIN) {
                UserDTO dto = mapToUserDTO(user);
                result.add(dto);
            }
        }

        // Trier par date de création décroissante
        result.sort((a, b) -> b.getDateCreation().compareTo(a.getDateCreation()));

        logger.info("Nombre total d'utilisateurs (sauf admin): "+ result.size());
        return result;
    }

    @Override
    public UserDTO getUserById(Long id) {
        logger.info("=== RÉCUPÉRATION UTILISATEUR PAR ID:  "+ id+"===");

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id: " + id));

        // Vérifier que ce n'est pas un admin
        if (user.getRole() == UserRole.ADMIN) {
            throw new RuntimeException("Accès non autorisé à ce compte");
        }

        return mapToUserDTO(user);
    }

    @Override
    public List<DeactivationRequestAdminDTO> getAllDeactivationRequests() {
        logger.info("=== RÉCUPÉRATION DE TOUTES LES DEMANDES DE DÉSACTIVATION ===");

        List<DeactivationRequest> requests = deactivationRequestRepository.findAll();
        List<DeactivationRequestAdminDTO> result = new ArrayList<>();

        for (DeactivationRequest request : requests) {
            // Ne montrer que les demandes en attente
            if (request.getStatus() == DeactivationStatus.PENDING ||
                    request.getStatus() == DeactivationStatus.IN_REVIEW) {
                DeactivationRequestAdminDTO dto = mapToDeactivationRequestAdminDTO(request);
                result.add(dto);
            }
        }

        // Trier par date décroissante (les plus récentes d'abord)
        result.sort((a, b) -> b.getRequestDate().compareTo(a.getRequestDate()));

        logger.info("Nombre total de demandes en attente: "+ result.size());
        return result;
    }

    @Override
    @Transactional
    public DeactivationRequestAdminDTO processDeactivationRequest(Long requestId, String action, String adminComment, Long adminId) {
        logger.info("=== TRAITEMENT DEMANDE DE DÉSACTIVATION ID: "+ requestId+" ===");
        logger.info("Action: "+ action);

        DeactivationRequest request = deactivationRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec l'id: " + requestId));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé avec l'id: " + adminId));

        request.setProcessedBy(admin);
        request.setProcessedDate(LocalDateTime.now());
        request.setAdminComment(adminComment);

        ExportateurEtranger exportateur = request.getUser();

        if ("ACCEPT".equalsIgnoreCase(action)) {
            request.setStatus(DeactivationStatus.APPROVED);

            // Désactiver le compte utilisateur
            exportateur.setUserStatut(UserStatus.INACTIF);
            exportateurRepository.save(exportateur);

            logger.info("✅ Demande approuvée et compte désactivé pour: "+ exportateur.getEmail());

            // Envoyer email de confirmation à l'utilisateur
            try {
                Map<String, Object> params = new HashMap<>();
                params.put("companyName", exportateur.getRaisonSociale());
                params.put("requestId", "DEM-" + String.format("%06d", request.getId()));
                params.put("adminComment", adminComment != null ? adminComment : "Aucun commentaire");

                emailService.sendValidationNotification(
                        exportateur.getEmail(),
                        exportateur.getRaisonSociale(),
                        ValidationNotificationType.DEACTIVATION_CONFIRMATION,
                        params
                );
            } catch (Exception e) {
                logger.warning("Erreur lors de l'envoi de l'email de confirmation: " + e.getMessage());
            }

        } else if ("REJECT".equalsIgnoreCase(action)) {
            request.setStatus(DeactivationStatus.REJECTED);
            logger.info("❌ Demande rejetée pour: "+ exportateur.getEmail());

            // Envoyer email de rejet à l'utilisateur
            try {
                Map<String, Object> params = new HashMap<>();
                params.put("companyName", exportateur.getRaisonSociale());
                params.put("requestId", "DEM-" + String.format("%06d", request.getId()));
                params.put("reason", adminComment != null ? adminComment : "Non spécifiée");

                emailService.sendValidationNotification(
                        exportateur.getEmail(),
                        exportateur.getRaisonSociale(),
                        ValidationNotificationType.DEACTIVATION_REJECTION,
                        params
                );
            } catch (Exception e) {
                logger.warning("Erreur lors de l'envoi de l'email de rejet: " + e.getMessage());
            }
        } else {
            throw new RuntimeException("Action invalide: " + action + ". Utilisez 'ACCEPT' ou 'REJECT'");
        }

        deactivationRequestRepository.save(request);

        return mapToDeactivationRequestAdminDTO(request);
    }

    // Méthode pour mapper DeactivationRequest vers DeactivationRequestAdminDTO
    private DeactivationRequestAdminDTO mapToDeactivationRequestAdminDTO(DeactivationRequest request) {
        ExportateurEtranger exportateur = request.getUser();

        return DeactivationRequestAdminDTO.builder()
                .id(request.getId())
                .userId(exportateur.getId())
                .userName(exportateur.getNom() + " " + exportateur.getPrenom())
                .userEmail(exportateur.getEmail())
                .companyName(exportateur.getRaisonSociale())
                .reason(request.getReason())
                .requestType(request.getRequestType())
                .status(request.getStatus())
                .requestDate(request.getRequestDate())
                .isUrgent(request.isUrgent())
                .notificationSent(request.isNotificationSent())
                .build();
    }

    @Override
    @Transactional
    public boolean hasPendingDeactivationRequest(String email) {
        logger.info("=== VÉRIFICATION DEMANDE DE DÉSACTIVATION EN COURS ===");
        logger.info("Email: "+ email);

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        boolean hasPending = deactivationRequestRepository.existsByUserIdAndStatusIn(
                exportateur.getId(),
                List.of(DeactivationStatus.PENDING, DeactivationStatus.IN_REVIEW)
        );

        logger.info("Demande en cours: "+ hasPending);
        return hasPending;
    }



    @Override
    @Transactional
    public void updateUserStatus(Long userId, String status) {
        logger.info("=== MISE À JOUR STATUT UTILISATEUR ===");
        logger.info("User ID: "+ userId);
        logger.info("Nouveau statut: "+ status);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id: " + userId));

        try {
            UserStatus newStatus = UserStatus.valueOf(status);
            user.setUserStatut(newStatus);
            userRepository.save(user);
            logger.info("✅ Statut utilisateur mis à jour: "+ userId+" -> "+ newStatus);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Statut invalide: " + status);
        }
    }

    // Méthodes privées pour l'envoi d'emails
    private void sendDeactivationApprovedEmail(ExportateurEtranger exportateur, DeactivationRequest request, String adminComment) {
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("companyName", exportateur.getRaisonSociale());
            params.put("requestId", "DEM-" + String.format("%06d", request.getId()));
            params.put("requestDate", request.getRequestDate().toString());
            params.put("adminComment", adminComment != null ? adminComment : "Aucun commentaire");
            params.put("supportEmail", "support@tunisia-commerce.gov.tn");

            emailService.sendValidationNotification(
                    exportateur.getEmail(),
                    exportateur.getRaisonSociale(),
                    ValidationNotificationType.DEACTIVATION_CONFIRMATION,
                    params
            );
            logger.info("Email de confirmation de désactivation envoyé à: "+ exportateur.getEmail());
        } catch (Exception e) {
            logger.warning("Erreur lors de l'envoi de l'email de désactivation: " + e.getMessage());
        }
    }

    private void sendDeactivationRejectedEmail(ExportateurEtranger exportateur, DeactivationRequest request, String adminComment) {
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("companyName", exportateur.getRaisonSociale());
            params.put("requestId", "DEM-" + String.format("%06d", request.getId()));
            params.put("requestDate", request.getRequestDate().toString());
            params.put("reason", adminComment != null ? adminComment : "Non spécifiée");
            params.put("supportEmail", "support@tunisia-commerce.gov.tn");

            emailService.sendValidationNotification(
                    exportateur.getEmail(),
                    exportateur.getRaisonSociale(),
                    ValidationNotificationType.DEACTIVATION_REJECTION,
                    params
            );
            logger.info("Email de rejet de désactivation envoyé à: "+ exportateur.getEmail());
        } catch (Exception e) {
            logger.warning("Erreur lors de l'envoi de l'email de rejet: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void reactivateAccount(Long userId, String adminComment) {
        logger.info("=== RÉACTIVATION DE COMPTE ===");
        logger.info("User ID: " + userId);
        logger.info("Comment: " + adminComment);

        // 1. Récupérer l'utilisateur
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id: " + userId));

        // 2. Vérifier que ce n'est pas un administrateur
        if (user.getRole() == UserRole.ADMIN) {
            throw new RuntimeException("Les comptes administrateur ne peuvent pas être réactivés");
        }

        // 3. Vérifier que le compte est inactif
        if (user.getUserStatut() == UserStatus.ACTIF) {
            throw new RuntimeException("Le compte est déjà actif");
        }

        // 4. Réactiver le compte selon le type
        if (user instanceof ExportateurEtranger) {
            ExportateurEtranger exportateur = (ExportateurEtranger) user;
            exportateur.setUserStatut(UserStatus.ACTIF);
            exportateur.setFailedLoginAttempts(0);
            exportateur.setLastFailedLoginAttempt(null);
            exportateurRepository.save(exportateur);
            logger.info("✅ Compte exportateur réactivé: " + exportateur.getEmail());

        } else if (user instanceof ImportateurTunisien) {
            ImportateurTunisien importateur = (ImportateurTunisien) user;
            importateur.setUserStatut(UserStatus.ACTIF);
            importateur.setFailedLoginAttempts(0);
            importateur.setLastFailedLoginAttempt(null);
            importateurRepository.save(importateur);
            logger.info("✅ Compte importateur réactivé: " + importateur.getEmail());

        } else if (user instanceof InstanceValidation) {
            InstanceValidation instance = (InstanceValidation) user;
            instance.setUserStatut(UserStatus.ACTIF);
            instance.setEmailVerified(true);
            instance.setVerificationToken(null);
            instance.setVerificationTokenExpiry(null);
            instanceValidationRepository.save(instance);
            logger.info("✅ Compte instance de validation réactivé: " + instance.getEmail());

        }else if (user instanceof Banque) {
            Banque banque = (Banque) user;
            banque.setUserStatut(UserStatus.ACTIF);
            banque.setEmailVerified(true);
            banque.setVerificationToken(null);
            banque.setVerificationTokenExpiry(null);
            banqueRepository.save(banque);
            logger.info("✅ Compte banque de validation réactivé: " + banque.getEmail());

        }else if (user instanceof Douane) {
            Douane douane = (Douane) user;
            douane.setUserStatut(UserStatus.ACTIF);
            douane.setEmailVerified(true);
            douane.setVerificationToken(null);
            douane.setVerificationTokenExpiry(null);
            douaneRepository.save(douane);
            logger.info("✅ Compte douane de validation réactivé: " + douane.getEmail());

        }
        else {
            throw new RuntimeException("Type d'utilisateur non supporté pour la réactivation: " + user.getClass().getName());
        }

        // 5. Envoyer email de notification
        sendAccountReactivatedEmail(user, adminComment);
    }

    private void sendAccountReactivatedEmail(User user, String adminComment) {
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("adminComment", adminComment != null ? adminComment : "Aucun commentaire");
            params.put("loginUrl", frontendUrl + "/login");
            params.put("supportEmail", "support@tunisia-commerce.gov.tn");

            String email = user.getEmail();
            String displayName = user.getPrenom() + " " + user.getNom();
            String companyName = "";

            // Déterminer le nom de l'entreprise/institution selon le type
            if (user instanceof ExportateurEtranger) {
                ExportateurEtranger exportateur = (ExportateurEtranger) user;
                companyName = exportateur.getRaisonSociale();
                params.put("companyName", companyName);
                params.put("userName", displayName);

            } else if (user instanceof ImportateurTunisien) {
                ImportateurTunisien importateur = (ImportateurTunisien) user;
                companyName = importateur.getRaisonSociale();
                params.put("companyName", companyName);
                params.put("userName", displayName);

            } else if (user instanceof InstanceValidation) {
                InstanceValidation instance = (InstanceValidation) user;
                companyName = instance.getStructure() != null ?
                        instance.getStructure().getOfficialName() :
                        instance.getNom() + " " + instance.getPrenom();
                params.put("companyName", companyName);
                params.put("userName", displayName);
                params.put("institutionName", companyName);

            } else {
                companyName = "Votre compte";
                params.put("companyName", companyName);
                params.put("userName", displayName);
            }

            params.put("email", email);

            emailService.sendValidationNotification(
                    email,
                    companyName,
                    ValidationNotificationType.ACCOUNT_REACTIVATED,
                    params
            );

            logger.info("✅ Email de réactivation envoyé à: {}"+ email);

        } catch (Exception e) {
            logger.warning("❌ Erreur lors de l'envoi de l'email de réactivation: " + e.getMessage());
        }
    }


    private void sendNewPasswordEmail(User user, String newPassword) {
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("userName", user.getPrenom() + " " + user.getNom());
            params.put("email", user.getEmail());
            params.put("newPassword", newPassword);
            params.put("loginUrl", frontendUrl + "/login");
            params.put("supportEmail", "support@tunisia-commerce.gov.tn");

            if (user instanceof ExportateurEtranger) {
                ExportateurEtranger exp = (ExportateurEtranger) user;
                params.put("companyName", exp.getRaisonSociale());
                emailService.sendValidationNotification(
                        user.getEmail(),
                        exp.getRaisonSociale(),
                        ValidationNotificationType.PASSWORD_RESET_ADMIN,
                        params
                );
            }
            // 👇 AJOUT: Pour les instances de validation
            else if (user instanceof InstanceValidation) {
                InstanceValidation instance = (InstanceValidation) user;
                params.put("companyName", instance.getStructure().getOfficialName());
                emailService.sendValidationNotification(
                        user.getEmail(),
                        instance.getStructure().getOfficialName(),
                        ValidationNotificationType.INSTANCE_VALIDATION_PASSWORD_RESET,
                        params
                );
            }
            else {
                emailService.sendValidationNotification(
                        user.getEmail(),
                        user.getNom(),
                        ValidationNotificationType.PASSWORD_RESET_ADMIN,
                        params
                );
            }

            logger.info("Email avec nouveau mot de passe envoyé à: "+ user.getEmail());
            logger.info("Nouveau mot de passe: "+ newPassword);
        } catch (Exception e) {
            logger.warning("Erreur lors de l'envoi de l'email: " + e.getMessage());
        }
    }
    @Override
    @Transactional
    public String resetUserPassword(Long userId) {
        logger.info("=== RÉINITIALISATION MOT DE PASSE UTILISATEUR ID: "+ userId+" ===");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id: " + userId));

        // Vérifier si l'utilisateur peut avoir un mot de passe
        if (!canHavePassword(user)) {
            throw new RuntimeException("Cet utilisateur (Importateur) n'utilise pas de mot de passe. Il s'authentifie via Mobile ID.");
        }

        // Générer un nouveau mot de passe basé sur les attributs de l'utilisateur
        String newPassword = PasswordGenerator.generatePasswordForUser(user);

        if (newPassword == null) {
            throw new RuntimeException("Impossible de générer un mot de passe pour cet utilisateur");
        }

        // Encoder le mot de passe
        String encodedPassword = passwordEncoder.encode(newPassword);

        // Mettre à jour selon le type d'utilisateur
        if (user instanceof ExportateurEtranger) {
            ExportateurEtranger exportateur = (ExportateurEtranger) user;
            exportateur.setPasswordHash(encodedPassword);
            exportateur.setLastPasswordChange(LocalDateTime.now());
            exportateur.setResetPasswordToken(null);
            exportateur.setResetPasswordTokenExpiry(null);
            exportateurRepository.save(exportateur);
            logger.info("✅ Mot de passe réinitialisé pour l'exportateur: "+ user.getEmail());
        }
        // 👇 AJOUT: Pour les instances de validation
        else if (user instanceof InstanceValidation) {
            InstanceValidation instance = (InstanceValidation) user;
            instance.setPasswordHash(encodedPassword);
            instance.setUpdatedAt(LocalDateTime.now());
            instanceValidationRepository.save(instance);
            logger.info("✅ Mot de passe réinitialisé pour l'instance: "+ user.getEmail());
        }else if (user instanceof Banque) {
            Banque banque = (Banque) user;
            banque.setPasswordHash(encodedPassword);
            banque.setUpdatedAt(LocalDateTime.now());
            banqueRepository.save(banque);
            logger.info("✅ Mot de passe réinitialisé pour la banque: "+ user.getEmail());
        }else if (user instanceof Douane) {
            Douane douane = (Douane) user;
            douane.setPasswordHash(encodedPassword);
            douane.setUpdatedAt(LocalDateTime.now());
            douaneRepository.save(douane);
            logger.info("✅ Mot de passe réinitialisé pour la douane: "+ user.getEmail());
        }
        else {
            // Pour admin
            Administrateur admin = administrateurRepository.findByEmail(user.getEmail())
                    .orElseThrow(() -> new RuntimeException("Admin non trouvé"));
            admin.setPasswordHash(encodedPassword);
            administrateurRepository.save(admin);
            logger.info("✅ Mot de passe réinitialisé pour l'admin: "+ user.getEmail());
        }

        // Envoyer le nouveau mot de passe par email
        sendNewPasswordEmail(user, newPassword);

        return newPassword;
    }

    @Override
    public boolean canHavePassword(User user) {
        // Seuls les exportateurs et les admins ont des mots de passe
        // Les importateurs utilisent Mobile ID
        return !(user instanceof ImportateurTunisien);
    }

    // ==================== INSTANCE VALIDATION METHODS ====================

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[0-9]{8,15}$");
    private static final Pattern CODE_MINISTERE_PATTERN = Pattern.compile("^[A-Z_]{3,20}$");

    @Override
    @Transactional
    public UserDTO createInstanceValidation(CreateInstanceValidationRequest request) {
        logger.info("=== CRÉATION INSTANCE DE VALIDATION ===");

        // Validations
        validateRequiredField(request.getNom(), "nom");
        validateRequiredField(request.getPrenom(), "prenom");
        validateRequiredField(request.getEmail(), "email");
        validateRequiredField(request.getTelephone(), "telephone");

        if (request.getSlaTraitementJours() == null) {
            throw InstanceValidationException.missingRequiredField("slaTraitementJours");
        }

        // 🔥 Validation de la structure
        if (request.getStructure() == null || request.getStructure().getId() == null) {
            throw InstanceValidationException.missingRequiredField("structure");
        }

        if (!EMAIL_PATTERN.matcher(request.getEmail()).matches()) {
            throw InstanceValidationException.invalidEmailFormat(request.getEmail());
        }

        if (!PHONE_PATTERN.matcher(request.getTelephone()).matches()) {
            throw InstanceValidationException.invalidPhoneFormat(request.getTelephone());
        }

        if (request.getSlaTraitementJours() < 1 || request.getSlaTraitementJours() > 60) {
            throw InstanceValidationException.invalidSlaDays(request.getSlaTraitementJours());
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw InstanceValidationException.emailAlreadyExists(request.getEmail());
        }

        // 🔥 Récupérer la structure depuis la base de données (pour être sûr qu'elle existe)
        StructureInterne structure = structureRepository.findById(request.getStructure().getId())
                .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + request.getStructure().getId()));


        // Générer le token de vérification
        String verificationToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(24);

        // Création de l'instance
        InstanceValidation instance = new InstanceValidation();
        instance.setNom(request.getNom());
        instance.setPrenom(request.getPrenom());
        instance.setEmail(request.getEmail());
        instance.setTelephone(request.getTelephone());
        instance.setPoste(request.getPoste());
        instance.setStructure(structure);
        instance.setSlaTraitementJours(request.getSlaTraitementJours());
        instance.setRole(UserRole.INSTANCE_VALIDATION);
        instance.setUserStatut(UserStatus.INACTIF);
        instance.setDateCreation(LocalDateTime.now());

        // Ajouter les champs de vérification
        instance.setEmailVerified(false);
        instance.setVerificationToken(verificationToken);
        instance.setVerificationTokenExpiry(tokenExpiry);

        // ⚠️ IMPORTANT: Générer ET définir le mot de passe AVANT la sauvegarde
        String generatedPassword = PasswordGenerator.generatePasswordForUser(instance);
        instance.setPasswordHash(passwordEncoder.encode(generatedPassword));  // ← Définir ici

        // Maintenant sauvegarder
        InstanceValidation saved = instanceValidationRepository.save(instance);

        logger.info("Instance de validation créée avec ID: "+ saved.getId());
        logger.info("Mot de passe généré: "+ generatedPassword);

        // Envoyer l'email APRÈS la sauvegarde
        sendInstanceValidationCredentialsWithToken(saved, generatedPassword, verificationToken);

        return mapToUserDTO(saved);
    }


    // Dans UserServiceImpl.java - ajouter ces méthodes

    @Override
    @Transactional
    public UserDTO createBanqueUser(CreateBanqueUserRequest request) {
        logger.info("=== CRÉATION UTILISATEUR BANQUE ===");

        // Validations
        validateRequiredField(request.getNom(), "nom");
        validateRequiredField(request.getPrenom(), "prenom");
        validateRequiredField(request.getEmail(), "email");
        validateRequiredField(request.getTelephone(), "telephone");

        if (request.getStructure() == null || request.getStructure().getId() == null) {
            throw InstanceValidationException.missingRequiredField("structure");
        }

        if (!EMAIL_PATTERN.matcher(request.getEmail()).matches()) {
            throw InstanceValidationException.invalidEmailFormat(request.getEmail());
        }

        if (!PHONE_PATTERN.matcher(request.getTelephone()).matches()) {
            throw InstanceValidationException.invalidPhoneFormat(request.getTelephone());
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw InstanceValidationException.emailAlreadyExists(request.getEmail());
        }

        // Récupérer la structure
        StructureInterne structure = structureRepository.findById(request.getStructure().getId())
                .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + request.getStructure().getId()));

        // Vérifier que le type est bien BANQUE
        if (structure.getType() != StructureType.BANK) {
            throw new RuntimeException("La structure sélectionnée n'est pas de type BANQUE");
        }

        // Générer le token de vérification
        String verificationToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(verificationExpiryHours);

        // Création de l'utilisateur banque
        Banque user = new Banque();
        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setEmail(request.getEmail());
        user.setTelephone(request.getTelephone());
        user.setPoste(request.getPoste());
        user.setStructure(structure);
        user.setRole(UserRole.BANQUE);
        user.setUserStatut(UserStatus.INACTIF);
        user.setDateCreation(LocalDateTime.now());
        user.setEmailVerified(false);
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(tokenExpiry);

        // Générer et encoder le mot de passe
        String generatedPassword = PasswordGenerator.generatePasswordForUser(user);
        user.setPasswordHash(passwordEncoder.encode(generatedPassword));

        // Sauvegarder
        Banque saved = banqueRepository.save(user);

        logger.info("Utilisateur BANQUE créé avec ID: " + saved.getId());
        logger.info("Mot de passe généré: " + generatedPassword);

        // Envoyer l'email
        sendBanqueUserCredentials(saved, generatedPassword, verificationToken);

        return mapToUserDTO(saved);
    }

    @Override
    @Transactional
    public UserDTO createDouaneUser(CreateDouaneUserRequest request) {
        logger.info("=== CRÉATION UTILISATEUR DOUANE ===");

        // Validations
        validateRequiredField(request.getNom(), "nom");
        validateRequiredField(request.getPrenom(), "prenom");
        validateRequiredField(request.getEmail(), "email");
        validateRequiredField(request.getTelephone(), "telephone");

        if (request.getStructure() == null || request.getStructure().getId() == null) {
            throw InstanceValidationException.missingRequiredField("structure");
        }

        if (!EMAIL_PATTERN.matcher(request.getEmail()).matches()) {
            throw InstanceValidationException.invalidEmailFormat(request.getEmail());
        }

        if (!PHONE_PATTERN.matcher(request.getTelephone()).matches()) {
            throw InstanceValidationException.invalidPhoneFormat(request.getTelephone());
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw InstanceValidationException.emailAlreadyExists(request.getEmail());
        }

        // Récupérer la structure
        StructureInterne structure = structureRepository.findById(request.getStructure().getId())
                .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + request.getStructure().getId()));

        // Vérifier que le type est bien CUSTOMS
        if (structure.getType() != StructureType.CUSTOMS) {
            throw new RuntimeException("La structure sélectionnée n'est pas de type DOUANE");
        }

        // Générer le token de vérification
        String verificationToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(verificationExpiryHours);

        // Création de l'utilisateur douane
        Douane user = new Douane();
        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setEmail(request.getEmail());
        user.setTelephone(request.getTelephone());
        user.setPoste(request.getPoste());
        user.setStructure(structure);
        user.setRole(UserRole.DOUANE);
        user.setUserStatut(UserStatus.INACTIF);
        user.setDateCreation(LocalDateTime.now());
        user.setEmailVerified(false);
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(tokenExpiry);

        // Générer et encoder le mot de passe
        String generatedPassword = PasswordGenerator.generatePasswordForUser(user);
        user.setPasswordHash(passwordEncoder.encode(generatedPassword));

        // Sauvegarder
        Douane saved = douaneRepository.save(user);

        logger.info("Utilisateur DOUANE créé avec ID: " + saved.getId());
        logger.info("Mot de passe généré: " + generatedPassword);

        // Envoyer l'email
        sendDouaneUserCredentials(saved, generatedPassword, verificationToken);

        return mapToUserDTO(saved);
    }

// ==================== MÉTHODES PRIVÉES POUR L'ENVOI D'EMAILS ====================

    private void sendBanqueUserCredentials(Banque user, String password, String verificationToken) {
        try {
            String activationLink = frontendUrl + "#/login?token=" + verificationToken;

            Map<String, Object> params = new HashMap<>();
            params.put("userFirstName", user.getPrenom());
            params.put("userLastName", user.getNom());
            params.put("email", user.getEmail());
            params.put("poste", user.getPoste() != null ? user.getPoste() : "Non renseigné");
            params.put("generatedPassword", password);
            params.put("activationLink", activationLink);
            params.put("nomOfficiel", user.getStructure().getOfficialName());
            params.put("codeStructure", user.getStructure().getCode());
            params.put("typeStructure", user.getStructure().getType());
            params.put("loginUrl", frontendUrl + "/login");
            params.put("supportEmail", "support@tunisia-commerce.gov.tn");

            emailService.sendValidationNotification(
                    user.getEmail(),
                    user.getStructure().getOfficialName(),
                    ValidationNotificationType.BANQUE_USER_CREATED,
                    params
            );

            logger.info("Email d'activation envoyé à l'utilisateur BANQUE: " + user.getEmail());
        } catch (Exception e) {
            logger.severe("Erreur lors de l'envoi de l'email: " + e.getMessage());
        }
    }

    private void sendDouaneUserCredentials(Douane user, String password, String verificationToken) {
        try {
            String activationLink = frontendUrl + "#/login?token=" + verificationToken;

            Map<String, Object> params = new HashMap<>();
            params.put("userFirstName", user.getPrenom());
            params.put("userLastName", user.getNom());
            params.put("email", user.getEmail());
            params.put("poste", user.getPoste() != null ? user.getPoste() : "Non renseigné");
            params.put("generatedPassword", password);
            params.put("activationLink", activationLink);
            params.put("nomOfficiel", user.getStructure().getOfficialName());
            params.put("codeStructure", user.getStructure().getCode());
            params.put("typeStructure", user.getStructure().getType());
            params.put("loginUrl", frontendUrl + "/login");
            params.put("supportEmail", "support@tunisia-commerce.gov.tn");

            emailService.sendValidationNotification(
                    user.getEmail(),
                    user.getStructure().getOfficialName(),
                    ValidationNotificationType.DOUANE_USER_CREATED,
                    params
            );

            logger.info("Email d'activation envoyé à l'utilisateur DOUANE: " + user.getEmail());
        } catch (Exception e) {
            logger.severe("Erreur lors de l'envoi de l'email: " + e.getMessage());
        }
    }

    // ==================== PRIVATE METHODS ====================

    private void validateRequiredField(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw InstanceValidationException.missingRequiredField(fieldName);
        }
    }

    private void sendInstanceValidationCredentialsWithToken(InstanceValidation instance, String password, String token) {
        try {
            String activationLink = frontendUrl + "#/login?token=" + token;

            Map<String, Object> params = new HashMap<>();
            params.put("userFirstName", instance.getPrenom());
            params.put("userLastName", instance.getNom());
            params.put("email", instance.getEmail());
            params.put("poste", instance.getPoste() != null ? instance.getPoste() : "Non renseigné");
            params.put("generatedPassword", password);
            params.put("activationLink", activationLink);
            params.put("nomOfficiel", instance.getStructure().getOfficialName());
            params.put("codeMinistere", instance.getStructure().getCode());
            params.put("typeAutorite", instance.getStructure().getType());
            params.put("slaTraitementJours", instance.getSlaTraitementJours());
            params.put("loginUrl", frontendUrl + "/login");
            params.put("supportEmail", "support@tunisia-commerce.gov.tn");

            emailService.sendValidationNotification(
                    instance.getEmail(),
                    instance.getStructure().getOfficialName(),
                    ValidationNotificationType.INSTANCE_VALIDATION_CREATED,
                    params
            );

            logger.info("Email d'activation avec mot de passe envoyé à: "+ instance.getEmail());
        } catch (Exception e) {
            logger.severe("Erreur lors de l'envoi de l'email: " + e.getMessage());
        }
    }

    private UserDTO mapToUserDTO(InstanceValidation instance) {
        UserDTO dto = new UserDTO();
        dto.setId(instance.getId());
        dto.setNom(instance.getNom());
        dto.setPrenom(instance.getPrenom());
        dto.setEmail(instance.getEmail());
        dto.setTelephone(instance.getTelephone());
        dto.setPoste(instance.getPoste());
        dto.setRole(instance.getRole());
        dto.setStatut(instance.getUserStatut());
        dto.setDateCreation(instance.getDateCreation());
        dto.setLastLogin(instance.getLastLogin());
        dto.setSlaTraitementJours(instance.getSlaTraitementJours());
        dto.setUpdatedAt(instance.getUpdatedAt());

        if (instance.getStructure() != null) {
            dto.setStructureId(instance.getStructure().getId());
            dto.setStructureName(instance.getStructure().getOfficialName());
            dto.setStructureCode(instance.getStructure().getCode());
            dto.setStructureType(instance.getStructure().getType());
        }
        return dto;
    }

}
