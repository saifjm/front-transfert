package IbansysPoc.AVA.service.impl;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import IbansysPoc.AVA.DTO.BeneficiaireDTO;
import IbansysPoc.AVA.entity.Beneficiaire;
import IbansysPoc.AVA.entity.BeneficiaireId;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.OperationsDelegueesMvtId;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.mapper.BeneficiaireMapper;
import IbansysPoc.AVA.repository.BeneficiaireRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeMvtRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.service.ApiExterneService;
import IbansysPoc.AVA.service.BeneficiaireService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Implémentation du service pour la gestion des bénéficiaires.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BeneficiaireServiceImpl implements BeneficiaireService {

    private final BeneficiaireRepository beneficiaireRepository;
    private final OperationsDelegueeRepository operationsDelegueeRepository;
    private final OperationsDelegueeMvtRepository operationsMvtRepository;
    private final BeneficiaireMapper beneficiaireMapper;
    private final ApiExterneService apiExterneService;

    /** Constante pour le status finalisé du MVT (finalize=true). */
    public static final String STATUS_FINALIZED = "A";

    /** Constante pour le status en attente du MVT (finalize=false). */
    public static final String STATUS_PENDING = "X";

    /**
     * Crée ou met à jour un bénéficiaire pour une opération déléguée spécifique.
     * Délègue à la version avec finalizeFlag = true (comportement par défaut).
     */
    @Override
    public BeneficiaireDTO createOrUpdateBeneficiaire(BeneficiaireDTO dto) {
        return createOrUpdateBeneficiaire(dto, true);
    }

    /**
     * Crée ou met à jour un bénéficiaire avec option de finalisation.
     * 
     * Si finalizeFlag == true :
     *   1. Vérifie que l'opération déléguée existe
     *   2. Crée ou met à jour le bénéficiaire
     *   3. Crée un mouvement dans OPERATIONS_DELEGUEES_MVT avec status='A'
     * 
     * Si finalizeFlag == false :
     *   1. Vérifie que l'opération déléguée existe
     *   2. Crée uniquement un mouvement dans OPERATIONS_DELEGUEES_MVT (sans status)
     *   3. La table bénéficiaire n'est PAS affectée
     */
    @Override
    public BeneficiaireDTO createOrUpdateBeneficiaire(BeneficiaireDTO dto, boolean finalizeFlag) {
        log.info("Création ou mise à jour du bénéficiaire pour le dossier: {} (finalize={})", 
                 dto.getNumDossier(), finalizeFlag);

        // Validation minimale (numDossier toujours requis)
        if (dto.getNumDossier() == null) {
            throw new BusinessException("Le champ numDossier est obligatoire");
        }

        // 1. Vérifier que l'opération déléguée existe
        OperationsDeleguee operationsDeleguee = operationsDelegueeRepository
                .findById((dto.getNumDossier()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Opération déléguée non trouvée pour le numéro de dossier: " + dto.getNumDossier()));

        // ===== Contrôles de saisie (appliqués quel que soit finalize) =====
        validateInput(dto);

        if (finalizeFlag) {
            // ===================== FINALIZE == TRUE =====================

            // 2. Appliquer les valeurs par défaut
            if (dto.getCodeAgenceAva() == null) {
                dto.setCodeAgenceAva(1L);
                log.debug("Code agence AVA défini par défaut: 1");
            }

            // 3. Construire l'ID composite du bénéficiaire
            BeneficiaireId beneficiaireId = new BeneficiaireId();
            beneficiaireId.setNumDossier(dto.getNumDossier());
            beneficiaireId.setDateDossier(dto.getDateDossier());
            beneficiaireId.setTypePieceBenef(dto.getTypePieceBenef());
            beneficiaireId.setNoPieceBenef(dto.getNoPieceBenef());

            // 4. Chercher si le bénéficiaire existe déjà
            Optional<Beneficiaire> existingBeneficiaire = beneficiaireRepository.findById(beneficiaireId);

            Beneficiaire beneficiaire;
            boolean isUpdate = false;

            if (existingBeneficiaire.isPresent()) {
                // Mise à jour du bénéficiaire existant
                beneficiaire = existingBeneficiaire.get();
                log.info("Bénéficiaire trouvé, mise à jour des informations");
                
                // Mettre à jour les champs modifiables
                beneficiaire.setNomBenef(dto.getNomBenef());
                beneficiaire.setAdresseBenef(dto.getAdresseBenef());
                beneficiaire.setQualite(dto.getQualite());
                beneficiaire.setDatePiece(dto.getDatePiece());
                beneficiaire.setEtat(dto.getEtat());
                beneficiaire.setCodeTypeDos(dto.getCodeTypeDos());
                beneficiaire.setCodeAgenceAva(dto.getCodeAgenceAva());
                
                isUpdate = true;
            } else {
                // Création d'un nouveau bénéficiaire
                log.info("Bénéficiaire non trouvé, création d'un nouveau bénéficiaire");
                
                beneficiaire = beneficiaireMapper.toEntity(dto);
                beneficiaire.setId(beneficiaireId);
                
                // Définir la date de création (sysdate)
                beneficiaire.setDateCreation(LocalDate.now());
                beneficiaire.setDateSuppression(null);
                
                log.debug("Date de création définie: {}", beneficiaire.getDateCreation());
            }

            // 5. Sauvegarder le bénéficiaire
            Beneficiaire savedBeneficiaire = beneficiaireRepository.save(beneficiaire);
            log.info("Bénéficiaire {} avec succès. ID: {}", 
                     isUpdate ? "mis à jour" : "créé", savedBeneficiaire.getId());

            // 6. Créer un mouvement dans OPERATIONS_DELEGUEES_MVT avec status='A'
            createMovement(operationsDeleguee, STATUS_FINALIZED, dto);

            // 7. Retourner le DTO
            BeneficiaireDTO resultDTO = beneficiaireMapper.toDTO(savedBeneficiaire);
            return resultDTO;

        } else {
            // ===================== FINALIZE == FALSE =====================
            // Créer uniquement le MVT, sans toucher à la table bénéficiaire
            log.info("Mode non-finalisé : création du MVT uniquement pour le dossier: {}", dto.getNumDossier());

            createMovement(operationsDeleguee, STATUS_PENDING, dto);

            // Retourner un DTO minimal avec les infos du dossier (pas de bénéficiaire persisté)
            BeneficiaireDTO resultDTO = new BeneficiaireDTO();
            resultDTO.setNumDossier(dto.getNumDossier());
            resultDTO.setDateDossier(dto.getDateDossier() != null ? dto.getDateDossier() : operationsDeleguee.getDateDossier());
            return resultDTO;
        }
    }

    /**
     * Crée un mouvement dans OPERATIONS_DELEGUEES_MVT.
     * 
     * @param operationsDeleguee l'opération déléguée source
     * @param status le status à affecter au MVT (null = pas de status, "A" = finalisé)
     * @param dto le DTO du bénéficiaire contenant les données du JSON
     */
    private void createMovement(OperationsDeleguee operationsDeleguee, String status, BeneficiaireDTO dto) {
        log.debug("Création d'un mouvement pour le dossier: {} (status={})", 
                 operationsDeleguee.getNumDossier(), status);

        // Obtenir la prochaine référence d'opération depuis la séquence
        Long refOperation = operationsMvtRepository.getNextRefOperation();
        
        // Créer l'ID composite pour le mouvement
        OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
        mvtId.setRefOperation(refOperation);
        mvtId.setDateOperation(LocalDate.now());

        // Créer le mouvement
        OperationsDelegueesMvt mvt = new OperationsDelegueesMvt();
        mvt.setId(mvtId);
        
        // Copier les informations de l'opération déléguée
        mvt.setNumDossier(operationsDeleguee.getNumDossier());
        mvt.setDateDossier(dto.getDateDossier());
        mvt.setCodeTypeDosAva(operationsDeleguee.getCodeTypeDosAva());
        mvt.setCodeAgenceAva(operationsDeleguee.getCodeAgenceAva());
        mvt.setTypePieceClient(operationsDeleguee.getTypePieceClient().intValue());
        mvt.setNoPieceClient(operationsDeleguee.getNoPieceClient());
        mvt.setNumeroCompte(operationsDeleguee.getNumeroCompte());
        mvt.setTel(operationsDeleguee.getTel());
        mvt.setCodeActivite(operationsDeleguee.getCodeActivite());
        mvt.setCodeSousActivite(operationsDeleguee.getCodeSousActivite());
        mvt.setDeclarationFiscale(operationsDeleguee.getDeclarationFiscale());
        mvt.setDateUltDeclCaf(operationsDeleguee.getDateUltDeclCaf());
        mvt.setCodeBanqueProvenance(operationsDeleguee.getCodeBanqueProvenance());
        mvt.setMntAvance(operationsDeleguee.getMntAvance());
        mvt.setMntUtilise(operationsDeleguee.getMntUtilise());
        mvt.setMntAutorise(operationsDeleguee.getMntAutorise());
        mvt.setSolde(operationsDeleguee.getSolde());
        mvt.setMntCa(operationsDeleguee.getMntCa());
        mvt.setMntCaFiscal(operationsDeleguee.getMntCaFiscal());
        mvt.setMntImportation(operationsDeleguee.getMntImportation());
        mvt.setNumeroBct(operationsDeleguee.getNumeroBct());
        mvt.setDateBct(operationsDeleguee.getDateBct());
        mvt.setCodeProduitService((short) 1);  // Set to 1 as required (Short type)
        mvt.setCodeOperation(1);  // Set to 1 as required (Integer type)
        
        // Affecter le status si fourni ("A" pour finalize=true)
        if (status != null) {
            mvt.setStatus(status);
        }
        
        // Sauvegarder le mouvement
        operationsMvtRepository.save(mvt);
        log.info("Mouvement créé avec succès. RefOperation: {}, DateOperation: {}, Status: {}", 
                 refOperation, mvtId.getDateOperation(), status);
    }

    /**
     * Valide les données d'entrée du bénéficiaire.
     */
    private void validateInput(BeneficiaireDTO dto) {
        // Vérifier que tous les champs existent
        if (dto.getNumDossier() == null) {
            throw new BusinessException("Le champ numDossier est obligatoire");
        }
        if (dto.getDateDossier() == null) {
            throw new BusinessException("Le champ dateDossier est obligatoire");
        }
        if (dto.getTypePieceBenef() == null) {
            throw new BusinessException("Le champ typePieceBenef est obligatoire");
        }
        if (dto.getNoPieceBenef() == null || dto.getNoPieceBenef().trim().isEmpty()) {
            throw new BusinessException("Le champ noPieceBenef est obligatoire");
        }
        if (dto.getCodeTypeDos() == null) {
            throw new BusinessException("Le champ codeTypeDos est obligatoire");
        }
        if (dto.getNomBenef() == null || dto.getNomBenef().trim().isEmpty()) {
            throw new BusinessException("Le champ nomBenef est obligatoire");
        }
        if (dto.getAdresseBenef() == null || dto.getAdresseBenef().trim().isEmpty()) {
            throw new BusinessException("Le champ adresseBenef est obligatoire");
        }
        if (dto.getQualite() == null || dto.getQualite().trim().isEmpty()) {
            throw new BusinessException("Le champ qualite est obligatoire");
        }
        if (dto.getDatePiece() == null) {
            throw new BusinessException("Le champ datePiece est obligatoire");
        }
        if (dto.getEtat() == null || dto.getEtat().trim().isEmpty()) {
            throw new BusinessException("Le champ etat est obligatoire");
        }

        // Validation des valeurs spécifiques
        if (!List.of(1, 4, 7).contains(dto.getTypePieceBenef())) {
            throw new BusinessException("typePieceBenef doit être 1, 4 ou 7");
        }
        // Validation du format CIN : 7 chiffres suivis d'une lettre (ex: 1234567A)
        if (Integer.valueOf(1).equals(dto.getTypePieceBenef())) {
            String noPiece = dto.getNoPieceBenef().trim();
            if (!noPiece.matches("\\d{7}[A-Za-z]")) {
                throw new BusinessException("FORMAT_CIN_INVALIDE",
                        "Le format du CIN (noPieceBenef) est invalide : doit contenir exactement 7 chiffres suivis d'une lettre (ex: 1234567A)");
            }
        }
        if (!List.of("Dirigeant", "Conseil d'administration","Employé").contains(dto.getQualite())) {
            throw new BusinessException("qualite doit être 'Dirigeant', 'Conseil d'administration' ou 'Employé'");
        }
        if (!dto.getDatePiece().isBefore(LocalDate.now())) {
            throw new BusinessException("datePiece doit être avant aujourd'hui");
        }
        if (!List.of("AA", "A", "AD", "N").contains(dto.getEtat())) {
            throw new BusinessException("etat doit être 'AA', 'A', 'AD' ou 'N'");
        }

        // Vérification de l'existence du client dans la table Personne via l'API REF
        boolean existe = apiExterneService.existsPersonneByNoPiece(dto.getNoPieceBenef().trim());
        if (!existe) {
            throw new BusinessException("CLIENT_NON_TROUVE",
                    "Le client n'est pas trouvé dans la table Personne (noPieceBenef=" + dto.getNoPieceBenef().trim() + ")");
        }
    }

    @Override
    public List<BeneficiaireDTO> getBeneficiairesByNumDossier(Integer numDossier) {
        List<Beneficiaire> beneficiaires = beneficiaireRepository.findByIdNumDossier(numDossier);
        return beneficiaires.stream()
            .map(beneficiaireMapper::toDTO)
            .toList();
    }
}