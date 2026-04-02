package IbansysPoc.AVA.service.impl;

import IbansysPoc.AVA.DTO.AutorisationBctDTO;
import IbansysPoc.AVA.DTO.AvaMarcheMvtDTO;
import IbansysPoc.AVA.DTO.BeneficiaireMvtDTO;
import IbansysPoc.AVA.DTO.DocumentDTO;
import IbansysPoc.AVA.DTO.ExportateurDTO;
import IbansysPoc.AVA.DTO.InitiationOuvertureDTO;
import IbansysPoc.AVA.DTO.LeveeSuspensionDTO;
import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.DTO.SuspensionDTO;
import IbansysPoc.AVA.entity.*;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.mapper.AvaMarcheMvtMapper;
import IbansysPoc.AVA.mapper.BeneficiaireMvtMapper;
import IbansysPoc.AVA.mapper.DocumentMapper;
import IbansysPoc.AVA.mapper.OperationsDelegueeMvtMapper;
import IbansysPoc.AVA.repository.*;
import IbansysPoc.AVA.service.BusinessRulesService;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import IbansysPoc.AVA.service.OperationsDelegueesMvtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import IbansysPoc.AVA.mapper.ExportateurMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Supplier;
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OperationsDelegueesMvtServiceImpl implements OperationsDelegueesMvtService {

    private static final short TYPE_DOSSIER_1 = 1;
    private static final short TYPE_DOSSIER_2 = 2;
    private static final short TYPE_DOSSIER_3 = 3;
    private static final short TYPE_DOSSIER_4 = 4;
    private static final short TYPE_DOSSIER_5 = 5;


    // Defaults for PRODUIT_SERVICE/CODE_OPERATION
    private static final short DEFAULT_CODE_PRODUIT_SERVICE = 108;
    private static final int DEFAULT_CODE_OPERATION = 200;

    private final OperationsDelegueeMvtRepository operationsDelegueeMvtRepository;
    private final BeneficiaireMvtRepository beneficiaireMvtRepository;
    private final DocumentRepository documentRepository;
    private final AvaMarcheMvtRepository avaMarcheMvtRepository;

    private final OperationsDelegueeMvtMapper operationsDelegueeMvtMapper;
    private final BeneficiaireMvtMapper beneficiaireMvtMapper;
    private final DocumentMapper documentMapper;
    private final AvaMarcheMvtMapper avaMarcheMvtMapper;
    private final ExportateurMapper exportateurMapper;
    private final TypeDossierAvaRepository typeDossierAvaRepository;
    private final BusinessRulesService businessRulesService;
    private final OperationsDelegueeService operationsDelegueeService;

    // ========================= CREATE + FINALIZE =========================

    @Override
    public InitiationOuvertureDTO initialisationOuverture(InitiationOuvertureDTO dto) {
        // Backward compat : délègue à create sans finalize
        OperationCreationResponseDTO resp = create(dto, false);
        // Recharger et retourner le DTO complet comme avant
        return findByIdWithRelations(resp.getRefOperation(),
                dto.getDateOperation() != null ? dto.getDateOperation() : LocalDate.now())
                .orElseThrow(() -> new BusinessException("MVT_INTROUVABLE",
                        "Mouvement introuvable après création refOperation=" + resp.getRefOperation()));
    }
 @Override
    public ExportateurDTO createMvtForRapatriementExportateur(ExportateurDTO dto) {
        log.info("Création MVT exportateur pour rapatriement - refOperation: {}, dateOperation: {}, numDossier: {}", 
                 dto.getRefOperation(), dto.getDateOperation(), dto.getNumDossier());

        // Validation : vérifier que refOperation et dateOperation sont définis
        if (dto.getRefOperation() == null || dto.getDateOperation() == null) {
            throw new BusinessException("INVALID_MVT_DATA", "refOperation et dateOperation doivent être définis pour le MVT");
        }

        // Validation : vérifier que numDossier correspond à une OperationsDeleguee existante
        if (dto.getNumDossier() == null) {
            throw new BusinessException("INVALID_NUM_DOSSIER", "numDossier ne peut pas être null");
        }

        // Contrôle d'idempotence : vérifier si le MVT existe déjà
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(dto.getRefOperation());
        id.setDateOperation(dto.getDateOperation());
        
        if (operationsDelegueeMvtRepository.existsById(id)) {
            log.warn("MVT déjà existant pour rapatriement - refOperation: {}, dateOperation: {} - Retour de l'existant", 
                     dto.getRefOperation(), dto.getDateOperation());
            Optional<OperationsDelegueesMvt> existing = operationsDelegueeMvtRepository.findById(id);
            if (existing.isPresent()) {
                return exportateurMapper.toDTO(existing.get());
            }
        }

        log.info("Contrôles passés - Création du MVT exportateur pour rapatriement");

        // Map DTO -> entity
        OperationsDelegueesMvt operationsDelegueesMvt = exportateurMapper.toEntity(dto);

        // Safety: si MapStruct n'a pas copié numeroCompte, forcer la copie
        if ((operationsDelegueesMvt.getNumeroCompte() == null || operationsDelegueesMvt.getNumeroCompte().isBlank())
                && dto.getNumeroCompte() != null && !dto.getNumeroCompte().isBlank()) {
            operationsDelegueesMvt.setNumeroCompte(dto.getNumeroCompte());
        }

        OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
        mvtId.setDateOperation(dto.getDateOperation());
        mvtId.setRefOperation(dto.getRefOperation());
        operationsDelegueesMvt.setId(mvtId);

        // Sauvegarder
        OperationsDelegueesMvt savedOperationsDelegueesMvt = operationsDelegueeMvtRepository.save(operationsDelegueesMvt);

        log.info("MVT exportateur créé avec succès - refOperation: {}, dateOperation: {}", 
                 savedOperationsDelegueesMvt.getId().getRefOperation(), savedOperationsDelegueesMvt.getId().getDateOperation());

        return exportateurMapper.toDTO(savedOperationsDelegueesMvt);
    }
    @Override
    @Transactional
    public OperationCreationResponseDTO create(InitiationOuvertureDTO dto, boolean finalize) {

        final LocalDate now = LocalDate.now();

        // ── Phase 1 : Création MVT (status=I) ── logique existante réutilisée telle quelle
        applyDefaultFieldsForCreate(dto, now);

        List<String> alertes = runValidations(dto);
        log.info("Tous les contrôles passés avec succès. Alertes: {}", alertes);

        validateAvaMarcheByType(dto);
        computeAndSetEcheanceBeforeSavingMain(dto, now);

        calculateAndSetSolde(dto);

        // 1) Save principal (status=I)
        OperationsDelegueesMvt savedMain = saveMain(dto);

        // 2) Save relations
        List<BeneficiairesMvt> savedBenefs = saveBeneficiaires(dto, savedMain, now);
        List<Document> savedDocs = saveDocuments(dto, savedMain, now);

        // 3) Save marche
        AvaMarcheMvt savedMarche = saveAvaMarcheAfterMainSaved(dto, savedMain);

        Long refOp = savedMain.getId().getRefOperation();
        Integer numDossier = savedMain.getNumDossier();

        if (!finalize) {
            // Pas de finalize → retourne en status I
            log.info("create(finalize=false) terminé. MVT refOperation={} en status I", refOp);
            return new OperationCreationResponseDTO(refOp, numDossier, "I", "Mouvement créé avec succées");        }

        // ── Phase 2 : Finalize → délègue à writeDossier ──
        log.info("create(finalize=true) — début finalize pour refOperation={}", refOp);
        OperationCreationResponseDTO resp = writeDossier(savedMain);

        // Enrichir le message avec les alertes éventuelles
        if (!alertes.isEmpty() && resp.getMessage() != null) {
            resp.setMessage(resp.getMessage() + ". Alertes: " + String.join("; ", alertes));
        }
        return resp;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InitiationOuvertureDTO> findAll() {
        List<OperationsDelegueesMvt> entities = operationsDelegueeMvtRepository.findAll();
        return operationsDelegueeMvtMapper.toDTOList(entities);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InitiationOuvertureDTO> findById(OperationsDelegueesMvtId id) {
        return operationsDelegueeMvtRepository.findById(id).map(operationsDelegueeMvtMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InitiationOuvertureDTO> findByRefOperationAndDateOperation(Long refOperation, LocalDate dateOperation) {
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(dateOperation);
        return findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InitiationOuvertureDTO> findByIdWithRelations(Long refOperation, LocalDate dateOperation) {

        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(dateOperation);

        Optional<OperationsDelegueesMvt> opt = operationsDelegueeMvtRepository.findById(id);
        if (opt.isEmpty()) return Optional.empty();

        OperationsDelegueesMvt main = opt.get();
        InitiationOuvertureDTO dto = operationsDelegueeMvtMapper.toDTO(main);

        List<BeneficiairesMvt> benefs = beneficiaireMvtRepository.findByIdRefOperation(refOperation);
        dto.setBeneficiairesMvtListe(beneficiaireMvtMapper.toDTOList(benefs));

        List<Document> docs = documentRepository.findByRefOperation(refOperation);
        dto.setDocuments(documentMapper.toDTOList(docs));

        List<AvaMarcheMvt> marcheList = avaMarcheMvtRepository.findByIdRefOperation(refOperation.intValue());
        dto.setAvaMarcheMvt(marcheList != null && !marcheList.isEmpty()
                ? avaMarcheMvtMapper.toDTO(marcheList.get(0))
                : null);

        return Optional.of(dto);
    }


    @Override
    @Transactional(readOnly = true)
    public List<InitiationOuvertureDTO> findByRefOperation(Long refOperation) {
        List<OperationsDelegueesMvt> entities = operationsDelegueeMvtRepository.findByIdRefOperation(refOperation);
        return operationsDelegueeMvtMapper.toDTOList(entities);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InitiationOuvertureDTO> findByCodeAgenceAva(Short codeAgenceAva) {
        List<OperationsDelegueesMvt> entities = operationsDelegueeMvtRepository.findByCodeAgenceAva(codeAgenceAva);
        return operationsDelegueeMvtMapper.toDTOList(entities);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InitiationOuvertureDTO> findByStatus(String status) {
        List<OperationsDelegueesMvt> entities = operationsDelegueeMvtRepository.findByStatus(status);
        return operationsDelegueeMvtMapper.toDTOList(entities);
    }

    // ========================= UPDATE (recalcule echeance + persist) =========================

    @Override
    public InitiationOuvertureDTO updateoperation(Long refOperation, InitiationOuvertureDTO dto) {

        List<OperationsDelegueesMvt> results = operationsDelegueeMvtRepository.findByIdRefOperation(refOperation);
        if (results.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Mouvement opération déléguée non trouvé avec refOperation: " + refOperation);
        }
        OperationsDelegueesMvt existing = results.get(0);

        final LocalDate now = LocalDate.now();

        applyDefaultProductAndOperationIfMissing(dto);

        List<String> alertes = runValidations(dto, true);
                log.info("Tous les contrôles de mise à jour passés avec succès. Alertes: {}", alertes);

        validateAvaMarcheByType(dto);

        // Recalcul echeance AVANT de mapper/update
        computeAndSetEcheanceBeforeSavingMain(dto, now);

        // ✅ Calcul du solde si les attributs sont renseignés
        calculateAndSetSolde(dto);

        // 1) Update principal
        // Normaliser les montants avant mise à jour
        normalizeAmountsToZero(dto);
        operationsDelegueeMvtMapper.updateEntityFromDTO(dto, existing);
        OperationsDelegueesMvt savedMain = operationsDelegueeMvtRepository.save(existing);

        // 2) Replace relations
        List<BeneficiairesMvt> savedBenefs = replaceBeneficiaires(dto, savedMain, refOperation, now);
        List<Document> savedDocs = replaceDocuments(dto, savedMain, refOperation, now);

        // 3) Upsert marche (charge existant si présent → update, sinon → insert)
                AvaMarcheMvt savedMarche = saveAvaMarcheAfterMainSaved(dto, savedMain);

        return buildResult(savedMain, savedBenefs, savedDocs, savedMarche);
    }

    // ========================= FIND BY NUM_DOSSIER + FINALIZE =========================

    @Override
    @Transactional
    public OperationCreationResponseDTO findByNumDossierAndFinalize(Integer numDossier, boolean finalize) {

        log.info("findByNumDossierAndFinalize numDossier={}, finalize={}", numDossier, finalize);

        final Short CODE_PRODUIT_SERVICE = DEFAULT_CODE_PRODUIT_SERVICE;
        final Integer CODE_OPERATION = DEFAULT_CODE_OPERATION;

        // Récupérer le MVT par numDossier
        OperationsDelegueesMvt mvt = operationsDelegueeMvtRepository
                .findByCodeProduitServiceAndCodeOperationInAndNumDossier(
                        CODE_PRODUIT_SERVICE,
                        java.util.List.of(CODE_OPERATION),
                        numDossier
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Aucun mouvement MVT trouvé pour numDossier=" + numDossier));

        Long refOp = mvt.getId().getRefOperation();

        if (!finalize) {
            // Pas de finalize → retourner le MVT tel quel
            return new OperationCreationResponseDTO(refOp, numDossier, mvt.getStatus(), null);
        }

        // Finalize → écrire le dossier
        return writeDossier(mvt);
    }

    // ========================= UPDATE + FINALIZE =========================

    @Override
    @Transactional
    public OperationCreationResponseDTO updateOperationWithFinalize(Long refOperation, InitiationOuvertureDTO dto, boolean finalize) {

        log.info("updateOperationWithFinalize refOp={}, dateOp={}, finalize={}", refOperation, finalize);

        // 1) Effectuer l'update existant
        InitiationOuvertureDTO updatedDto = updateoperation(refOperation, dto);

        Integer numDossier = updatedDto.getNumDossier();
        Long refOp = updatedDto.getRefOperation();

        if (!finalize) {
            // Pas de finalize → retourner le MVT mis à jour
            return new OperationCreationResponseDTO(refOp, numDossier, "I", null);
        }

        // Recharger l'entité pour finalize
        List<OperationsDelegueesMvt> mvtResults = operationsDelegueeMvtRepository.findByIdRefOperation(refOp);
        if (mvtResults.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Mouvement introuvable après update refOperation=" + refOp);
        }
        OperationsDelegueesMvt mvt = mvtResults.get(0);


        // Finalize → écrire le dossier
        return writeDossier(mvt);
    }
 // ========================= UPDATE MVT FROM CREATE (Create or Update pattern) =========================

    /**
     * Met à jour un MVT existant quand refOperation est fourni dans create().
     * - Vérifie que le MVT existe → sinon 404
     * - Vérifie que le MVT est en status I → sinon BusinessException
     * - Exécute les mêmes validations que create
     * - Incrémente NumMvtAva
     * - Si finalize → writeDossier
     */
    private OperationCreationResponseDTO updateMvtFromCreate(InitiationOuvertureDTO dto, boolean finalize) {
        Long refOp = dto.getRefOperation();

        // 1) Charger le MVT existant par refOperation (404 si introuvable)
        //    On utilise findByIdRefOperation car l'EmbeddedId est (refOperation + dateOperation)
        //    et le client ne fournit que refOperation dans le JSON.
        List<OperationsDelegueesMvt> results = operationsDelegueeMvtRepository.findByIdRefOperation(refOp);
        if (results.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Mouvement opération déléguée non trouvé avec refOperation: " + refOp);
        }
        OperationsDelegueesMvt existing = results.get(0);

        // 2) Seul un MVT en status I peut être modifié
        assertUpdatable(existing);

        final LocalDate now = LocalDate.now();

        // 3) Validations métier (identiques au create, SAUF compatibilité type dossier)
        applyDefaultProductAndOperationIfMissing(dto);

        List<String> alertes = runValidations(dto, true);
        log.info("Tous les contrôles de mise à jour passés avec succès. Alertes: {}", alertes);

        validateAvaMarcheByType(dto);
        computeAndSetEcheanceBeforeSavingMain(dto, now);
        calculateAndSetSolde(dto);

        // 4) Mapper les champs du DTO vers l'entité existante
        normalizeAmountsToZero(dto);
        operationsDelegueeMvtMapper.updateEntityFromDTO(dto, existing);

        // 5) Incrémenter NumMvtAva à chaque update
        int currentNumMvt = existing.getNumMvtAva() != null ? existing.getNumMvtAva() : 1;
        existing.setNumMvtAva(currentNumMvt + 1);

        // 6) Sauvegarder principal
        OperationsDelegueesMvt savedMain = operationsDelegueeMvtRepository.save(existing);

        // 7) Replace relations (delete anciens + insert nouveaux)
        List<BeneficiairesMvt> savedBenefs = replaceBeneficiaires(dto, savedMain, refOp, now);
        List<Document> savedDocs = replaceDocuments(dto, savedMain, refOp, now);

        // Upsert AvaMarcheMvt (charge existant si présent → update, sinon → insert)
        AvaMarcheMvt savedMarche = saveAvaMarcheAfterMainSaved(dto, savedMain);

        Integer numDossier = savedMain.getNumDossier();
        log.info("MVT refOperation={} mis à jour (UPDATE), NumMvtAva={}", refOp, savedMain.getNumMvtAva());

        if (!finalize) {
            return new OperationCreationResponseDTO(refOp, numDossier, "I", "Mouvement mis à jour avec succès");
        }

        // Phase 2 : Finalize
        log.info("updateMvtFromCreate(finalize=true) — début finalize pour refOperation={}", refOp);
        OperationCreationResponseDTO resp = writeDossier(savedMain);
        // Préfixer le message pour indiquer que c'est un update
        if (resp.getMessage() != null) {
            resp.setMessage("Mouvement mis à jour. " + resp.getMessage());
        }

        // Enrichir le message avec les alertes éventuelles
        if (!alertes.isEmpty() && resp.getMessage() != null) {
            resp.setMessage(resp.getMessage() + ". Alertes: " + String.join("; ", alertes));
        }
        return resp;
    }

    /**
     * Vérifie qu'un MVT est encore modifiable (status = I).
     * Un MVT en V/A/E ne peut plus être modifié.
     */
    private void assertUpdatable(OperationsDelegueesMvt mvt) {
        if (!"I".equals(mvt.getStatus())) {
            throw new BusinessException("MVT_NON_MODIFIABLE",
                    "Le mouvement refOperation=" + mvt.getId().getRefOperation()
                            + " est en status '" + mvt.getStatus()
                            + "' et ne peut plus être modifié. Seul le status 'I' est modifiable.");
        }
    }
    // ========================= WRITE DOSSIER (logique commune finalize) =========================

    /**
     * Logique commune de finalize : V → applyMvtToDossier → A (ou E).
     * Réutilisée par create(finalize=true), findByNumDossierAndFinalize, updateOperationWithFinalize.
     */
    private OperationCreationResponseDTO writeDossier(OperationsDelegueesMvt mvt) {

        final LocalDate now = LocalDate.now();
        Long refOp = mvt.getId().getRefOperation();
        Integer numDossier = mvt.getNumDossier();

        // Marquer V
        mvt.setStatus("V");
        mvt.setDateValidation(now);
        operationsDelegueeMvtRepository.save(mvt);
        log.info("MVT refOperation={} marqué status=V", refOp);

        // Appliquer au dossier
        try {
            operationsDelegueeService.applyMvtToDossier(numDossier);

            // Succès → Marquer A
            mvt.setStatus("A");
            mvt.setEtatDossier("V");
            operationsDelegueeMvtRepository.save(mvt);
            log.info("MVT refOperation={} marqué status=A (dossier créé/mis à jour avec succès)", refOp);

            return new OperationCreationResponseDTO(refOp, numDossier, "A", "Dossier créé/mis à jour avec succès");

        } catch (Exception e) {
            log.error("Erreur lors de applyMvtToDossier pour numDossier={}: {}", numDossier, e.getMessage(), e);
            mvt.setStatus("E");
            operationsDelegueeMvtRepository.save(mvt);
            log.warn("MVT refOperation={} marqué status=E", refOp);

            return new OperationCreationResponseDTO(refOp, numDossier, "E",
                    "Erreur application dossier: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(Long refOperation, LocalDate dateOperation) {
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(dateOperation);
        return operationsDelegueeMvtRepository.existsById(id);
    }

    // ========================= HELPERS =========================

    private void applyDefaultFieldsForCreate(InitiationOuvertureDTO dto, LocalDate now) {

        Long refOperation = operationsDelegueeMvtRepository.getNextRefOperation();
        dto.setRefOperation(refOperation);

        if (dto.getNumDossier() == null) {
            try {
        applyDefaultProductAndOperationIfMissing(dto);

                Integer nextNumDossier = operationsDelegueeMvtRepository.getNextNumDossier();
                String mmyy = now.format(DateTimeFormatter.ofPattern("MMyy"));
                dto.setNumDossier(Integer.valueOf(nextNumDossier + mmyy));
            } catch (Exception e) {
                log.warn("Impossible de générer NumDossier via AVA_NUM_DOSSIER_SEQ : {}", e.getMessage());
            }
        }

        dto.setDateOperation(now);
        dto.setDateDossier(now);
        dto.setNumMvtAva(1);
        dto.setDateValidation(now);

        dto.setEtatDossier("X");
        dto.setStatus("I");


        if (dto.getCodeTypeDosAva() != null) {
            LocalDate dateUlt = typeDossierAvaRepository.findDateUltimeDeclCaByCodeTypeDosAva(dto.getCodeTypeDosAva());
            if (dateUlt != null && (dto.getCodeTypeDosAva() == TYPE_DOSSIER_4 || dto.getCodeTypeDosAva() == TYPE_DOSSIER_3)) {
                dto.setDateUltDeclCaf(dateUlt.withYear(now.getYear()));
            }
        }

        dto.setAnnee((short) now.getYear());
    }
 private List<String> runValidations(InitiationOuvertureDTO dto) {
        return runValidations(dto, false);
    }
    private List<String> runValidations(InitiationOuvertureDTO dto,boolean isUpdate) {

        List<String> alertes = new ArrayList<>();

        businessRulesService.controlerTypeDossier(dto.getCodeTypeDosAva() != null ? dto.getCodeTypeDosAva().intValue() : null);
        businessRulesService.controlerMatriculeFiscal(dto.getNoPieceClient());
        businessRulesService.controlerPieceClientmatfisc(dto.getTypePieceClient(), dto.getNoPieceClient());

      // Contrôle des dossiers incompatibles — SAUTÉ en mode UPDATE
        // car le MVT existe déjà en base, il serait détecté comme "incompatible avec lui-même"
        if (!isUpdate) {
            businessRulesService.controlerCompatibiliteTypeDossier(dto.getNoPieceClient(), dto.getCodeTypeDosAva());
        }
        if (dto.getNumeroCompte() != null) {
            businessRulesService.controlerAgenceAVA(dto.getNumeroCompte(), dto);
            businessRulesService.controlerNumeroCompte(dto.getTypePieceClient(), dto.getNoPieceClient(), dto.getNumeroCompte());
        }

        if (dto.getCodeActivite() != null && dto.getCodeTypeDosAva() != null) {
            businessRulesService.validateActiviteTypeDossier(dto.getCodeTypeDosAva().intValue(), dto.getCodeActivite());
        }

        Short codeTypeDos = dto.getCodeTypeDosAva();
        if (codeTypeDos != null && (codeTypeDos == TYPE_DOSSIER_3 || codeTypeDos == TYPE_DOSSIER_4 || codeTypeDos == TYPE_DOSSIER_5)) {
            if (dto.getCodeSousActivite() == null) {
                throw new BusinessException("CODE_SOUS_ACTIVITE_OBLIGATOIRE",
                        "Code sous-activité obligatoire pour le type de dossier " + codeTypeDos);
            }
            businessRulesService.controlerCodeActiviteetSecondaire(dto.getCodeSousActivite(), Integer.valueOf(dto.getCodeTypeDosAva()));
        }

        businessRulesService.controlerAutorisationBct(dto.getNumeroBct(), dto.getDateBct());

        boolean b = dto.getMntAutorise() != null || dto.getMntAvance() != null || dto.getMntAutoriseBct() != null || dto.getMntUtilise() != null|| dto.getCodeBanqueProvenance() != null;
        log.warn("debut process controle montants rapatries, presence de montant ou code banque provenance: {}", b);
        log.warn("debut process controle montants rapatries, presence de montant ou code banque provenance: {}",dto.getCodeBanqueProvenance());
        if(b){
            businessRulesService.controlerMontantsRapatries(
                    dto.getCodeBanqueProvenance(),
                    dto.getMntAutorise(), dto.getMntAvance(), dto.getMntAutoriseBct(), dto.getMntUtilise()
            );
            log.warn("controle fait : {}", b);
        }
        // alertes importation
        try {
            String r = businessRulesService.controlerMontantImportation(
                    dto.getMntImportation(), dto.getCodeActivite(), dto.getCodeTypeDosAva(), dto.getNumeroBct()
            );
            if (r != null && r.startsWith("ALERTE:")) alertes.add(r);
        } catch (BusinessException e) {
            if (!Boolean.TRUE.equals(dto.getConfirmationImportation())) throw e;
            alertes.add("ALERTE CONFIRMEE: " + e.getMessage());
        }

        // alertes fiscale pour type 3
        if (dto.getCodeTypeDosAva() != null && dto.getCodeTypeDosAva() == TYPE_DOSSIER_3) {
            String r = businessRulesService.controlerDeclarationFiscale(
                    dto.getNoPieceClient(), dto.getCodeActivite(), dto.getCodeTypeDosAva(),
                    dto.getNumeroBct(), dto.getTypePieceClient()
            );
            if (r != null && r.startsWith("ALERTE:")) alertes.add(r);
        }

        // produit/operation
        if (dto.getCodeProduitService() == null || dto.getCodeOperation() == null) {
            throw new BusinessException("CODE_PRODUIT_SERVICE_OU_CODE_OPERATION_MANQUANT",
                    "Le code produit service et le code opération sont obligatoires.");
        }
        boolean ok = businessRulesService.ControleCodeProduitServiceetoperation(
                Integer.valueOf(dto.getCodeProduitService()), dto.getCodeOperation()
        );
        if (!ok) {
            throw new BusinessException("CODE_PRODUIT_SERVICE_OU_CODE_OPERATION_INVALIDE",
                    "Le code produit service ou le code opération est invalide.");
        }

        return alertes;
    }

        /**
     * Valide la présence/absence du marché AVA selon le type de dossier :
     * - Type 2 : avaMarcheMvt OBLIGATOIRE
     * - Autres types (1, 3, 4, 5) : avaMarcheMvt INTERDIT
     */
    private void validateAvaMarcheByType(InitiationOuvertureDTO dto) {
        Short type = dto.getCodeTypeDosAva();
        if (type == null) return;

        if (type == TYPE_DOSSIER_2) {
            if (dto.getAvaMarcheMvt() == null) {
                throw new BusinessException("AVA_MARCHE_MVT_OBLIGATOIRE",
                        "Le marché AVA (avaMarcheMvt) est obligatoire pour le type de dossier 2");
            }
             } else {
            if (dto.getAvaMarcheMvt() != null) {
                throw new BusinessException("AVA_MARCHE_MVT_INTERDIT",
                        "Le marché AVA (avaMarcheMvt) ne doit pas être fourni pour le type de dossier " + type
                                + ". Il est autorisé uniquement pour le type 2.");
            }
        }
    }

    /**
     * Calcule et définit le solde si les attributs du solde sont renseignés.
     * Formule : solde = mntAutorise + mntAvance + mntAutoriseBct - mntUtilise - mntReserve - mntBlocage
     * Le calcul n'est effectué que si mntAutorise est renseigné (attribut principal).
     */
    private void calculateAndSetSolde(InitiationOuvertureDTO dto) {
        // On calcule seulement si mntAutorise est renseigné (attribut principal)
        if (dto.getMntAutorise() != null) {
            java.math.BigDecimal soldeCalcule = businessRulesService.calculerSolde(
                    dto.getMntAutorise(),
                    dto.getMntAvance(),
                    dto.getMntAutoriseBct(),
                    dto.getMntUtilise(),
                    dto.getMntReserve(),
                    dto.getMntBlocage()
            );
            // Mettre à jour le solde dans le DTO (champ plat)
            dto.setSolde(soldeCalcule);

            // Mettre à jour aussi dans banqueProvenance pour que le mapper propage la valeur
            if (dto.getBanqueProvenance() != null) {
                dto.getBanqueProvenance().setSolde(soldeCalcule);
            }

            log.info("Solde calculé automatiquement: {}", soldeCalcule);
        } else {
            log.debug("Solde non calculé (mntAutorise non renseigné)");
        }
    }

    /**
     * ✅ Fix principal: echeance doit être calculée avant mapping/sauvegarde du principal.
     * - Types 1/3/4: date anniversaire (année courante)
     * - Type 5: null
     * - Sinon (ex type 2): dateFin du marché si >= today, sinon null
     * + Contrôles dateContrat (obligatoire et < today) quand marché présent/nécessaire.
     */
    private void computeAndSetEcheanceBeforeSavingMain(InitiationOuvertureDTO dto, LocalDate now) {

        Short t = dto.getCodeTypeDosAva();

        if (t != null && t == TYPE_DOSSIER_5) {
            dto.setEcheance(null);
            return;
        }

        if (t != null && (t == TYPE_DOSSIER_1 || t == TYPE_DOSSIER_3 || t == TYPE_DOSSIER_4)) {
            LocalDate dateAnniv = typeDossierAvaRepository.findDateAnniversaireByCodeTypeDosAva(t);
            dto.setEcheance(dateAnniv != null ? dateAnniv.withYear(now.getYear()) : null);
            return;
        }

        // Types où l'échéance dépend du marché (ex: type 2)
        AvaMarcheMvtDTO marche = dto.getAvaMarcheMvt();
        if (marche == null) {
            dto.setEcheance(null);
            return;
        }

        // Contrôles contrat (comme ancienne logique)
        if (marche.getDateContrat() == null) {
            throw new BusinessException("La date du contrat est obligatoire pour le marché n°: " + marche.getNumMarche());
        }
        if (!marche.getDateContrat().isBefore(now)) {
            throw new BusinessException("La date du contrat doit être inférieure à la date du jour pour le marché n°: " + marche.getNumMarche());
        }

        LocalDate dateFin = marche.getDateFin();
        if (dateFin != null && !dateFin.isBefore(now)) {
            dto.setEcheance(dateFin);
        } else {
            throw new BusinessException("La date du fin doit être supérieur à la date du jour pour le marché n°: " + marche.getNumMarche());
        }
    }

    // Remplacer les montants null par BigDecimal.ZERO pour éviter des NULL en base
    // IMPORTANT: le mapper MapStruct lit mntAvance/mntUtilise/mntAutorise/mntAutoriseBct/solde
    // depuis banqueProvenance.*, donc on doit normaliser les deux (champs plats + banqueProvenance)
    private void normalizeAmountsToZero(InitiationOuvertureDTO dto) {
        if (dto == null) return;
        if (dto.getMntAvance() == null) dto.setMntAvance(java.math.BigDecimal.ZERO);
        if (dto.getMntUtilise() == null) dto.setMntUtilise(java.math.BigDecimal.ZERO);
        if (dto.getMntAutorise() == null) dto.setMntAutorise(java.math.BigDecimal.ZERO);
        if (dto.getMntCaFiscal() == null) dto.setMntCaFiscal(java.math.BigDecimal.ZERO);
        if (dto.getMntAutoriseBct() == null) dto.setMntAutoriseBct(java.math.BigDecimal.ZERO);
        if (dto.getMntCa()==null) dto.setMntCa(java.math.BigDecimal.ZERO);
        if (dto.getMntImportation()==null) dto.setMntImportation(0L);
        if (dto.getSolde() == null) dto.setSolde(java.math.BigDecimal.ZERO);
        if (dto.getMntReserve() == null) dto.setMntReserve(java.math.BigDecimal.ZERO);
        if (dto.getMntBlocage() == null) dto.setMntBlocage(java.math.BigDecimal.ZERO);
        if (dto.getMntMvtAva() == null) dto.setMntMvtAva(java.math.BigDecimal.ZERO);

        // Synchroniser vers banqueProvenance (source réelle pour MapStruct toEntity)
        IbansysPoc.AVA.DTO.BanqueProvenanceDTO bp = dto.getBanqueProvenance();
        if (bp == null) {
            bp = new IbansysPoc.AVA.DTO.BanqueProvenanceDTO();
            dto.setBanqueProvenance(bp);
        }
        if (bp.getMntAvance() == null) bp.setMntAvance(dto.getMntAvance());
        if (bp.getMntUtilise() == null) bp.setMntUtilise(dto.getMntUtilise());
        if (bp.getMntAutorise() == null) bp.setMntAutorise(dto.getMntAutorise());
        if (bp.getMntAutoriseBct() == null) bp.setMntAutoriseBct(dto.getMntAutoriseBct());
        if (bp.getSolde() == null) bp.setSolde(dto.getSolde());
        if (bp.getMntReserve() == null) bp.setMntReserve(dto.getMntReserve());
        if (bp.getMntBlocage() == null) bp.setMntBlocage(dto.getMntBlocage());
    }

    private OperationsDelegueesMvt saveMain(InitiationOuvertureDTO dto) {

        log.info("Creation d'un mouvement d'operation deleguee avec refOperation: {}, dateOperation: {}",
                dto.getRefOperation(), dto.getDateOperation());

        // Debug: afficher numeroCompte reçu dans le DTO
        log.debug("DEBUG DTO - numeroCompte (avant mapping) = {}", dto.getNumeroCompte());

        // Normaliser les montants AVANT le mapping : si null -> ZERO
        normalizeAmountsToZero(dto);

        // Map DTO -> entity
        OperationsDelegueesMvt operationsDelegueesMvt = operationsDelegueeMvtMapper.toEntity(dto);

        // Debug: vérifier numeroCompte sur l'entité après mapping
        log.debug("DEBUG Entity - numeroCompte (apres mapping) = {}", operationsDelegueesMvt.getNumeroCompte());

        // Safety: si MapStruct n'a pas copié numeroCompte (pour raisons de config), forcer la copie
        if ((operationsDelegueesMvt.getNumeroCompte() == null || operationsDelegueesMvt.getNumeroCompte().isBlank())
                && dto.getNumeroCompte() != null && !dto.getNumeroCompte().isBlank()) {
            operationsDelegueesMvt.setNumeroCompte(dto.getNumeroCompte());
            log.debug("DEBUG Force copy numeroCompte from DTO to entity: {}", dto.getNumeroCompte());
        }

        // Safety: si MapStruct n'a pas copié le solde, forcer la copie
        if (operationsDelegueesMvt.getSolde() == null && dto.getSolde() != null) {
            operationsDelegueesMvt.setSolde(dto.getSolde());
            log.debug("DEBUG Force copy solde from DTO to entity: {}", dto.getSolde());
        }

        if(dto.getCodeActivite() == null && dto.getCodeSousActivite() != null){
           throw new BusinessException("CODE_ACTIVITE_OBLIGATOIRE",
                      "Le code activité est obligatoire lorsque le code sous-activité est fourni.");
        }

        // Validation avant insert pour attraper les violations de constraints côté base
        List<String> preErrors = new ArrayList<>();
        if (operationsDelegueesMvt.getCodeProduitService() == null) preErrors.add("codeProduitService manquant");
        if (operationsDelegueesMvt.getCodeOperation() == null) preErrors.add("codeOperation manquant");
        if (operationsDelegueesMvt.getNumDossier() == null) preErrors.add("numDossier manquant");
        if (operationsDelegueesMvt.getDateDossier() == null) preErrors.add("dateDossier manquante");
        if (operationsDelegueesMvt.getTypePieceClient() == null) preErrors.add("typePieceClient manquant");
        if (operationsDelegueesMvt.getNoPieceClient() == null || operationsDelegueesMvt.getNoPieceClient().isBlank()) preErrors.add("noPieceClient manquant");
        if (!preErrors.isEmpty()) {
            throw new BusinessException("VALIDATION_PRE_INSERT", String.join("; ", preErrors));
        }

        OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
        mvtId.setDateOperation(dto.getDateOperation());
        mvtId.setRefOperation(dto.getRefOperation());
        operationsDelegueesMvt.setId(mvtId);




        try {
            OperationsDelegueesMvt savedOperationsDelegueesMvt = operationsDelegueeMvtRepository.save(operationsDelegueesMvt);

            // Debug: vérifier numeroCompte sur l'entité après sauvegarde
            log.debug("DEBUG Saved Entity - numeroCompte (apres save) = {}", savedOperationsDelegueesMvt.getNumeroCompte());

            // DEBUG: Vérifier les valeurs après sauvegarde
            log.info("APRES SAVE - numDossier de l'entité sauvegardée: {}", savedOperationsDelegueesMvt.getNumDossier());

            // Ne pas déclencher ValidationDossier ici (les relations ne sont pas encore persistées).
            // Le déclenchement éventuel doit être effectué par l'appelant après avoir persisté les relations.

            // NOTE: trigger moved to caller (initialisationOuverture) so relations (beneficiaires/documents/marche)
            // are persisted before calling ValidationDossier. Calling ValidationDossier here was too early
            // because initialisationOuverture persists relations AFTER saveMain.

            return savedOperationsDelegueesMvt;
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Loguer l'entité complète et la cause pour diagnostic
            log.error("Violation contrainte lors de l'insertion OperationsDelegueesMvt: entité={}, cause={}", operationsDelegueesMvt, ex.getMostSpecificCause().getMessage(), ex);
            // Suggérer champs pouvant provoquer la contrainte (aide au debug)
            throw new BusinessException("DB_CONSTRAINT_VIOLATION", "Insertion refusée par contrainte DB (ORA-02290). Cause: " + ex.getMostSpecificCause().getMessage());
        }
    }

    private List<BeneficiairesMvt> saveBeneficiaires(InitiationOuvertureDTO dto, OperationsDelegueesMvt main, LocalDate now) {

        List<BeneficiairesMvt> saved = new ArrayList<>();
        if (dto.getBeneficiairesMvtListe() == null || dto.getBeneficiairesMvtListe().isEmpty()) return saved;

        for (BeneficiaireMvtDTO b : dto.getBeneficiairesMvtListe()) {

            BeneficiairesMvt e = beneficiaireMvtMapper.toEntity(b);

            e.setCodeTypeDos(main.getCodeTypeDosAva());
            e.setCodeAgenceAva(main.getCodeAgenceAva());
            e.setDateCreation(now);
            e.setEtat("AA"); // Valeur par défaut

            BeneficiairesMvtId bid = new BeneficiairesMvtId();
            bid.setCodeProduitService(main.getCodeProduitService());
            bid.setCodeOperation(main.getCodeOperation());
            bid.setRefOperation(main.getId().getRefOperation());
            bid.setDateOperation(main.getId().getDateOperation());
            bid.setNumDossier(Math.toIntExact(main.getNumDossier()));
            bid.setDateDossier(now);
            bid.setTypePieceBenef(b.getTypePieceBenef());
            bid.setNoPieceBenef(b.getNoPieceBenef());


            e.setId(bid);
            e.setOperationsDelegueesMvt(main);

            saved.add(beneficiaireMvtRepository.save(e));
        }
        return saved;
    }

    private List<BeneficiairesMvt> replaceBeneficiaires(InitiationOuvertureDTO dto, OperationsDelegueesMvt main, Long refOperation, LocalDate now) {

        List<BeneficiairesMvt> existing = beneficiaireMvtRepository.findByIdRefOperation(refOperation);
        if (!existing.isEmpty()) beneficiaireMvtRepository.deleteAll(existing);

        return saveBeneficiaires(dto, main, now);
    }

    private List<Document> saveDocuments(InitiationOuvertureDTO dto, OperationsDelegueesMvt main, LocalDate now) {

        List<Document> saved = new ArrayList<>();
        if (dto.getDocuments() == null || dto.getDocuments().isEmpty()) return saved;

        long numLigne = 1L;

        for (DocumentDTO d : dto.getDocuments()) {

            Document e = documentMapper.toEntity(d);

            e.setRefOperation(main.getId().getRefOperation());
            e.setDateOperation(main.getId().getDateOperation());
            e.setNumDossier(main.getNumDossier());
            e.setDateDossier(main.getDateDossier());
            e.setCodeProduitService(main.getCodeProduitService());
            e.setCodeOperation(main.getCodeOperation());

            e.setNumLigne(numLigne);
            e.setPathAnnee(String.valueOf(now.getYear()));
            e.setPathMois(String.format("%02d", now.getMonthValue()));

            e.setOperationsDelegueesMvt(main);

            saved.add(documentRepository.save(e));
            numLigne++;
        }

        return saved;
    }

    private List<Document> replaceDocuments(InitiationOuvertureDTO dto, OperationsDelegueesMvt main, Long refOperation, LocalDate now) {

        List<Document> existing = documentRepository.findByRefOperation(refOperation);
        if (!existing.isEmpty()) documentRepository.deleteAll(existing);

        return saveDocuments(dto, main, now);
    }

    /**
     * Sauvegarde du marché APRÈS sauvegarde du principal.
     * IMPORTANT: on ne recalcule pas l'échéance ici.
     */
    private AvaMarcheMvt saveAvaMarcheAfterMainSaved(InitiationOuvertureDTO dto, OperationsDelegueesMvt savedMain) {

        if (dto.getAvaMarcheMvt() == null) {
            return null;
        }

        AvaMarcheMvtDTO avaDTO = dto.getAvaMarcheMvt();
        Long refOp = savedMain.getId().getRefOperation();

        // Utiliser l'instance Hibernate déjà managée via le @OneToOne
        AvaMarcheMvt marche = savedMain.getAvaMarcheMvt();
        if (marche != null) {
            // ── UPDATE de l'existant (instance déjà en session Hibernate) 

        // Mettre à jour l'ID si numMarche change (partie de la PK composite)
            if (avaDTO.getNumMarche() != null) {
                marche.getId().setNumMarche(avaDTO.getNumMarche());
            }

            // Mettre à jour les champs
            marche.setMontantMarche(avaDTO.getMontantMarche());
            marche.setRefContrat(avaDTO.getRefContrat());
            marche.setContractant(avaDTO.getContractant());
            marche.setDateFin(avaDTO.getDateFin());
            marche.setCodeDevise(avaDTO.getCodeDevise());
        } else {
            // ── INSERT nouveau ──
            marche = avaMarcheMvtMapper.toEntity(avaDTO);

 AvaMarcheMvtId mid = marche.getId();
            if (mid == null) mid = new AvaMarcheMvtId();

            mid.setRefOperation(refOp.intValue());
            mid.setDateOperation(savedMain.getId().getDateOperation());
            mid.setNumMarche(avaDTO.getNumMarche());
            mid.setCodeProduitService(savedMain.getCodeProduitService());
            mid.setCodeOperation(savedMain.getCodeOperation());

            marche.setId(mid);
        }

        // Champs communs (create + update)
        marche.setNumDossier(Math.toIntExact(savedMain.getNumDossier()));
        marche.setDateDossier(savedMain.getDateDossier());
        marche.setCodeAgenceAva(savedMain.getCodeAgenceAva());
        marche.setStatus(savedMain.getStatus());
        if(marche.getRefContrat() == null){
            throw new BusinessException("REF_CONTRAT_OBLIGATOIRE", "La référence du contrat est obligatoire  " );
        }

        marche.setOperationsDelegueesMvt(savedMain);

        return avaMarcheMvtRepository.save(marche);
    }

    private InitiationOuvertureDTO buildResult(
            OperationsDelegueesMvt main,
            List<BeneficiairesMvt> benefs,
            List<Document> docs,
            AvaMarcheMvt marche
    ) {
        InitiationOuvertureDTO result = operationsDelegueeMvtMapper.toDTO(main);
        result.setBeneficiairesMvtListe(beneficiaireMvtMapper.toDTOList(benefs));
        result.setDocuments(documentMapper.toDTOList(docs));
        result.setAvaMarcheMvt(marche != null ? avaMarcheMvtMapper.toDTO(marche) : null);
        // Safety: copy numeroCompte and nomDossier explicitly from entity to result DTO
        if (main != null) {
            result.setNumeroCompte(main.getNumeroCompte());
            // Assurer que le DTO contient la référence et le numéro de dossier créés
            if (main.getId() != null && main.getId().getRefOperation() != null) {
                result.setRefOperation(main.getId().getRefOperation());
                result.setDateOperation(main.getId().getDateOperation());
            }
            result.setNumDossier(main.getNumDossier());
        }
        return result;
    }

    private void applyDefaultProductAndOperationIfMissing(InitiationOuvertureDTO dto) {
        if (dto == null) return;

        boolean appliedProduit = setIfNull(dto::getCodeProduitService, dto::setCodeProduitService, DEFAULT_CODE_PRODUIT_SERVICE);
        boolean appliedOperation = setIfNull(dto::getCodeOperation, dto::setCodeOperation, DEFAULT_CODE_OPERATION);
        if (appliedProduit || appliedOperation) {
            log.info("Valeurs par défaut appliquées pour produit/operation sur le DTO : produit={}, operation={}",
                    dto.getCodeProduitService(), dto.getCodeOperation());
        }
    }

    // Helper générique pour setter une valeur si le getter renvoie null
    private static <T> boolean setIfNull(Supplier<T> getter, Consumer<T> setter, T defaultValue) {
        if (getter.get() == null) {
            setter.accept(defaultValue);
            return true;
        }
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OperationsDelegueesMvt> findByNumDossierAndPeriod(Integer numDossier, LocalDate startDate, LocalDate endDate) {
        log.info("Recherche des mouvements MVT pour numDossier={} entre {} et {}", numDossier, startDate, endDate);

        if (numDossier == null || startDate == null || endDate == null) {
            throw new IllegalArgumentException("numDossier, startDate et endDate sont obligatoires");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate doit être >= startDate");
        }

        List<OperationsDelegueesMvt> mvts =
                operationsDelegueeMvtRepository.findByNumDossierAndIdDateOperationBetween(numDossier, startDate, endDate);

        if (mvts == null || mvts.isEmpty()) {
            log.info("Aucun mouvement trouvé pour numDossier={} entre {} et {}", numDossier, startDate, endDate);
            return List.of();
        }

        // Charger relations
        for (OperationsDelegueesMvt mvt : mvts) {
            Long refOperation = (mvt.getId() != null) ? mvt.getId().getRefOperation() : null;

            List<BeneficiairesMvt> benefs = (refOperation != null)
                    ? beneficiaireMvtRepository.findByIdRefOperation(refOperation)
                    : List.of();
            mvt.setBeneficiairesMvtListe(benefs);

            List<Document> docs = (refOperation != null)
                    ? documentRepository.findByRefOperation(refOperation)
                    : List.of();
            mvt.setDocuments(docs);

            List<AvaMarcheMvt> marcheList = (refOperation != null)
                    ? avaMarcheMvtRepository.findByIdRefOperation(refOperation.intValue())
                    : List.of();
            mvt.setAvaMarcheMvt((marcheList != null && !marcheList.isEmpty()) ? marcheList.get(0) : null);
        }

        log.info("Trouvé {} mouvements pour numDossier={}", mvts.size(), numDossier);
        return mvts;
    }
   
}
