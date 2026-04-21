package com.tunisia.commerce.service.impl;

import com.tunisia.commerce.dto.structure.CreateStructureRequestDTO;
import com.tunisia.commerce.dto.structure.StructureInterneDTO;
import com.tunisia.commerce.dto.structure.UpdateStructureRequestDTO;
import com.tunisia.commerce.dto.user.UserDTO;
import com.tunisia.commerce.entity.Administrateur;
import com.tunisia.commerce.entity.StructureInterne;
import com.tunisia.commerce.enums.StructureType;
import com.tunisia.commerce.enums.UserRole;
import com.tunisia.commerce.enums.UserStatus;
import com.tunisia.commerce.repository.AdministrateurRepository;
import com.tunisia.commerce.repository.StructureInterneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StructureInterneServiceImpl {

    private final StructureInterneRepository structureRepository;
    private final AdministrateurRepository administrateurRepository;

    /**
     * Créer une nouvelle structure interne
     */
    @Transactional
    public StructureInterneDTO createStructure(CreateStructureRequestDTO request, Long adminId) {
        log.info("Création d'une nouvelle structure: {}", request.getOfficialName());

        // Vérifier si une structure avec le même nom existe déjà
        if (structureRepository.existsByOfficialName(request.getOfficialName())) {
            throw new RuntimeException("Une structure avec ce nom existe déjà");
        }

        // Récupérer l'administrateur
        Administrateur admin = administrateurRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé"));

        // Générer le code automatiquement
        String code = generateCode(request.getType(), request.getOfficialName());

        // Vérifier l'unicité du code
        int counter = 1;
        while (structureRepository.existsByCode(code)) {
            code = generateCode(request.getType(), request.getOfficialName()) + "_" + counter;
            counter++;
        }

        // Créer la structure
        StructureInterne structure = StructureInterne.builder()
                .type(request.getType())
                .officialName(request.getOfficialName())
                .code(code)
                .isActive(true)
                .createdBy(admin)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        structure = structureRepository.save(structure);
        log.info("Structure créée avec succès - ID: {}, Code: {}", structure.getId(), structure.getCode());

        return mapToDTO(structure);
    }

    /**
     * Mettre à jour une structure interne
     */
    @Transactional
    public StructureInterneDTO updateStructure(Long id, UpdateStructureRequestDTO request, Long adminId) {
        log.info("Mise à jour de la structure ID: {}", id);

        StructureInterne structure = structureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + id));

        // Récupérer l'administrateur (optionnel, juste pour vérifier qu'il existe)
        administrateurRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé"));

        // Vérifier si le nouveau nom n'est pas déjà utilisé par une autre structure
        if (!structure.getOfficialName().equals(request.getOfficialName()) &&
                structureRepository.existsByOfficialName(request.getOfficialName())) {
            throw new RuntimeException("Une autre structure avec ce nom existe déjà");
        }

        // Mettre à jour les champs
        structure.setType(request.getType());
        structure.setOfficialName(request.getOfficialName());

        if (request.getIsActive() != null) {
            structure.setIsActive(request.getIsActive());
        }

        structure.setUpdatedAt(LocalDateTime.now());

        structure = structureRepository.save(structure);
        log.info("Structure ID: {} mise à jour avec succès", id);

        return mapToDTO(structure);
    }

    /**
     * Supprimer une structure interne (suppression physique)
     */
    @Transactional
    public void deleteStructureHard(Long id, Long adminId) {
        log.info("Suppression physique de la structure ID: {}", id);

        StructureInterne structure = structureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + id));

        // Vérifier si l'admin existe
        administrateurRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé"));

        structureRepository.delete(structure);
        log.info("Structure ID: {} supprimée définitivement", id);
    }

    /**
     * Désactiver une structure interne (suppression logique)
     */
    @Transactional
    public StructureInterneDTO deactivateStructure(Long id, Long adminId) {
        log.info("Désactivation de la structure ID: {}", id);

        StructureInterne structure = structureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + id));

        // Vérifier si l'admin existe
        administrateurRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé"));

        structure.setIsActive(false);
        structure.setUpdatedAt(LocalDateTime.now());

        structure = structureRepository.save(structure);
        log.info("Structure ID: {} désactivée", id);

        return mapToDTO(structure);
    }

    /**
     * Réactiver une structure interne
     */
    @Transactional
    public StructureInterneDTO reactivateStructure(Long id, Long adminId) {
        log.info("Réactivation de la structure ID: {}", id);

        StructureInterne structure = structureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + id));

        // Vérifier si l'admin existe
        administrateurRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Administrateur non trouvé"));

        structure.setIsActive(true);
        structure.setUpdatedAt(LocalDateTime.now());

        structure = structureRepository.save(structure);
        log.info("Structure ID: {} réactivée", id);

        return mapToDTO(structure);
    }

    /**
     * Récupérer toutes les structures internes
     */
    public List<StructureInterneDTO> getAllStructures() {
        log.info("Récupération de toutes les structures");
        return structureRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Récupérer toutes les structures actives
     */
    public List<StructureInterneDTO> getAllActiveStructures() {
        log.info("Récupération des structures actives");
        return structureRepository.findByIsActiveTrue().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Récupérer une structure par son ID
     */
    public StructureInterneDTO getStructureById(Long id) {
        log.info("Récupération de la structure ID: {}", id);
        StructureInterne structure = structureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Structure non trouvée avec l'ID: " + id));
        return mapToDTO(structure);
    }

    /**
     * Récupérer les structures par type
     */
    public List<StructureInterneDTO> getStructuresByType(StructureType type) {
        log.info("Récupération des structures de type: {}", type);
        return structureRepository.findByType(type).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Générer un code unique pour la structure
     */
    private String generateCode(StructureType type, String officialName) {
        String typePrefix;
        switch (type) {
            case MINISTRY:
                typePrefix = "MIN";
                break;
            case BANK:
                typePrefix = "BNK";
                break;
            case CUSTOMS:
                typePrefix = "CUS";
                break;
            default:
                typePrefix = "STR";
        }

        // Prendre les premières lettres de chaque mot du nom
        StringBuilder namePartBuilder = new StringBuilder();
        String[] words = officialName.toUpperCase().replaceAll("[^A-Z\\s]", "").split("\\s+");

        for (String word : words) {
            if (!word.isEmpty()) {
                namePartBuilder.append(word.charAt(0));
            }
        }

        String namePart = namePartBuilder.toString();
        if (namePart.length() > 6) {
            namePart = namePart.substring(0, 6);
        }

        // Ajouter un nombre aléatoire
        String randomPart = String.valueOf((int) (Math.random() * 9000) + 1000);

        return String.format("%s_%s_%s", typePrefix, namePart, randomPart);
    }

    /**
     * Mapper Entity vers DTO
     */
    /**
     * Mapper Entity vers DTO
     */
    private StructureInterneDTO mapToDTO(StructureInterne structure) {
        UserDTO createdByUser = null;
        if (structure.getCreatedBy() != null) {
            createdByUser = new UserDTO();
            createdByUser.setId(structure.getCreatedBy().getId());
            createdByUser.setNom(structure.getCreatedBy().getNom());
            createdByUser.setPrenom(structure.getCreatedBy().getPrenom());
            createdByUser.setEmail(structure.getCreatedBy().getEmail());
            createdByUser.setRole(UserRole.ADMIN);
            createdByUser.setStatut(UserStatus.ACTIF);
        }

        return StructureInterneDTO.builder()
                .id(structure.getId())
                .type(structure.getType())
                .officialName(structure.getOfficialName())
                .code(structure.getCode())
                .isActive(structure.getIsActive())
                .createdAt(structure.getCreatedAt())
                .updatedAt(structure.getUpdatedAt())
                .createdBy(createdByUser)  // Maintenant c'est un UserDTO
                .build();
    }
}