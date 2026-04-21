package com.tunisia.commerce.util;

import com.tunisia.commerce.entity.*;
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

    public static String generatePasswordForUser(User user) {
        if (user instanceof ImportateurTunisien) {
            return null;
        }

        StringBuilder password = new StringBuilder();

        if (user instanceof ExportateurEtranger) {
            ExportateurEtranger exportateur = (ExportateurEtranger) user;
            password.append(generatePasswordForExportateur(exportateur));
        }
        else if (user instanceof InstanceValidation) {
            InstanceValidation instance = (InstanceValidation) user;
            password.append(generatePasswordForInstanceValidation(instance));
        }
        else {
            password.append(generatePasswordForAdmin(user));
        }

        while (password.length() < 12) {
            password.append(getRandomChar(ALL_CHARS));
        }

        return shuffleString(password.toString());
    }

    private static String generatePasswordForExportateur(ExportateurEtranger exportateur) {
        StringBuilder pwd = new StringBuilder();

        if (exportateur.getPaysOrigine() != null && exportateur.getPaysOrigine().length() > 0) {
            pwd.append(exportateur.getPaysOrigine().substring(0, 1).toUpperCase());
        } else {
            pwd.append("X");
        }

        if (exportateur.getRaisonSociale() != null && exportateur.getRaisonSociale().length() > 0) {
            pwd.append(exportateur.getRaisonSociale().substring(0, 1).toUpperCase());
        } else {
            pwd.append("Y");
        }

        if (exportateur.getNumeroRegistreCommerce() != null && exportateur.getNumeroRegistreCommerce().length() >= 3) {
            String rc = exportateur.getNumeroRegistreCommerce();
            pwd.append(rc.substring(rc.length() - 3));
        } else {
            pwd.append(getRandomDigits(3));
        }

        if (exportateur.getDateCreation() != null) {
            String year = String.valueOf(exportateur.getDateCreation().getYear());
            pwd.append(year.substring(year.length() - 2));
        } else {
            pwd.append(getRandomDigits(2));
        }

        pwd.append(getRandomChar(SPECIAL));
        pwd.append(getRandomDigits(2));

        return pwd.toString();
    }

    private static String generatePasswordForInstanceValidation(InstanceValidation instance) {
        StringBuilder pwd = new StringBuilder();

        StructureInterne structure = instance.getStructure();

        // 2 premières lettres du nom officiel de la structure
        if (structure != null && structure.getOfficialName() != null && structure.getOfficialName().length() >= 2) {
            pwd.append(structure.getOfficialName().substring(0, 2).toUpperCase());
        } else if (structure != null && structure.getOfficialName() != null && structure.getOfficialName().length() == 1) {
            pwd.append(structure.getOfficialName().substring(0, 1).toUpperCase());
            pwd.append("X");
        } else {
            pwd.append("ST");
        }

        // Première partie du code de la structure
        if (structure != null && structure.getCode() != null && structure.getCode().contains("_")) {
            String codePart = structure.getCode().split("_")[0];
            if (codePart.length() >= 3) {
                pwd.append(codePart.substring(0, 3));
            } else {
                pwd.append(codePart);
                pwd.append(getRandomChar(UPPERCASE));
            }
        } else if (structure != null && structure.getCode() != null && structure.getCode().length() >= 3) {
            pwd.append(structure.getCode().substring(0, 3));
        } else {
            pwd.append("STR");
        }

        // SLA
        if (instance.getSlaTraitementJours() != null) {
            String sla = String.format("%02d", instance.getSlaTraitementJours());
            pwd.append(sla);
        } else {
            pwd.append("05");
        }

        // Année
        if (instance.getDateCreation() != null) {
            String year = String.valueOf(instance.getDateCreation().getYear());
            pwd.append(year.substring(year.length() - 2));
        } else {
            pwd.append(String.valueOf(LocalDate.now().getYear()).substring(2));
        }

        // Type de structure (MINISTRY, BANK, CUSTOMS)
        if (structure != null && structure.getType() != null) {
            switch (structure.getType()) {
                case MINISTRY:
                    pwd.append("M");
                    break;
                case BANK:
                    pwd.append("B");
                    break;
                case CUSTOMS:
                    pwd.append("C");
                    break;
                default:
                    pwd.append("S");
                    break;
            }
        } else {
            pwd.append("V");
        }

        pwd.append(getRandomChar(SPECIAL));
        pwd.append(getRandomDigits(2));

        return pwd.toString();
    }

    private static String generatePasswordForAdmin(User admin) {
        StringBuilder pwd = new StringBuilder();
        pwd.append("ADM");
        pwd.append(String.valueOf(LocalDate.now().getYear()).substring(2));
        pwd.append(getRandomChar(SPECIAL));
        pwd.append(getRandomDigits(4));
        return pwd.toString();
    }

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