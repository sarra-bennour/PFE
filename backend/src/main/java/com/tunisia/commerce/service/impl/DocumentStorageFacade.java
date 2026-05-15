package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.config.StorageConfig;
import com.tunisia.commerce.enums.DocumentType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentStorageFacade {

    private final SecureStorageService secureStorageService;
    private final StorageConfig storageConfig;

    // Pour les documents d'agrément (Register)
    public SecureStorageService.StorageResult storeRegisterDocument(
            MultipartFile file,
            Long demandeId,
            DocumentType documentType) throws Exception {

        return secureStorageService.storeDocument(
                file,
                StorageConfig.DocumentCategory.REGISTRATION,
                demandeId,
                null,
                documentType
        );
    }

    // Pour les documents de déclaration de produits (Product Declaration)
    public SecureStorageService.StorageResult storeProductDeclarationDocument(
            MultipartFile file,
            Long demandeId,
            Long productId,
            DocumentType documentType) throws Exception {

        return secureStorageService.storeDocument(
                file,
                StorageConfig.DocumentCategory.PRODUCT_DECLARATION,
                demandeId,
                productId,
                documentType
        );
    }

    // Pour l'image d'un produit
    public SecureStorageService.StorageResult storeProductImage(
            MultipartFile file,
            Long demandeId,
            Long productId) throws Exception {

        // Utiliser la méthode spécialisée pour les images produits
        return secureStorageService.storeProductImage(
                file,
                StorageConfig.DocumentCategory.PRODUCT_DECLARATION,
                demandeId,
                productId
        );
    }

    // Pour les documents d'importation (Import)
    public SecureStorageService.StorageResult storeImportDocument(
            MultipartFile file,
            Long demandeId,
            DocumentType documentType) throws Exception {

        return secureStorageService.storeDocument(
                file,
                StorageConfig.DocumentCategory.IMPORT,
                demandeId,
                null,
                documentType
        );
    }
}