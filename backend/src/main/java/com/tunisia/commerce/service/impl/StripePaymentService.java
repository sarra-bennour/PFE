package com.tunisia.commerce.service.impl;

import com.stripe.Stripe;
import com.stripe.exception.CardException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.PaymentIntentConfirmParams;
import com.tunisia.commerce.dto.payment.CreatePaymentIntentRequest;
import com.tunisia.commerce.dto.payment.CreatePaymentIntentResponse;
import com.tunisia.commerce.dto.payment.PaymentResponseDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.entity.User;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.PaymentStatus;
import com.tunisia.commerce.enums.ValidationNotificationType;
import com.tunisia.commerce.exception.PaymentException;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.repository.ImportateurRepository;
import com.tunisia.commerce.repository.UserRepository;
import com.tunisia.commerce.service.EmailService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StripePaymentService {

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @Value("${app.dossier.fees}")
    private double dossierFees;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private final DemandeEnregistrementRepository demandeRepository;
    private final ExportateurRepository exportateurRepository;
    private final ImportateurRepository importateurRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    private static final Logger logger = Logger.getLogger(ExportateurDossierService.class.getName());


    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
        log.info("Stripe API initialisé avec la clé: {}", stripeApiKey.substring(0, 8) + "...");
    }

    /**
     * Créer un PaymentIntent Stripe (pour EXPORTATEUR et IMPORTATEUR)
     */
    public CreatePaymentIntentResponse createPaymentIntent(Long userId, String userRole, CreatePaymentIntentRequest request) {
        try {
            log.info("📝 Création de PaymentIntent pour utilisateur ID: {}, Rôle: {}", userId, userRole);

            // 1. Récupérer l'utilisateur et vérifier son existence
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // 2. Récupérer la demande
            DemandeEnregistrement demande = demandeRepository.findById(request.getDemandeId())
                    .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

            // 3. Vérifier que la demande appartient à l'utilisateur
            if (userRole.equals("EXPORTATEUR")) {
                if (!demande.getExportateur().getId().equals(userId)) {
                    throw new RuntimeException("Accès non autorisé: cette demande n'appartient pas à cet exportateur");
                }
            } else if (userRole.equals("IMPORTATEUR")) {
                if (demande.getImportateur() == null || !demande.getImportateur().getId().equals(userId)) {
                    throw new RuntimeException("Accès non autorisé: cette demande n'appartient pas à cet importateur");
                }
            }

            // 4. Vérifier que la demande peut être payée
            if (demande.getStatus() != DemandeStatus.SOUMISE) {
                throw new RuntimeException("Cette demande doit être soumise avant le paiement (statut: " + demande.getStatus() + ")");
            }

            if (demande.getPaymentStatus() != PaymentStatus.EN_ATTENTE) {
                throw new RuntimeException("Cette demande a déjà un paiement en cours (statut: " + demande.getPaymentStatus() + ")");
            }

            // 5. Préparer les métadonnées
            Map<String, String> metadata = new HashMap<>();
            metadata.put("demandeId", demande.getId().toString());
            metadata.put("userId", userId.toString());
            metadata.put("userRole", userRole);
            metadata.put("reference", demande.getReference());
            metadata.put("email", user.getEmail());

            // 6. Créer le PaymentIntent SANS confirmation immédiate
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount((long) (dossierFees * 100))
                    .setCurrency("usd")
                    .setDescription("Frais de dossier - " + demande.getReference())
                    .putAllMetadata(metadata)
                    .setReceiptEmail(user.getEmail())
                    .addPaymentMethodType("card")
                    .setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.AUTOMATIC)
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            log.info("✅ PaymentIntent créé: {} pour la demande {}", paymentIntent.getId(), demande.getId());

            // 7. Mettre à jour la demande
            demande.setPaymentStatus(PaymentStatus.INITIE);
            demande.setPaymentReference(paymentIntent.getId());
            demande.setPaymentAmount(BigDecimal.valueOf(dossierFees));
            demandeRepository.save(demande);

            // 8. Retourner la réponse
            return CreatePaymentIntentResponse.builder()
                    .clientSecret(paymentIntent.getClientSecret())
                    .paymentIntentId(paymentIntent.getId())
                    .demandeId(demande.getId())
                    .amount(dossierFees)
                    .currency(paymentIntent.getCurrency())
                    .requiresAction(false)
                    .build();

        } catch (StripeException e) {
            log.error("❌ Erreur Stripe lors de la création du PaymentIntent", e);
            throw new RuntimeException("Erreur de paiement: " + e.getMessage());
        }
    }

    /**
     * Confirmer le paiement avec le PaymentMethod ID (pour EXPORTATEUR et IMPORTATEUR)
     */
    /**
     * Confirmer le paiement avec le PaymentMethod ID (pour EXPORTATEUR et IMPORTATEUR)
     */
    public PaymentResponseDTO confirmPayment(Long userId, String userRole, Map<String, Object> paymentDetails) {
        try {
            String paymentIntentId = (String) paymentDetails.get("paymentIntentId");
            String paymentMethodId = (String) paymentDetails.get("paymentMethodId");
            String cardHolderName = (String) paymentDetails.get("cardHolderName");
            String receiptEmail = (String) paymentDetails.get("receiptEmail");

            log.info("💰 Confirmation du paiement pour paymentIntentId: {} avec paymentMethodId: {}, Rôle: {}",
                    paymentIntentId, paymentMethodId, userRole);

            // 1. Récupérer le PaymentIntent depuis Stripe
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);

            // 2. Confirmer le PaymentIntent avec le PaymentMethod ID
            PaymentIntentConfirmParams confirmParams = PaymentIntentConfirmParams.builder()
                    .setPaymentMethod(paymentMethodId)
                    .setReceiptEmail(receiptEmail)
                    .build();

            paymentIntent = paymentIntent.confirm(confirmParams);

            // 3. Vérifier le statut du paiement
            if ("succeeded".equals(paymentIntent.getStatus())) {

                // Récupérer la demande depuis les métadonnées
                String demandeIdStr = paymentIntent.getMetadata().get("demandeId");
                if (demandeIdStr == null) {
                    throw new RuntimeException("DemandeId non trouvé dans les métadonnées");
                }

                Long demandeId = Long.parseLong(demandeIdStr);
                DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                        .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

                // ✅ Récupérer l'utilisateur depuis la base de données
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec ID: " + userId));

                // Vérifier que l'utilisateur correspond à la demande
                if (userRole.equals("EXPORTATEUR")) {
                    if (demande.getExportateur() == null || !demande.getExportateur().getId().equals(userId)) {
                        throw new RuntimeException("Accès non autorisé: cette demande n'appartient pas à cet exportateur");
                    }
                } else if (userRole.equals("IMPORTATEUR")) {
                    if (demande.getImportateur() == null || !demande.getImportateur().getId().equals(userId)) {
                        throw new RuntimeException("Accès non autorisé: cette demande n'appartient pas à cet importateur");
                    }
                }

                // Mettre à jour le statut de la demande
                demande.setPaymentStatus(PaymentStatus.REUSSI);
                demande.setPaymentReference(paymentIntent.getId());
                demande.setPaymentAmount(BigDecimal.valueOf(paymentIntent.getAmount() / 100.0));
                demandeRepository.save(demande);

                log.info("✅ Paiement réussi pour la demande: {}", demandeId);

                // Envoyer la confirmation par email avec l'utilisateur récupéré
                sendPaymentConfirmationEmail(user, demande, receiptEmail);

                return PaymentResponseDTO.builder()
                        .success(true)
                        .message("Paiement confirmé avec succès")
                        .transactionId(paymentIntent.getId())
                        .paymentReference(paymentIntent.getId())
                        .amount(paymentIntent.getAmount() / 100.0)
                        .paymentDate(LocalDateTime.now())
                        .status("EN_COURS_VALIDATION")
                        .timestamp(LocalDateTime.now())
                        .cardHolderName(cardHolderName)
                        .emailDestination(receiptEmail)
                        .build();

            } else if ("requires_action".equals(paymentIntent.getStatus())) {
                // Authentification 3D Secure requise
                return PaymentResponseDTO.builder()
                        .success(false)
                        .message("Authentification requise")
                        .requiresAction(true)
                        .clientSecret(paymentIntent.getClientSecret())
                        .build();

            } else {
                log.error("❌ Le paiement a échoué: {}", paymentIntent.getStatus());
                return PaymentResponseDTO.builder()
                        .success(false)
                        .message("Le paiement a échoué: " + paymentIntent.getStatus())
                        .transactionId(paymentIntent.getId())
                        .timestamp(LocalDateTime.now())
                        .build();
            }

        } catch (CardException e) {
            log.error("❌ Erreur de carte: code={}, declineCode={}, message={}",
                    e.getCode(), e.getDeclineCode(), e.getMessage());

            String errorCode = e.getCode();
            String declineCode = e.getDeclineCode();

            if ("card_declined".equals(errorCode)) {
                if ("insufficient_funds".equals(declineCode)) {
                    throw PaymentException.insufficientFunds(e);
                } else if ("lost_card".equals(declineCode)) {
                    throw PaymentException.lostCard(e);
                } else if ("stolen_card".equals(declineCode)) {
                    throw PaymentException.stolenCard(e);
                } else {
                    throw PaymentException.cardDeclined(e);
                }
            } else if ("expired_card".equals(errorCode)) {
                throw PaymentException.expiredCard(e);
            } else if ("incorrect_cvc".equals(errorCode)) {
                throw PaymentException.incorrectCvc(e);
            } else if ("authentication_required".equals(errorCode)) {
                throw PaymentException.authenticationRequired(e);
            } else {
                throw new PaymentException(
                        "CARD_ERROR",
                        "Erreur de paiement: " + e.getMessage(),
                        e
                );
            }

        } catch (StripeException e) {
            log.error("❌ Erreur Stripe lors de la confirmation", e);
            throw PaymentException.processingError(e);

        } catch (Exception e) {
            log.error("❌ Erreur inattendue", e);
            throw new PaymentException(
                    "UNKNOWN_ERROR",
                    "Une erreur inattendue est survenue. Veuillez réessayer.",
                    e
            );
        }
    }

    private void handlePaymentIntentSucceeded(Event event) {
        PaymentIntent paymentIntent = getPaymentIntentFromEvent(event);
        if (paymentIntent == null) return;

        String demandeIdStr = paymentIntent.getMetadata().get("demandeId");
        if (demandeIdStr != null) {
            Long demandeId = Long.parseLong(demandeIdStr);
            DemandeEnregistrement demande = demandeRepository.findById(demandeId).orElse(null);

            if (demande != null) {
                demande.setPaymentStatus(PaymentStatus.REUSSI);
                demandeRepository.save(demande);

                log.info("Paiement réussi pour la demande: {}", demandeId);

                String emailDestination = paymentIntent.getReceiptEmail() != null
                        ? paymentIntent.getReceiptEmail()
                        : paymentIntent.getMetadata().get("email");

                String userIdStr = paymentIntent.getMetadata().get("userId");
                String userRole = paymentIntent.getMetadata().get("userRole");

                if (userIdStr != null && userRole != null) {
                    Long userId = Long.parseLong(userIdStr);
                    userRepository.findById(userId).ifPresent(user -> {
                        sendPaymentConfirmationEmail(user, demande, emailDestination);
                    });
                }
            }
        }
    }

    /**
     * Extraire PaymentIntent de l'événement
     */
    private PaymentIntent getPaymentIntentFromEvent(Event event) {
        EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
        if (dataObjectDeserializer.getObject().isPresent()) {
            StripeObject stripeObject = dataObjectDeserializer.getObject().get();
            if (stripeObject instanceof PaymentIntent) {
                return (PaymentIntent) stripeObject;
            }
        }
        return null;
    }

    // ==================== MÉTHODES D'ENVOI D'EMAIL ====================

    private void sendPaymentConfirmationEmail(User user, DemandeEnregistrement demande, String emailDestination) {
        try {
            String userName = "";
            if (user instanceof ExportateurEtranger) {
                ExportateurEtranger exportateur = (ExportateurEtranger) user;
                userName = exportateur.getRaisonSociale() != null ?
                        exportateur.getRaisonSociale() : (exportateur.getNom() + " " + exportateur.getPrenom());
            } else if (user instanceof ImportateurTunisien) {
                ImportateurTunisien importateur = (ImportateurTunisien) user;
                userName = importateur.getRaisonSociale() != null ?
                        importateur.getRaisonSociale() : (importateur.getNom() + " " + importateur.getPrenom());
            } else {
                userName = user.getEmail();
            }

            Map<String, Object> params = new HashMap<>();
            params.put("paymentReference", demande.getPaymentReference());
            params.put("amount", demande.getPaymentAmount() != null ?
                    demande.getPaymentAmount().toString() : "100");
            params.put("date", LocalDateTime.now().toString());
            params.put("demandeReference", demande.getReference());
            params.put("dashboardUrl", frontendUrl + "/dashboard");

            emailService.sendValidationNotification(
                    emailDestination,
                    userName,
                    ValidationNotificationType.PAIEMENT_CONFIRME,
                    params
            );

            log.info("✅ Email de confirmation envoyé à: {}", emailDestination);

        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de l'email de confirmation", e);
        }
    }

    private void sendPaymentFailureEmail(User user, DemandeEnregistrement demande, String errorMessage) {
        try {
            String userName = "";
            if (user instanceof ExportateurEtranger) {
                ExportateurEtranger exportateur = (ExportateurEtranger) user;
                userName = exportateur.getRaisonSociale() != null ?
                        exportateur.getRaisonSociale() : (exportateur.getNom() + " " + exportateur.getPrenom());
            } else if (user instanceof ImportateurTunisien) {
                ImportateurTunisien importateur = (ImportateurTunisien) user;
                userName = importateur.getRaisonSociale() != null ?
                        importateur.getRaisonSociale() : (importateur.getNom() + " " + importateur.getPrenom());
            } else {
                userName = user.getEmail();
            }

            Map<String, Object> params = new HashMap<>();
            params.put("errorMessage", errorMessage);
            params.put("demandeReference", demande.getReference());
            params.put("retryUrl", frontendUrl + "/dashboard");
            params.put("supportEmail", "support@tunisia-commerce.gov.tn");

            emailService.sendValidationNotification(
                    user.getEmail(),
                    userName,
                    ValidationNotificationType.PAIEMENT_ECHOUE,
                    params
            );

            log.info("Email d'échec de paiement envoyé à: {}", user.getEmail());

        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email d'échec", e);
        }
    }
}