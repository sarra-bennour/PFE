package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.admin.AdminDemandeDTO;
import com.tunisia.commerce.dto.admin.DocumentAdminDTO;
import com.tunisia.commerce.dto.admin.ProductAdminDTO;
import com.tunisia.commerce.entity.*;
import com.tunisia.commerce.enums.TypeDemande;
import com.tunisia.commerce.enums.TypeDemandeur;
import com.tunisia.commerce.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdminServiceImpl {

    private final DemandeEnregistrementRepository demandeEnregistrementRepository;
    private final DemandeImportateurRepository demandeImportateurRepository;
    private final DemandeProduitRepository demandeProduitRepository;
    private final DocumentRepository documentRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_ONLY_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public List<AdminDemandeDTO> getAllActiveDemandes() {
        log.info("Récupération des demandes actives (non archivées)");
        List<DemandeEnregistrement> activeDemandes = demandeEnregistrementRepository.findByArchivedFalse();

        return activeDemandes.stream()
                .map(this::convertToAdminDTO)
                .sorted((d1, d2) -> {
                    if (d1.getSubmittedAt() == null) return 1;
                    if (d2.getSubmittedAt() == null) return -1;
                    return d2.getSubmittedAt().compareTo(d1.getSubmittedAt());
                })
                .collect(Collectors.toList());
    }

    // Méthode pour récupérer uniquement les demandes ARCHIVÉES
    public List<AdminDemandeDTO> getAllArchivedDemandes() {
        log.info("Récupération des demandes archivées");
        List<DemandeEnregistrement> archivedDemandes = demandeEnregistrementRepository.findByArchivedTrue();

        return archivedDemandes.stream()
                .map(this::convertToAdminDTO)
                .sorted((d1, d2) -> {
                    if (d1.getArchivedAt() == null) return 1;
                    if (d2.getArchivedAt() == null) return -1;
                    return d2.getArchivedAt().compareTo(d1.getArchivedAt());
                })
                .collect(Collectors.toList());
    }

    public AdminDemandeDTO getDemandeById(Long id) {
        log.info("Récupération de la demande ID: {}", id);
        DemandeEnregistrement demande = demandeEnregistrementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec l'ID: " + id));
        return convertToAdminDTO(demande);
    }

    private AdminDemandeDTO convertToAdminDTO(DemandeEnregistrement demande) {
        AdminDemandeDTO dto = new AdminDemandeDTO();

        // Informations de base
        dto.setId(demande.getId());
        dto.setReference(demande.getReference());
        dto.setTypeDemande(demande.getTypeDemande());  // TypeDemande directement
        dto.setStatus(demande.getStatus());
        dto.setSubmittedAt(demande.getSubmittedAt());

        // Informations de paiement
        dto.setPaymentReference(demande.getPaymentReference());
        dto.setPaymentAmount(demande.getPaymentAmount());
        dto.setPaymentStatus(demande.getPaymentStatus());

        // Assignation
        if (demande.getAssignedTo() != null) {
            dto.setAssignedToId(demande.getAssignedTo().getId());
            dto.setAssignedToName(demande.getAssignedTo().getNom() + " " + demande.getAssignedTo().getPrenom());
        }

        // Décision
        dto.setDecisionDate(demande.getDecisionDate());
        dto.setDecisionComment(demande.getDecisionComment());
        dto.setNumeroAgrement(demande.getNumeroAgrement());
        dto.setDateAgrement(demande.getDateAgrement());

        // Déterminer le type de demandeur (IMPORTATEUR/EXPORTATEUR) basé sur la présence d'importateur ou d'exportateur
        if (demande.getImportateur() != null) {
            dto.setApplicantType(TypeDemandeur.IMPORTATEUR);
            dto.setApplicantId(demande.getImportateur().getId());
            dto.setApplicantName(demande.getImportateur().getRaisonSociale());
            dto.setApplicantEmail(demande.getImportateur().getEmail());
        } else if (demande.getExportateur() != null) {
            dto.setApplicantType(TypeDemandeur.EXPORTATEUR);
            dto.setApplicantName(demande.getExportateur().getNom());
            dto.setApplicantEmail(demande.getExportateur().getEmail());
            dto.setExportateurEtrangerId(demande.getExportateur().getId());
            dto.setExportateurEtrangerNom(demande.getExportateur().getNom());
            dto.setExportateurEtrangerPays(demande.getExportateur().getPaysOrigine());
        }

        // Récupérer les documents
        List<Document> documents = documentRepository.findByDemandeId(demande.getId());
        dto.setDocuments(convertDocumentsToAdminDTO(documents));

        // Récupérer les produits pour les demandes non-import
        if (demande.getTypeDemande() != TypeDemande.IMPORT) {
            dto.setProducts(getProductsForDemande(demande.getId()));
        }

        // Récupérer les détails d'importation
        if (demande instanceof DemandeImportateur) {
            dto.setImportDetails(getImportDetails((DemandeImportateur) demande));
        }

        return dto;
    }

    private List<ProductAdminDTO> getProductsForDemande(Long demandeId) {
        List<DemandeProduit> demandeProduits = demandeProduitRepository.findByDemandeId(demandeId);

        if (demandeProduits == null || demandeProduits.isEmpty()) {
            return new ArrayList<>();
        }

        return demandeProduits.stream()
                .map(dp -> {
                    Product product = dp.getProduit();
                    if (product == null) return null;

                    ProductAdminDTO productDTO = new ProductAdminDTO();
                    productDTO.setId(product.getId());
                    productDTO.setProductName(product.getProductName());
                    productDTO.setProductType(product.getProductType());
                    productDTO.setCategory(product.getCategory());
                    productDTO.setHsCode(product.getHsCode());
                    productDTO.setIsLinkedToBrand(product.getIsLinkedToBrand());
                    productDTO.setBrandName(product.getBrandName());
                    productDTO.setIsBrandOwner(product.getIsBrandOwner());
                    productDTO.setHasBrandLicense(product.getHasBrandLicense());
                    productDTO.setProductState(product.getProductState());
                    productDTO.setOriginCountry(product.getOriginCountry());
                    productDTO.setAnnualQuantityValue(product.getAnnualQuantityValue());
                    productDTO.setAnnualQuantityUnit(product.getAnnualQuantityUnit());
                    productDTO.setCommercialBrandName(product.getCommercialBrandName());
                    productDTO.setProductImage(product.getProductImage());
                    return productDTO;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private AdminDemandeDTO.ImportDetailsDTO getImportDetails(DemandeImportateur demandeImport) {
        AdminDemandeDTO.ImportDetailsDTO details = new AdminDemandeDTO.ImportDetailsDTO();
        details.setInvoiceNumber(demandeImport.getInvoiceNumber());
        details.setInvoiceDate(demandeImport.getInvoiceDate());
        details.setAmount(demandeImport.getAmount());
        details.setCurrency(demandeImport.getCurrency());
        details.setIncoterm(demandeImport.getIncoterm());
        details.setTransportMode(demandeImport.getTransportMode());
        details.setLoadingPort(demandeImport.getLoadingPort());
        details.setDischargePort(demandeImport.getDischargePort());
        details.setArrivalDate(demandeImport.getArrivalDate());
        return details;
    }

    private List<DocumentAdminDTO> convertDocumentsToAdminDTO(List<Document> documents) {
        if (documents == null || documents.isEmpty()) {
            return new ArrayList<>();
        }

        return documents.stream()
                .map(doc -> {
                    DocumentAdminDTO dto = new DocumentAdminDTO();
                    dto.setId(doc.getId());
                    dto.setName(doc.getDocumentType() != null ? doc.getDocumentType().toString() : "Document");
                    dto.setFileName(doc.getFileName());
                    dto.setFileType(doc.getFileType());
                    dto.setFileSize(doc.getFileSize());
                    dto.setFilePath(doc.getFilePath());
                    dto.setDocumentType(doc.getDocumentType());
                    dto.setStatus(doc.getStatus());
                    dto.setUploadedAt(doc.getUploadedAt());
                    dto.setValidatedAt(doc.getValidatedAt());
                    dto.setValidationComment(doc.getValidationComment());
                    if (doc.getValidatedBy() != null) {
                        dto.setValidatedByName(doc.getValidatedBy().getNom() + " " + doc.getValidatedBy().getPrenom());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public byte[] getDocumentContent(Document document) throws IOException {
        Path filePath = Paths.get(document.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("Fichier non trouvé: " + document.getFilePath());
        }

        return resource.getContentAsByteArray();
    }

    public Map<String, Object> getDemandesStatistics() {
        List<DemandeEnregistrement> allDemandes = demandeEnregistrementRepository.findAll();

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", allDemandes.size());

        stats.put("byStatus", allDemandes.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getStatus() != null ? d.getStatus().name() : "UNKNOWN",
                        Collectors.counting()
                )));

        stats.put("byType", allDemandes.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getTypeDemande() != null ? d.getTypeDemande().name() : "UNKNOWN",
                        Collectors.counting()
                )));

        stats.put("byPaymentStatus", allDemandes.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getPaymentStatus() != null ? d.getPaymentStatus().name() : "UNKNOWN",
                        Collectors.counting()
                )));

        return stats;
    }
}