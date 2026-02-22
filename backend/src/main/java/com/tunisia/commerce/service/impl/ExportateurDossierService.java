package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.exportateur.CreerDossierRequest;
import com.tunisia.commerce.dto.validation.DocumentDTO;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.Document;
import com.tunisia.commerce.entity.ExportateurEtranger;
import com.tunisia.commerce.entity.Product;
import com.tunisia.commerce.enums.DemandeStatus;
import com.tunisia.commerce.enums.DocumentStatus;
import com.tunisia.commerce.enums.DocumentType;
import com.tunisia.commerce.enums.PaymentStatus;
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
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

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

    /**
     * Créer un nouveau dossier de conformité
     */
    public DemandeEnregistrement creerDossier(Long exportateurId, CreerDossierRequest request) {
        ExportateurEtranger exportateur = exportateurRepository.findById(exportateurId)
                .orElseThrow(() -> new RuntimeException("Exportateur non trouvé"));

        // Vérifier si l'exportateur n'a pas déjà un dossier
        if (demandeRepository.findByExportateurId(exportateurId).isPresent()) {
            throw new RuntimeException("Un dossier existe déjà pour cet exportateur");
        }

        // Mettre à jour les informations de l'exportateur
        //updateExportateurInfo(exportateur, request);

        // Créer la demande
        DemandeEnregistrement demande = DemandeEnregistrement.builder()
                .exportateur(exportateur)
                .reference(generateReference())
                .status(DemandeStatus.BROUILLON)
                .submittedAt(null)
                .paymentStatus(PaymentStatus.EN_ATTENTE)
                .build();

        demande = demandeRepository.save(demande);

        // Créer les produits si présents
        if (request.getProduits() != null && !request.getProduits().isEmpty()) {
            request.getProduits().forEach(produitDTO -> {
                Product product = Product.builder()
                        .hsCode(produitDTO.getHsCode())
                        .productCategory(produitDTO.getCategorie())
                        .productName(produitDTO.getNom())
                        .brandName(produitDTO.getMarque())
                        .exportateur(exportateur)
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

        // Notifier les agents de validation (à implémenter)
        // emailService.notifierNouvelleDemande(demande);

        return demande;
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private String generateReference() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uniqueId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return "DOS-" + dateStr + "-" + uniqueId;
    }

    /*private void updateExportateurInfo(ExportateurEtranger exportateur, CreerDossierRequest request) {
        if (request.getRaisonSociale() != null) {
            exportateur.setRaisonSociale(request.getRaisonSociale());
        }
        if (request.getAdresseLegale() != null) {
            exportateur.setAdresseLegale(request.getAdresseLegale());
        }
        if (request.getVille() != null) {
            exportateur.setVille(request.getVille());
        }
        if (request.getPaysOrigine() != null) {
            exportateur.setPaysOrigine(request.getPaysOrigine());
        }
        if (request.getTelephone() != null) {
            exportateur.setTelephone(request.getTelephone());
        }
        if (request.getSiteWeb() != null) {
            exportateur.setSiteWeb(request.getSiteWeb());
        }
        if (request.getRepresentantLegal() != null) {
            exportateur.setRepresentantLegal(request.getRepresentantLegal());
        }
        if (request.getNumeroRegistreCommerce() != null) {
            exportateur.setNumeroRegistreCommerce(request.getNumeroRegistreCommerce());
        }
        if (request.getNumeroTVA() != null) {
            exportateur.setNumeroTVA(request.getNumeroTVA());
        }
    }*/

    private DocumentDTO convertToDTO(Document document) {
        if (document == null) return null;

        return DocumentDTO.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .fileType(document.getFileType())
                .fileSize(document.getFileSize())
                .documentType(document.getDocumentType())
                .status(document.getStatus())
                .validationComment(document.getValidationComment())
                .uploadedAt(document.getUploadedAt())
                .downloadUrl("/api/exportateur/documents/" + document.getId() + "/telecharger")
                .build();
    }



}