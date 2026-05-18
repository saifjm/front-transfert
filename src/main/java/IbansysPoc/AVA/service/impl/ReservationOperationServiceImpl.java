package IbansysPoc.AVA.service.impl;

import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.ReservationOperationDTO;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.OperationsDelegueesMvtId;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.mapper.ReservationOperationMapper;
import IbansysPoc.AVA.repository.OperationsDelegueeMvtRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.service.BusinessRulesService;
import IbansysPoc.AVA.service.ReservationOperationService;
import IbansysPoc.AVA.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReservationOperationServiceImpl implements ReservationOperationService {

    private static final String STATUS_INITIAL = "I";
    private static final String STATUS_VALIDE = "V";
    private static final String STATUS_APPLIQUE = "A";
    private static final String STATUS_ERREUR = "E";

    private static final String ETAT_DOSSIER_REQUIS = "V";
    private static final Short CODE_PRODUIT_SERVICE = 108;

    private static final int CODE_OPERATION_RESERVATION = 269;
    private static final int CODE_OPERATION_RESERVATION_ANNULATION = 231;

    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeRepository dossierRepository;
    private final BusinessRulesService businessRulesService;
    private final ReservationOperationMapper mapper;
    private final ReservationService reservationService;

    // ----------------------------------------------------
    // CRUD (backward compat)
    // ----------------------------------------------------

    @Override
    public ReservationOperationDTO create(ReservationOperationDTO dto) {
        // Backward compat : délègue à create(dto, false)
        OperationCreationResponseDTO resp = create(dto, false);
        return getById(resp.getRefOperation());
    }

    @Override
    public ReservationOperationDTO createOprAnnulation(ReservationOperationDTO dto) {
        // Backward compat : délègue à createAnnulation(dto, false)
        OperationCreationResponseDTO resp = createAnnulation(dto, false);
        return getById(resp.getRefOperation());
    }

    // ----------------------------------------------------
    // CREATE + FINALIZE (pattern identique à OperationsDelegueesMvt)
    // ----------------------------------------------------

    @Override
    @Transactional
    public OperationCreationResponseDTO create(ReservationOperationDTO dto, boolean finalize) {
        
        // ── UPDATE si refOperation est fourni ──
        if (dto.getRefOperation() != null) {
            log.info("refOperation={} fourni → UPDATE opération RESERVATION (269) finalize={}", dto.getRefOperation(), finalize);
            return updateReservation(dto, finalize, CODE_OPERATION_RESERVATION);
        }

        // ── CREATE ──
        log.info("Création opération RESERVATION (269) dossier={} finalize={}", dto.getNumDossier(), finalize);

        LocalDate now = LocalDate.now();
        Long refOperation = mvtRepository.getNextRefOperation();

        OperationsDeleguee dossier = getDossierOrThrow(dto.getNumDossier());
        OperationsDelegueesMvt entity = buildNewEntity(refOperation, now, dossier);

        validateBusinessRules(dto, entity);

        mapper.updateEntityFromDto(dto, entity);

        entity.setReferenceRes(dto.getReference());
        entity.setCodeOperation(CODE_OPERATION_RESERVATION);
        entity.setCodeProduitService(CODE_PRODUIT_SERVICE);

        // snapshot dossier
        fillSnapshotFromDossier(entity, dossier);

        OperationsDelegueesMvt saved = mvtRepository.save(entity);
        log.info("Opération RESERVATION créée refOperation={}", refOperation);

        Integer numDossier = saved.getNumDossier();

        if (!finalize) {
            log.info("create(finalize=false) terminé. MVT refOperation={} en status I", refOperation);
            return new OperationCreationResponseDTO(refOperation, numDossier, STATUS_INITIAL, "Réservation créée avec succès ");        }

        // Phase 2 : Finalize → writeDossierReservation
        log.info("create(finalize=true) — début finalize pour refOperation={}", refOperation);
  OperationCreationResponseDTO resp = writeDossierReservation(saved);
        return resp;
        }

    @Override
    @Transactional
    public OperationCreationResponseDTO createAnnulation(ReservationOperationDTO dto, boolean finalize) {

        // ── UPDATE si refOperation est fourni ──
        if (dto.getRefOperation() != null) {
            log.info("refOperation={} fourni → UPDATE opération ANNULATION (231) finalize={}", dto.getRefOperation(), finalize);
            return updateReservation(dto, finalize, CODE_OPERATION_RESERVATION_ANNULATION);
        }

        // ── CREATE ──
        log.info("Création opération ANNULATION (231) dossier={} referenceRes={} finalize={}",
                dto.getNumDossier(), dto.getReference(), finalize);

        LocalDate now = LocalDate.now();
        Long refOperation = mvtRepository.getNextRefOperation();

        OperationsDeleguee dossier = getDossierOrThrow(dto.getNumDossier());
        OperationsDelegueesMvt entity = buildNewEntity(refOperation, now, dossier);

        validateBusinessRulesAnnulation(dto);

        mapper.updateEntityFromDto(dto, entity);

        entity.setReferenceRes(dto.getReference());
        entity.setCodeOperation(CODE_OPERATION_RESERVATION_ANNULATION);
        entity.setCodeProduitService(CODE_PRODUIT_SERVICE);

        // snapshot dossier
        fillSnapshotFromDossier(entity, dossier);

        OperationsDelegueesMvt saved = mvtRepository.save(entity);
        log.info("Opération ANNULATION créée refOperation={}", refOperation);

        Integer numDossier = saved.getNumDossier();

        if (!finalize) {
            log.info("createAnnulation(finalize=false) terminé. MVT refOperation={} en status I", refOperation);
            return new OperationCreationResponseDTO(refOperation, numDossier, STATUS_INITIAL, "Annulation de réservation créée avec succès ");        }

        // Phase 2 : Finalize → writeDossierReservation
        log.info("createAnnulation(finalize=true) — début finalize pour refOperation={}", refOperation);
   OperationCreationResponseDTO resp = writeDossierReservation(saved);
        return resp;    }

    @Override
    @Transactional(readOnly = true)
    public ReservationOperationDTO getById(Long refOperation) {
        return mapper.toDto(getMvtByRefOperationOrThrow(refOperation));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationOperationDTO> getAll() {
        return mapper.toDtoList(mvtRepository.findAll());
    }

    @Override
    public ReservationOperationDTO update(Long refOperation, ReservationOperationDTO dto) {
        OperationsDelegueesMvt existing = getMvtByRefOperationOrThrow(refOperation);
        mapper.updateEntityFromDto(dto, existing);
        return mapper.toDto(mvtRepository.save(existing));
    }

    @Override
    public void delete(Long refOperation) {
        OperationsDelegueesMvt existing = getMvtByRefOperationOrThrow(refOperation);
        mvtRepository.delete(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationOperationDTO> findByNumDossier(Integer numDossier) {
        return mvtRepository.findAll().stream()
                .filter(e -> numDossier.equals(e.getNumDossier()))
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationOperationDTO> findByNoPieceClient(String noPieceClient) {
        return mvtRepository.findByNoPieceClient(noPieceClient).stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    // ----------------------------------------------------
    // Validation unique par referenceRes (269 ou 231) - SANS T
    // ----------------------------------------------------

    @Override
    public ReservationOperationDTO validateAndProcessByReferenceRes(String referenceRes) {

        if (referenceRes == null || referenceRes.trim().isEmpty()) {
            throw new BusinessException("REFERENCE_MANQUANTE", "referenceRes est obligatoire");
        }

        String ref = referenceRes.trim();

        // chercher une opération éligible : status != V
        List<OperationsDelegueesMvt> candidates =
                mvtRepository.findByReferenceResAndCodeProduitServiceAndCodeOperationInAndStatusNot(
                        ref,
                        CODE_PRODUIT_SERVICE,
                        List.of(CODE_OPERATION_RESERVATION, CODE_OPERATION_RESERVATION_ANNULATION),
                        STATUS_VALIDE
                );

        if (candidates == null || candidates.isEmpty()) {
            return null; // rien à traiter
        }

        // prendre la plus récente (refOperation max)
        OperationsDelegueesMvt mvt = candidates.stream()
                .filter(x -> x.getId() != null && x.getId().getRefOperation() != null)
                .max((a, b) -> a.getId().getRefOperation().compareTo(b.getId().getRefOperation()))
                .orElse(candidates.get(0));

        // Finalize : utilise le même pattern writeDossierReservation (V → apply → A/E)
        writeDossierReservation(mvt);

        // Recharger l'entité pour renvoyer l'état final
        OperationsDelegueesMvt reloaded = getMvtByRefOperationOrThrow(mvt.getId().getRefOperation());
        return mapper.toDto(reloaded);
    }

    // ----------------------------------------------------
    // Traitement : processMvt (backward compat)
    // ----------------------------------------------------

    @Override
    public void processMvt(OperationsDelegueesMvt mvt) {
        applyReservationToDossier(mvt);
    }

    // ----------------------------------------------------
    // WRITE DOSSIER RESERVATION (pattern identique à writeDossier dans OperationsDelegueesMvtServiceImpl)
    // V → applyReservationToDossier → A (ou E)
    // ----------------------------------------------------

    private OperationCreationResponseDTO writeDossierReservation(OperationsDelegueesMvt mvt) {
        final LocalDate now = LocalDate.now();
        Long refOp = mvt.getId().getRefOperation();
        Integer numDossier = mvt.getNumDossier();

        // 1) Marquer V
        mvt.setStatus(STATUS_VALIDE);
        mvt.setDateValidation(now);
        mvtRepository.save(mvt);
        log.info("MVT RESERVATION refOperation={} marqué status=V", refOp);

        // 2) Appliquer au dossier (avec lock pessimiste)
        try {
            applyReservationToDossier(mvt);

            // 3a) Succès → A
            mvt.setStatus(STATUS_APPLIQUE);
            mvtRepository.save(mvt);
            log.info("MVT RESERVATION refOperation={} marqué status=A", refOp);

            return new OperationCreationResponseDTO(refOp, numDossier, STATUS_APPLIQUE,
                    "Réservation appliquée avec succès");

        } catch (Exception e) {
            // 3b) Échec → E
            log.error("Erreur applyReservationToDossier refOperation={}: {}", refOp, e.getMessage(), e);
            mvt.setStatus(STATUS_ERREUR);
            mvtRepository.save(mvt);
            log.warn("MVT RESERVATION refOperation={} marqué status=E", refOp);

            return new OperationCreationResponseDTO(refOp, numDossier, STATUS_ERREUR,
                    "Erreur application réservation: " + e.getMessage());
        }
    }

    // ----------------------------------------------------
    // APPLY RESERVATION TO DOSSIER (lock pessimiste + idempotence)
    // ----------------------------------------------------

    private void applyReservationToDossier(OperationsDelegueesMvt mvt) {
        if (mvt == null) return;

        Long refOp = mvt.getId().getRefOperation();
        Integer numDossier = mvt.getNumDossier();
        Integer codeOperation = mvt.getCodeOperation();

        // Idempotence : si déjà appliqué → skip
        if (STATUS_APPLIQUE.equals(mvt.getStatus())) {
            log.info("MVT refOperation={} déjà appliqué (status=A), skip", refOp);
            return;
        }

        // Lock pessimiste sur le dossier
        OperationsDeleguee dossier = dossierRepository.findByIdForUpdate(numDossier)
                .orElseThrow(() -> new BusinessException("DOSSIER_NON_TROUVE",
                        "Dossier non trouvé numDossier=" + numDossier));

        if (Objects.equals(codeOperation, CODE_OPERATION_RESERVATION)) {
            // ── Réservation 269 ──
            reservationService.createFromMvt(mvt);

            BigDecimal nouveauMntReserve = defaultZero(dossier.getMntReserve()).add(defaultZero(mvt.getMntMvtAva()));
            dossier.setMntReserve(nouveauMntReserve);

            BigDecimal soldeCalcule = businessRulesService.calculerSolde(
                    dossier.getMntAutorise(),
                    dossier.getMntAvance(),
                    dossier.getMntAutoriseBct(),
                    dossier.getMntUtilise(),
                    nouveauMntReserve,
                    dossier.getMntBlocage()
            );
            dossier.setSolde(soldeCalcule);
            dossierRepository.save(dossier);
            log.info("Réservation 269 appliquée: numDossier={}, nouveauMntReserve={}, solde={}", numDossier, nouveauMntReserve, soldeCalcule);
            return;
        }

        if (Objects.equals(codeOperation, CODE_OPERATION_RESERVATION_ANNULATION)) {
            // ── Annulation 231 ──
            reservationService.createAnnulationFromMvt(mvt);

            BigDecimal nouveauReserve = defaultZero(dossier.getMntReserve()).subtract(defaultZero(mvt.getMntMvtAva()));
            dossier.setMntReserve(nouveauReserve);

            BigDecimal soldeCalcule = businessRulesService.calculerSolde(
                    dossier.getMntAutorise(),
                    dossier.getMntAvance(),
                    dossier.getMntAutoriseBct(),
                    dossier.getMntUtilise(),
                    nouveauReserve,
                    dossier.getMntBlocage()
            );
            dossier.setSolde(soldeCalcule);
            dossierRepository.save(dossier);
            log.info("Annulation 231 appliquée: numDossier={}, nouveauReserve={}, solde={}", numDossier, nouveauReserve, soldeCalcule);
            return;
        }

        log.debug("applyReservationToDossier: codeOperation non géré={}", codeOperation);
    }
 // ----------------------------------------------------
    // UPDATE RESERVATION (logique commune create-or-update)
    // ----------------------------------------------------

    /**
     * Met à jour un MVT existant identifié par dto.refOperation.
     * - Vérifie que le MVT existe → sinon 404
     * - Vérifie que le MVT est en status I → sinon BusinessException
     * - Met à jour les champs depuis le DTO
     * - Si finalize → writeDossierReservation
     */
    private OperationCreationResponseDTO updateReservation(ReservationOperationDTO dto, boolean finalize, int codeOperation) {
        Long refOp = dto.getRefOperation();

        // 1) Charger le MVT existant (404 si introuvable)
        OperationsDelegueesMvt existing = getMvtByRefOperationOrThrow(refOp);

        // 2) Seul un MVT en status I peut être modifié
        assertUpdatable(existing);

        // 3) Valider les règles métier
        if (codeOperation == CODE_OPERATION_RESERVATION) {
            validateBusinessRules(dto, existing);
        } else {
            validateBusinessRulesAnnulation(dto);
        }

        // 4) Mapper les champs du DTO vers l'entité existante
        mapper.updateEntityFromDto(dto, existing);
        if (dto.getReference() != null) {
            existing.setReferenceRes(dto.getReference());
        }

        // 5) Incrémenter NumMvtAva à chaque update
        int currentNumMvt = existing.getNumMvtAva() != null ? existing.getNumMvtAva() : 1;
        existing.setNumMvtAva(currentNumMvt + 1);

        // 6) Sauvegarder
        OperationsDelegueesMvt saved = mvtRepository.save(existing);
        Integer numDossier = saved.getNumDossier();
        log.info("MVT refOperation={} mis à jour (UPDATE)", refOp);

        if (!finalize) {
            return new OperationCreationResponseDTO(refOp, numDossier, STATUS_INITIAL, "Réservation mise à jour avec succées");
        }

        // Phase 2 : Finalize
        log.info("updateReservation(finalize=true) — début finalize pour refOperation={}", refOp);
        OperationCreationResponseDTO resp = writeDossierReservation(saved);
        if (resp.getMessage() != null) {
            resp.setMessage("Mouvement mis à jour. " + resp.getMessage());
        }
        return resp;
    }

    /**
     * Vérifie qu'un MVT est encore modifiable (status = I).
     * Un MVT en V/A/E ne peut plus être modifié.
     */
    private void assertUpdatable(OperationsDelegueesMvt mvt) {
        if (!STATUS_INITIAL.equals(mvt.getStatus())) {
            throw new BusinessException("MVT_NON_MODIFIABLE",
                    "Le mouvement refOperation=" + mvt.getId().getRefOperation()
                            + " est en status '" + mvt.getStatus()
                            + "' et ne peut plus être modifié. Seul le status 'I' est modifiable.");
        }
    }

    // ----------------------------------------------------
    // Helpers / validations
    // ----------------------------------------------------

    private void fillSnapshotFromDossier(OperationsDelegueesMvt entity, OperationsDeleguee dossier) {
        entity.setNoPieceClient(dossier.getNoPieceClient());
        entity.setTypePieceClient(Integer.valueOf(dossier.getTypePieceClient()));
        entity.setNumeroCompte(dossier.getNumeroCompte());
        entity.setMntReserve(defaultZero(dossier.getMntReserve()));
        entity.setSolde(defaultZero(dossier.getSolde()));
        entity.setMntAvance(defaultZero(dossier.getMntAvance()));
        entity.setMntUtilise(defaultZero(dossier.getMntUtilise()));
        entity.setMntAutorise(defaultZero(dossier.getMntAutorise()));
        entity.setMntAutoriseBct(defaultZero(dossier.getMntAutoriseBct()));
        entity.setMntBlocage(defaultZero(dossier.getMntBlocage()));
        entity.setNumMvtAva(1);
    }

    private OperationsDeleguee getDossierOrThrow(Integer numDossier) {
        OperationsDeleguee dossier = dossierRepository.findByNumDossier(numDossier);
        if (dossier == null) {
            throw new BusinessException("DOSSIER_NON_TROUVE", "Dossier non trouvé avec numDossier: " + numDossier);
        }
        return dossier;
    }

    private OperationsDelegueesMvt getMvtByRefOperationOrThrow(Long refOperation) {
        List<OperationsDelegueesMvt> entities = mvtRepository.findByIdRefOperation(refOperation);
        if (entities.isEmpty()) {
            throw new ResourceNotFoundException("Opération de réservation non trouvée avec refOperation: " + refOperation);
        }
        return entities.get(0);
    }

    private OperationsDelegueesMvt buildNewEntity(Long refOperation, LocalDate now, OperationsDeleguee dossier) {
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(now);

        OperationsDelegueesMvt entity = new OperationsDelegueesMvt();
        entity.setId(id);

        entity.setDateDossier(now);
        entity.setCodeAgenceAva(dossier.getCodeAgenceAva());
        entity.setAnnee((short) now.getYear());
        entity.setDateEtat(now);
        entity.setCodeTypeDosAva(dossier.getCodeTypeDosAva());
        entity.setStatus(STATUS_INITIAL);
        entity.setEtatDossier(dossier.getEtatDossier());

        return entity;
    }

    private void validateBusinessRules(ReservationOperationDTO dto, OperationsDelegueesMvt entity) {
        if (!ETAT_DOSSIER_REQUIS.equals(entity.getEtatDossier())) {
            throw new BusinessException("ETAT_DOSSIER_INVALIDE",
                    "L'état du dossier doit être 'V' pour pouvoir créer une opération de réservation.");
        }

        BigDecimal solde = dossierRepository.findSoldeByNumDossier(dto.getNumDossier());
        if (solde.compareTo(dto.getMntMvtAva()) < 0) {
            throw new BusinessException("SOLDE_INSUFFISANT",
                    "Le solde du dossier est insuffisant pour la réservation demandée.");
        }

        validateOrigine(dto.getOrigine());
    }

    private void validateBusinessRulesAnnulation(ReservationOperationDTO dto) {
        validateOrigine(dto.getOrigine());
    }

    private void validateOrigine(String origine) {
        if (origine == null) {
            throw new BusinessException("ORIGINE_MANQUANTE", "L'origine est obligatoire.");
        }
        if (!origine.equals("MONETIQUE") && !origine.equals("virement") && !origine.equals("CHEQUE")) {
            throw new BusinessException("ORIGINE_INVALIDE",
                    "L'origine doit être 'MONETIQUE', 'virement' ou 'CHEQUE'.");
        }
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
