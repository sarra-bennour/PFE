package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.exportateur.CreerDossierRequest;
import com.tunisia.commerce.dto.exportateur.PreKycRequest;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.Product;
import com.tunisia.commerce.enums.*;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.DocumentRepository;
import com.tunisia.commerce.repository.ExportateurRepository;
import com.tunisia.commerce.repository.ProductRepository;
import com.tunisia.commerce.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ExportateurDossierService {

    private final DemandeEnregistrementRepository demandeRepository;
    private final ExportateurRepository exportateurRepository;
    private final DocumentRepository documentRepository;
    private final ProductRepository productRepository;
    private final EmailService emailService;

    // Dossier de stockage des fichiers
    private final String UPLOAD_DIR = "uploads/documents/";
    private static final Logger logger = Logger.getLogger(ExportateurDossierService.class.getName());

    /**
     * Créer un nouveau dossier de conformité
     */
    public DemandeEnregistrement creerDossier(Long exportateurId, CreerDossierRequest request) {
        ExportateurEtranger exportateur = exportateurRepository.findById(exportateurId)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        // Vérifier si l'exportateur n'a pas déjà un dossier
        if (!demandeRepository.findByExportateurId(exportateurId).isEmpty()) {
            throw new RuntimeException("Un dossier existe déjà pour cet exportateur");
        }

        // Mettre à jour les informations de l'exportateur
        //updateExportateurInfo(exportateur, request);

        // Créer la demande
        DemandeEnregistrement demande = DemandeEnregistrement.builder()
                .exportateur(exportateur)
                .reference(generateReference())
                .status(DemandeStatus.BROUILLON)
                .typeDemandeur(TypeDemandeur.EXPORTATEUR)
                .submittedAt(null)
                .paymentStatus(PaymentStatus.EN_ATTENTE)
                .build();

        demande = demandeRepository.save(demande);

        // Créer les produits si présents
        if (request.getProduits() != null && !request.getProduits().isEmpty()) {
            request.getProduits().forEach(produitDTO -> {
                Product product = Product.builder()
                        .hsCode(produitDTO.getHsCode())
                        .category(produitDTO.getCategory())
                        .productName(produitDTO.getProductName())
                        .brandName(produitDTO.getBrandName())
                        .build();
                productRepository.save(product);
            });
        }

        //exportateurRepository.save(exportateur);
        return demande;
    }

    /**
     * Télécharger un document
     */
    public DocumentDTO uploadDocument(Long demandeId, Long exportateurId,
                                      MultipartFile file, String documentType) {

        System.out.println("=== UPLOAD DOCUMENT ===");
        System.out.println("1. demandeId: " + demandeId);
        System.out.println("2. exportateurId: " + exportateurId);
        System.out.println("3. documentType: " + documentType);
        System.out.println("4. fileName: " + file.getOriginalFilename());
        System.out.println("5. fileSize: " + file.getSize());
        System.out.println("6. contentType: " + file.getContentType());

        try {
            // 1. Chercher la demande
            DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                    .orElseThrow(() -> new RuntimeException("Demande non trouvée"));
            System.out.println("7. Demande trouvée: " + demande.getId());

            // 2. Vérifier l'autorisation
            if (!demande.getExportateur().getId().equals(exportateurId)) {
                throw new RuntimeException("Accès non autorisé");
            }
            System.out.println("8. Autorisation OK");

            // 3. Vérifier le type de document
            DocumentType type;
            try {
                type = DocumentType.valueOf(documentType);
                System.out.println("9. Type de document valide: " + type);
            } catch (IllegalArgumentException e) {
                System.err.println("Type de document invalide: " + documentType);
                System.err.println("Types disponibles: " + Arrays.toString(DocumentType.values()));
                throw new RuntimeException("Type de document invalide: " + documentType);
            }

            // 4. Créer le répertoire
            Path uploadPath = Paths.get(UPLOAD_DIR + demandeId);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                System.out.println("10. Répertoire créé: " + uploadPath);
            }

            // 5. Sauvegarder le fichier
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath);
            System.out.println("11. Fichier sauvegardé: " + filePath);

            // 6. Créer l'entité Document
            Document document = Document.builder()
                    .fileName(file.getOriginalFilename())
                    .filePath(filePath.toString())
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .documentType(type)
                    .status(DocumentStatus.EN_ATTENTE)
                    .uploadedAt(LocalDateTime.now())
                    .exportateur(demande.getExportateur())
                    .demande(demande)
                    .build();

            System.out.println("12. Document avant sauvegarde: " + document);

            // 7. Sauvegarder en BD
            document = documentRepository.save(document);
            System.out.println("13. Document sauvegardé avec ID: " + document.getId());

            // 8. Vérifier que la sauvegarde a fonctionné
            Document verif = documentRepository.findById(document.getId()).orElse(null);
            System.out.println("14. Vérification: " + (verif != null ? "OK" : "ECHEC"));

            return convertToDTO(document);

        } catch (IOException e) {
            System.err.println("ERREUR IO: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur lors du téléchargement: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("ERREUR: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Soumettre le dossier pour validation
     */
    public DemandeEnregistrement soumettreDossier(Long demandeId, Long exportateurId) {
        DemandeEnregistrement demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        // Vérifier que la demande appartient bien à l'exportateur
        if (!demande.getExportateur().getId().equals(exportateurId)) {
            throw new RuntimeException("Accès non autorisé");
        }

        // Vérifier que tous les documents requis sont téléchargés
        List<Document> documents = documentRepository.findByDemandeId(demandeId);
        if (documents.isEmpty()) {
            throw new RuntimeException("Vous devez télécharger au moins un document");
        }

        // Changer le statut
        demande.setStatus(DemandeStatus.SOUMISE);
        demande.setSubmittedAt(LocalDateTime.now());

        demande = demandeRepository.save(demande);

        return demande;
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private String generateReference() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uniqueId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return "DOS-" + dateStr + "-" + uniqueId;
    }


    /**
     * Récupérer un document par son ID en vérifiant qu'il appartient à l'exportateur
     */
    public DocumentDTO getDocumentById(Long documentId, Long exportateurId) {
        logger.info("Récupération du document ID: " + documentId + " pour l'exportateur: " + exportateurId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document non trouvé avec l'ID: " + documentId));

        // Vérifier que le document appartient bien à l'exportateur
        if (!document.getExportateur().getId().equals(exportateurId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à accéder à ce document");
        }

        return convertToDTO(document);
    }

    /**
     * Récupérer le fichier du document
     */
    public org.springframework.core.io.Resource getDocumentFile(Long documentId, Long exportateurId) {
        logger.info("Téléchargement du fichier du document ID: " + documentId + " pour l'exportateur: " + exportateurId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document non trouvé avec l'ID: " + documentId));

        // Vérifier que le document appartient bien à l'exportateur
        if (!document.getExportateur().getId().equals(exportateurId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à accéder à ce document");
        }

        try {
            Path filePath = Paths.get(document.getFilePath());
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Le fichier n'existe pas ou n'est pas accessible");
            }
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la lecture du fichier: " + e.getMessage());
        }
    }

    /**
     * Récupérer tous les documents d'un exportateur
     */
    /*public List<DocumentDTO> getAllDocumentsByExportateur(Long exportateurId) {
        logger.info("Récupération de tous les documents pour l'exportateur: " + exportateurId);

        ExportateurEtranger exportateur = exportateurRepository.findById(exportateurId)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        List<Document> documents = documentRepository.findByExportateurId(exportateurId);

        return documents.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }*/

    /**
     * Récupérer UNIQUEMENT les documents du dossier d'agrément (DOS-)
     */
    public List<DocumentDTO> getDossierAgrementByExportateur(Long exportateurId) {
        logger.info("Récupération des documents du dossier d'agrément pour l'exportateur ID: " + exportateurId);

        // Récupérer la demande d'agrément
        Optional<DemandeEnregistrement> demandeOpt = demandeRepository
                .findDossierConformiteByExportateurId(exportateurId);

        if (demandeOpt.isEmpty()) {
            logger.info("Aucun dossier d'agrément trouvé pour l'exportateur: " + exportateurId);
            return List.of(); // Retourner une liste vide
        }

        DemandeEnregistrement demande = demandeOpt.get();
        logger.info("Dossier d'agrément trouvé: " + demande.getReference());

        // Récupérer les documents de cette demande
        List<Document> documents = documentRepository.findByDemandeId(demande.getId());
        logger.info("Nombre de documents trouvés: " + documents.size());

        return documents.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }


    /**
     * Mapper Document -> DocumentDTO
     */

    private DocumentDTO convertToDTO(Document document) {
        if (document == null) return null;

        return DocumentDTO.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .filePath(document.getFilePath())
                .fileType(document.getFileType())
                .fileSize(document.getFileSize())
                .documentType(document.getDocumentType())
                .status(document.getStatus())
                .validationComment(document.getValidationComment())
                .uploadedAt(document.getUploadedAt())
                .downloadUrl("/api/exportateur/documents/" + document.getId() + "/telecharger")
                .build();
    }

    /**
     * Compléter le Pré-KYC (première étape avant le dossier de conformité)
     */
    /**
     * Compléter le Pré-KYC (première étape avant le dossier de conformité)
     */
    /*@Transactional
    public ExportateurEtranger completePreKyc(String email, PreKycRequest request) {
        logger.info("Complétion du Pré-KYC pour l'email: " + email);

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé avec l'email: " + email));

        // Vérifier si le Pré-KYC n'est pas déjà complété
        if (exportateur.isPreKycCompleted()) {
            throw new RuntimeException("Le Pré-KYC a déjà été complété");
        }

        // Validation du username
        String username = request.getUsername();
        if (username == null || username.trim().isEmpty()) {
            throw new RuntimeException("Le nom d'utilisateur est requis");
        }

        // Normaliser le username (enlever espaces, caractères spéciaux)
        username = username.toLowerCase().trim();
        if (!username.matches("^[a-z0-9_]+$")) {
            throw new RuntimeException("Le nom d'utilisateur ne peut contenir que des lettres minuscules, chiffres et underscores");
        }

        // Vérifier l'unicité
        if (exportateurRepository.existsByUsername(username)) {
            // Si le username est déjà pris, suggérer des alternatives
            List<String> suggestions = suggererUsernames(exportateur.getRaisonSociale(), email);
            String suggestionsStr = String.join(", ", suggestions);
            throw new RuntimeException("Ce nom d'utilisateur est déjà pris. Suggestions: " + suggestionsStr);
        }

        // Vérifier le numéro officiel d'enregistrement (si nécessaire)
        if (request.getNumeroOfficielEnregistrement() != null &&
                exportateurRepository.existsByNumeroOfficielEnregistrement(request.getNumeroOfficielEnregistrement())) {
            throw new RuntimeException("Ce numéro d'enregistrement officiel est déjà utilisé");
        }

        // Mettre à jour les champs
        exportateur.setUsername(username);
        exportateur.setNumeroOfficielEnregistrement(request.getNumeroOfficielEnregistrement());
        exportateur.setSiteType(request.getSiteType());
        exportateur.setRepresentantRole(request.getRepresentantRole());
        exportateur.setRepresentantEmail(request.getRepresentantEmail());
        exportateur.setCapaciteAnnuelle(request.getCapaciteAnnuelle());
        exportateur.setPreKycCompleted(true);
        exportateur.setPreKycCompletedAt(LocalDateTime.now());

        // Mettre à jour le statut utilisateur
        exportateur.setUserStatut(UserStatus.ACTIF);

        ExportateurEtranger savedExportateur = exportateurRepository.save(exportateur);
        logger.info("Pré-KYC complété avec succès pour l'exportateur ID: " + savedExportateur.getId() +
                ", username: " + username);

        return savedExportateur;
    }*/

    /**
     * Générer des suggestions de username basées sur le nom de l'entreprise
     */
    public List<String> suggererUsernames(String companyName, String email) {
        logger.info("Génération de suggestions de username pour: " + companyName);

        List<String> suggestions = new ArrayList<>();

        if (companyName == null || companyName.isEmpty()) {
            // Si pas de nom d'entreprise, utiliser la partie locale de l'email
            String emailPrefix = email.split("@")[0];
            companyName = emailPrefix;
        }

        // Nettoyer le nom de l'entreprise (enlever caractères spéciaux, espaces, etc.)
        String baseName = companyName.toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9]", "_") // Remplacer caractères non alphanumériques par _
                .replaceAll("_+", "_")         // Remplacer plusieurs _ consécutifs par un seul
                .replaceAll("^_|_$", "");      // Enlever _ au début et à la fin

        if (baseName.isEmpty()) {
            baseName = "exportateur";
        }

        // Suggestions de base
        suggestions.add(baseName);
        suggestions.add(baseName + "_export");
        suggestions.add(baseName + "_tn");
        suggestions.add(baseName + "_tunisie");

        // Ajouter des variantes avec des chiffres
        for (int i = 1; i <= 5; i++) {
            suggestions.add(baseName + i);
            suggestions.add(baseName + "_" + i);
        }

        // Vérifier l'unicité et générer des alternatives si nécessaire
        List<String> suggestionsUniques = new ArrayList<>();
        for (String suggestion : suggestions) {
            if (!exportateurRepository.existsByUsername(suggestion)) {
                suggestionsUniques.add(suggestion);
            }
            if (suggestionsUniques.size() >= 5) {
                break; // On garde 5 suggestions max
            }
        }

        // Si pas assez de suggestions, en générer avec des nombres aléatoires
        int counter = 1;
        while (suggestionsUniques.size() < 5) {
            String suggestion = baseName + "_" + (100 + counter);
            if (!exportateurRepository.existsByUsername(suggestion)) {
                suggestionsUniques.add(suggestion);
            }
            counter++;
        }

        logger.info(suggestionsUniques.size() + " suggestions générées");
        return suggestionsUniques;
    }

    /**
     * Compléter le Pré-KYC (première étape avant le dossier de conformité)
     */
    @Transactional
    public ExportateurEtranger completePreKyc(String email, PreKycRequest request) {
        logger.info("Complétion du Pré-KYC pour l'email: " + email);

        ExportateurEtranger exportateur = exportateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé avec l'email: " + email));

        if (exportateur.isPreKycCompleted()) {
            throw new RuntimeException("Le Pré-KYC a déjà été complété");
        }

        // Validation du username
        String username = request.getUsername();
        if (username == null || username.trim().isEmpty()) {
            throw new RuntimeException("Le nom d'utilisateur est requis");
        }

        username = username.toLowerCase().trim();
        if (!username.matches("^[a-z0-9_]+$")) {
            throw new RuntimeException("Le nom d'utilisateur ne peut contenir que des lettres minuscules, chiffres et underscores");
        }

        if (exportateurRepository.existsByUsername(username)) {
            List<String> suggestions = suggererUsernames(exportateur.getRaisonSociale(), email);
            String suggestionsStr = String.join(", ", suggestions);
            throw new RuntimeException("Ce nom d'utilisateur est déjà pris. Suggestions: " + suggestionsStr);
        }

        // Numéro officiel d'enregistrement
        if (request.getNumeroOfficielEnregistrement() != null && !request.getNumeroOfficielEnregistrement().trim().isEmpty()) {
            exportateur.setNumeroOfficielEnregistrement(request.getNumeroOfficielEnregistrement());
        }

        // Capacité annuelle - Version simplifiée pour Double
        if (request.getCapaciteAnnuelle() != null) {
            exportateur.setCapaciteAnnuelle(request.getCapaciteAnnuelle());
        }

        // Autres champs
        exportateur.setUsername(username);
        exportateur.setSiteType(request.getSiteType());
        exportateur.setRepresentantRole(request.getRepresentantRole());
        exportateur.setRepresentantEmail(request.getRepresentantEmail());
        exportateur.setPreKycCompleted(true);
        exportateur.setPreKycCompletedAt(LocalDateTime.now());
        exportateur.setNumeroTVA(request.getNumeroTVA());
        exportateur.setUserStatut(UserStatus.ACTIF);

        ExportateurEtranger savedExportateur = exportateurRepository.save(exportateur);
        logger.info("Pré-KYC complété avec succès pour l'exportateur ID: " + savedExportateur.getId());

        return savedExportateur;
    }
}