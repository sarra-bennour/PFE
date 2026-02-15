package com.tunisia.commerce.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.UUID;
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

    public void sendVerificationEmail(String toEmail, String verificationToken, String companyName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Vérification de votre compte - Portail National Tunisien");

            // Préparer le contexte pour le template
            Context context = new Context();
            context.setVariable("companyName", companyName);
            context.setVariable("verificationUrl", frontendUrl + "/#/login?token=" + verificationToken);
            context.setVariable("supportEmail", "support@tunisia-commerce.gov.tn");

            // Charger le template HTML
            String htmlContent = templateEngine.process("email/verification", context);

            helper.setText(htmlContent, true);

            mailSender.send(message);

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

            // Préparer le contexte pour le template
            Context context = new Context();
            context.setVariable("companyName", companyName);
            context.setVariable("resetUrl", frontendUrl + "/#/reset-password?token=" + resetToken);
            context.setVariable("supportEmail", "support@tunisia-commerce.gov.tn");
            context.setVariable("expiryHours", 24); // Token valide 24 heures

            // Charger le template HTML
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

            // Préparer le contexte pour le template
            Context context = new Context();
            context.setVariable("companyName", companyName);
            context.setVariable("supportEmail", "support@tunisia-commerce.gov.tn");
            context.setVariable("loginUrl", frontendUrl + "/#/login");
            context.setVariable("currentDate", java.time.LocalDate.now().toString());

            // Charger le template HTML (vous devrez créer ce template)
            String htmlContent = templateEngine.process("email/password-change-notification", context);

            helper.setText(htmlContent, true);
            mailSender.send(message);

            logger.info("Notification de changement de mot de passe envoyée à: " + toEmail);

        } catch (MessagingException e) {
            throw new RuntimeException("Erreur lors de l'envoi de la notification de changement de mot de passe", e);
        }
    }
}