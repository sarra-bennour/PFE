package com.tunisia.commerce.service;

import com.tunisia.commerce.enums.ValidationNotificationType;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;


@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    Logger logger = Logger.getLogger(getClass().getName());

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    // ==================== MÉTHODES EXISTANTES (INCHANGÉES) ====================

    public void sendVerificationEmail(String toEmail, String verificationToken, String companyName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Vérification de votre compte - Portail National Tunisien");

            Context context = new Context();
            context.setVariable("companyName", companyName);
            context.setVariable("verificationUrl", frontendUrl + "/#/login?token=" + verificationToken);
            context.setVariable("supportEmail", "support@tunisia-commerce.gov.tn");

            String htmlContent = templateEngine.process("email/verification", context);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("Email de vérification envoyé à: " + toEmail);

        } catch (MessagingException e) {
            throw new RuntimeException("Erreur lors de l'envoi de l'email de vérification", e);
        }
    }

    public void sendPasswordResetEmail(String toEmail, String resetToken, String companyName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Réinitialisation de votre mot de passe - Portail National Tunisien");

            Context context = new Context();
            context.setVariable("companyName", companyName);
            context.setVariable("resetUrl", frontendUrl + "/#/reset-password?token=" + resetToken);
            context.setVariable("supportEmail", "support@tunisia-commerce.gov.tn");
            context.setVariable("expiryHours", 24);

            String htmlContent = templateEngine.process("email/password-reset", context);
            helper.setText(htmlContent, true);
            mailSender.send(message);

            logger.info("Email de réinitialisation envoyé à: " + toEmail);

        } catch (MessagingException e) {
            throw new RuntimeException("Erreur lors de l'envoi de l'email de réinitialisation", e);
        }
    }

    public void sendPasswordChangeNotification(String toEmail, String companyName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Confirmation de changement de mot de passe - Portail National Tunisien");

            Context context = new Context();
            context.setVariable("companyName", companyName);
            context.setVariable("supportEmail", "support@tunisia-commerce.gov.tn");
            context.setVariable("loginUrl", frontendUrl + "/#/login");
            context.setVariable("currentDate", LocalDate.now().toString());

            String htmlContent = templateEngine.process("email/password-change-notification", context);
            helper.setText(htmlContent, true);
            mailSender.send(message);

            logger.info("Notification de changement de mot de passe envoyée à: " + toEmail);

        } catch (MessagingException e) {
            throw new RuntimeException("Erreur lors de l'envoi de la notification de changement de mot de passe", e);
        }
    }

    // ==================== UNE SEULE MÉTHODE GÉNÉRIQUE POUR LES NOTIFICATIONS DE VALIDATION ====================

    /**
     * Méthode unique pour envoyer tous les types de notifications de validation
     * @param toEmail Email du destinataire
     * @param companyName Nom de l'entreprise
     * @param type Type de notification (DOCUMENTS_VALIDES, DEMANDE_APPROUVEE, etc.)
     * @param additionalParams Paramètres supplémentaires spécifiques au type
     */
    public void sendValidationNotification(String toEmail, String companyName,
                                           ValidationNotificationType type,
                                           Map<String, Object> additionalParams) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(getSubjectForType(type));

            Context context = new Context();
            context.setVariable("companyName", companyName);
            context.setVariable("supportEmail", "support@tunisia-commerce.gov.tn");
            context.setVariable("frontendUrl", frontendUrl);
            context.setVariable("currentDate", LocalDate.now().toString());

            // Ajouter les paramètres supplémentaires
            if (additionalParams != null) {
                additionalParams.forEach(context::setVariable);
            }

            String templateName = getTemplateForType(type);
            String htmlContent = templateEngine.process(templateName, context);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("Notification de validation (" + type + ") envoyée à: " + toEmail);

        } catch (MessagingException e) {
            throw new RuntimeException("Erreur lors de l'envoi de la notification de validation", e);
        }
    }

    /**
     * Méthode de convenance pour les documents validés
     */
    public void sendDocumentsValidesNotification(String toEmail, String companyName) {
        Map<String, Object> params = new HashMap<>();
        params.put("dashboardUrl", frontendUrl + "/#/exporter/dashboard");

        sendValidationNotification(toEmail, companyName,
                ValidationNotificationType.DOCUMENTS_VALIDES,
                params);
    }

    /**
     * Méthode de convenance pour la demande approuvée
     */
    public void sendDemandeApprouveeNotification(String toEmail, String companyName, String numeroAgrement) {
        Map<String, Object> params = new HashMap<>();
        params.put("numeroAgrement", numeroAgrement);
        params.put("certificatUrl", frontendUrl + "/#/exporter/certificat/" + numeroAgrement);

        sendValidationNotification(toEmail, companyName,
                ValidationNotificationType.DEMANDE_APPROUVEE,
                params);
    }

    /**
     * Méthode de convenance pour la demande rejetée
     */
    public void sendDemandeRejeteeNotification(String toEmail, String companyName, String comment) {
        Map<String, Object> params = new HashMap<>();
        params.put("comment", comment);
        params.put("contactUrl", frontendUrl + "/#/contact");

        sendValidationNotification(toEmail, companyName,
                ValidationNotificationType.DEMANDE_REJETEE,
                params);
    }

    /**
     * Méthode de convenance pour les informations requises
     */
    public void sendInformationsRequisesNotification(String toEmail, String companyName, String message) {
        Map<String, Object> params = new HashMap<>();
        params.put("message", message);
        params.put("dashboardUrl", frontendUrl + "/#/exporter/dashboard");

        sendValidationNotification(toEmail, companyName,
                ValidationNotificationType.INFORMATIONS_REQUISES,
                params);
    }

    /**
     * Détermine le sujet en fonction du type de notification
     */
    private String getSubjectForType(ValidationNotificationType type) {
        switch (type) {
            case DOCUMENTS_VALIDES:
                return "Documents validés - Portail National Tunisien";
            case DEMANDE_APPROUVEE:
                return "Félicitations! Votre demande d'agrément est approuvée";
            case DEMANDE_REJETEE:
                return "Mise à jour concernant votre demande d'agrément";
            case INFORMATIONS_REQUISES:
                return "Informations complémentaires requises - Portail National Tunisien";
            default:
                return "Notification - Portail National Tunisien";
        }
    }

    /**
     * Détermine le template en fonction du type de notification
     */
    private String getTemplateForType(ValidationNotificationType type) {
        switch (type) {
            case DOCUMENTS_VALIDES:
                return "email/documents-valides";
            case DEMANDE_APPROUVEE:
                return "email/demande-approuvee";
            case DEMANDE_REJETEE:
                return "email/demande-rejetee";
            case INFORMATIONS_REQUISES:
                return "email/informations-requises";
            default:
                return "email/notification-generique";
        }
    }
}