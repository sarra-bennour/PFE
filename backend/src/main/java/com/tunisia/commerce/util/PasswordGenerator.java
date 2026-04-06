package com.tunisia.commerce.util;

import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.entity.User;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.LocalDate;

@Component
public class PasswordGenerator {

    private static final String UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWERCASE = "abcdefghijkmnpqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "!@#$%^&*";
    private static final String ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;

    private static final SecureRandom random = new SecureRandom();

    /**
     * Génère un mot de passe basé sur les attributs de l'utilisateur
     * (Pour les importateurs, retourne null car ils n'ont pas de mot de passe)
     */
    public static String generatePasswordForUser(User user) {
        // Les importateurs n'ont pas de mot de passe (authentification Mobile ID)
        if (user instanceof ImportateurTunisien) {
            return null;
        }

        StringBuilder password = new StringBuilder();

        if (user instanceof ExportateurEtranger) {
            ExportateurEtranger exportateur = (ExportateurEtranger) user;
            password.append(generatePasswordForExportateur(exportateur));
        }
        else {
            password.append(generatePasswordForAdmin(user));
        }

        // Compléter pour atteindre minimum 12 caractères
        while (password.length() < 12) {
            password.append(getRandomChar(ALL_CHARS));
        }

        return shuffleString(password.toString());
    }

    /**
     * Génération pour exportateur étranger
     */
    private static String generatePasswordForExportateur(ExportateurEtranger exportateur) {
        StringBuilder pwd = new StringBuilder();

        // 1. Première lettre du pays en majuscule
        if (exportateur.getPaysOrigine() != null && exportateur.getPaysOrigine().length() > 0) {
            pwd.append(exportateur.getPaysOrigine().substring(0, 1).toUpperCase());
        } else {
            pwd.append("X");
        }

        // 2. Première lettre de la raison sociale en majuscule
        if (exportateur.getRaisonSociale() != null && exportateur.getRaisonSociale().length() > 0) {
            pwd.append(exportateur.getRaisonSociale().substring(0, 1).toUpperCase());
        } else {
            pwd.append("Y");
        }

        // 3. Les 3 derniers chiffres du registre de commerce
        if (exportateur.getNumeroRegistreCommerce() != null && exportateur.getNumeroRegistreCommerce().length() >= 3) {
            String rc = exportateur.getNumeroRegistreCommerce();
            pwd.append(rc.substring(rc.length() - 3));
        } else {
            pwd.append(getRandomDigits(3));
        }

        // 4. Année de création (2 derniers chiffres)
        if (exportateur.getDateCreation() != null) {
            String year = String.valueOf(exportateur.getDateCreation().getYear());
            pwd.append(year.substring(year.length() - 2));
        } else {
            pwd.append(getRandomDigits(2));
        }

        // 5. Caractère spécial
        pwd.append(getRandomChar(SPECIAL));

        // 6. 2 chiffres aléatoires
        pwd.append(getRandomDigits(2));

        return pwd.toString();
    }

    /**
     * Génération pour administrateur
     */
    private static String generatePasswordForAdmin(User admin) {
        StringBuilder pwd = new StringBuilder();

        pwd.append("ADM");
        pwd.append(String.valueOf(LocalDate.now().getYear()).substring(2));
        pwd.append(getRandomChar(SPECIAL));
        pwd.append(getRandomDigits(4));

        return pwd.toString();
    }

    /**
     * Génère un mot de passe simple (fallback)
     */
    public static String generateSimplePassword() {
        StringBuilder pwd = new StringBuilder();
        pwd.append(getRandomChar(UPPERCASE));
        pwd.append(getRandomChar(LOWERCASE));
        pwd.append(getRandomDigits(2));
        pwd.append(getRandomChar(SPECIAL));
        pwd.append(getRandomDigits(2));
        pwd.append(getRandomChar(LOWERCASE));
        return shuffleString(pwd.toString());
    }

    private static String getRandomDigits(int count) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < count; i++) {
            sb.append(DIGITS.charAt(random.nextInt(DIGITS.length())));
        }
        return sb.toString();
    }

    private static char getRandomChar(String source) {
        return source.charAt(random.nextInt(source.length()));
    }

    private static String shuffleString(String input) {
        char[] chars = input.toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }
        return new String(chars);
    }
}