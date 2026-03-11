package IbansysPoc.AVA.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import IbansysPoc.AVA.DTO.AutorisationBctDTO;
import IbansysPoc.AVA.DTO.AvaMarcheDTO;
import IbansysPoc.AVA.DTO.BeneficiaireDTO;
import IbansysPoc.AVA.DTO.BeneficiaireSummaryDTO;
import IbansysPoc.AVA.DTO.DocumentDTO;
import IbansysPoc.AVA.DTO.DossierValideDTO;
import IbansysPoc.AVA.DTO.LeveeSuspensionDTO;
import IbansysPoc.AVA.DTO.OperationsDelegueeSummaryDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.DTO.PersonneDTO;
import IbansysPoc.AVA.DTO.SuspensionDTO;
import IbansysPoc.AVA.entity.AvaMarche;
import IbansysPoc.AVA.entity.AvaMarcheMvt;
import IbansysPoc.AVA.entity.Beneficiaire;
import IbansysPoc.AVA.entity.BeneficiaireId;
import IbansysPoc.AVA.entity.BeneficiairesMvt;
import IbansysPoc.AVA.entity.Document;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.OperationsDelegueesMvtId;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.mapper.AvaMarcheMapper;
import IbansysPoc.AVA.mapper.BeneficiaireMapper;
import IbansysPoc.AVA.mapper.DocumentMapper;
import IbansysPoc.AVA.mapper.OperationsDelegueeMapper;
import IbansysPoc.AVA.repository.AvaMarcheMvtRepository;
import IbansysPoc.AVA.repository.AvaMarcheRepository;
import IbansysPoc.AVA.repository.BeneficiaireMvtRepository;
import IbansysPoc.AVA.repository.BeneficiaireRepository;
import IbansysPoc.AVA.repository.DocumentRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeMvtRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.service.ApiExterneService;
import IbansysPoc.AVA.service.BusinessRulesService;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Implémentation du service pour les opérations déléguées.
 * Gère la création complète avec bénéficiaires, documents et marché AVA (OneToOne).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OperationsDelegueeServiceImpl implements OperationsDelegueeService {

    // ==================== DEPENDANCES ====================
    final LocalDate now = LocalDate.now();
    private final OperationsDelegueeRepository operationsDelegueeRepository;
    private final BeneficiaireRepository beneficiaireRepository;
    private final BeneficiaireMvtRepository beneficiaireMvtRepository;
    private final AvaMarcheMvtRepository avaMarcheMvtRepository;
    private final DocumentRepository documentRepository;
    private final AvaMarcheRepository avaMarcheRepository;
    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeMvtRepository operationsDelegueeMvtRepository;

    private final OperationsDelegueeMapper operationsDelegueeMapper;
    private final BeneficiaireMapper beneficiaireMapper;
    private final DocumentMapper documentMapper;
    private final AvaMarcheMapper avaMarcheMapper;

    private final BusinessRulesService businessRulesService;
    private final ApiExterneService apiExterneService;
    private static final String STATUS_FINALIZED = "A";
    private static final String STATUS_PENDING = "X";
    

    @PersistenceContext
    private EntityManager entityManager;

    // ==================== CREATE ====================

    @Override
    @Transactional
    public OuvertureDossierDTO ValidationDossier(Integer numDossier) {

        log.info("ValidationDossier appelé pour numDossier={}", numDossier);

        if (numDossier == null) {
            throw new BusinessException("NUM_DOSSIER_REQUIS",
                    "Le numéro de dossier est requis pour cette opération");
        }

        final Short CODE_PRODUIT_SERVICE = 108;
        final Integer CODE_OPERATION = 200;


        // 1️⃣ Récupérer le MVT validé (status='V')
        OperationsDelegueesMvt operationOuv = mvtRepository
                .findByCodeProduitServiceAndCodeOperationInAndNumDossier(
                        CODE_PRODUIT_SERVICE,
                        List.of(CODE_OPERATION),
                        numDossier
                )
                .orElseThrow(() -> new BusinessException("MVT_NON_TROUVE", "Aucun mouvement MVT trouvé pour numDossier=" + numDossier));

        Long refOperation = operationOuv.getId().getRefOperation();

        // 2️⃣ Charger les relations MVT associées
        List<BeneficiairesMvt> benefsMvt =
                beneficiaireMvtRepository.findByIdRefOperation(refOperation);

        List<Document> docsMvt =
                documentRepository.findByRefOperation(refOperation);

        List<AvaMarcheMvt> marcheList =
                avaMarcheMvtRepository.findByIdRefOperation(refOperation.intValue());

        AvaMarcheMvt marcheMvt =
                (marcheList != null && !marcheList.isEmpty()) ? marcheList.get(0) : null;

        // 3️⃣ Mapper le MVT principal directement vers l'entité OperationsDeleguee (sans DTO intermédiaire)
        OperationsDeleguee toSaveOperationsDeleguee = operationsDelegueeMapper.fromMvt(operationOuv);

        toSaveOperationsDeleguee.setDernierNumMvtAva(operationOuv.getNumMvtAva());

        // 4️⃣ Calculer solde si nécessaire (sur l'entité)
        toSaveOperationsDeleguee.setSolde(businessRulesService.calculerSolde(
                toSaveOperationsDeleguee.getMntAutorise(),
                toSaveOperationsDeleguee.getMntAvance(),
                toSaveOperationsDeleguee.getMntAutoriseBct(),
                toSaveOperationsDeleguee.getMntUtilise(),
                toSaveOperationsDeleguee.getMntReserve(),
                toSaveOperationsDeleguee.getMntBlocage()
        ));
        toSaveOperationsDeleguee.setEtatDossier("V");

        // 5️⃣ Persister OperationsDeleguee (principal)
        OperationsDeleguee savedOperationsDeleguee;

        Integer id = toSaveOperationsDeleguee.getNumDossier();
        log.debug("Preparing to save OperationsDeleguee numDossier={}, existsInDb={}", id, id != null ? operationsDelegueeRepository.existsById(id) : null);
        if (id != null && operationsDelegueeRepository.existsById(id)) {
            // Si un dossier existe déjà, on ne doit pas le recréer depuis le MVT -> lever une BusinessException
            throw new BusinessException("DOSSIER_EXISTE", "Le dossier existe déjà pour numDossier=" + id);
        } else {
             // try to persist using EntityManager to avoid merge issues when id is assigned
             try {
                 // clear persistence context to avoid unexpected entity references
                 entityManager.clear();
                 log.debug("Persisting new OperationsDeleguee with numDossier={} via EntityManager.persist", id);
                 entityManager.persist(toSaveOperationsDeleguee);
                 entityManager.flush();
                 savedOperationsDeleguee = toSaveOperationsDeleguee;
             } catch (Exception e) {
                 log.error("Persist via EntityManager failed: {}", e.getMessage(), e);
                 throw new BusinessException("SAVE_OP_DELEGUEE_FAILED", "Impossible de sauvegarder l'opération déléguée via EntityManager: " + e.getMessage());
             }
         }

        log.info("OperationsDeleguee sauvegardée numDossier={}",
                savedOperationsDeleguee.getNumDossier());

        // =====================================================
        // 6️⃣ TRANSFORMATION + PERSIST DES RELATIONS
        // =====================================================

        // ---------- Beneficiaires (MVT -> Entité) ----------
        List<Beneficiaire> savedBeneficiaires = new ArrayList<>();

        if (benefsMvt != null && !benefsMvt.isEmpty()) {

            // convertir chaque BeneficiairesMvt -> Beneficiaire
            List<Beneficiaire> benefs = beneficiaireMapper.fromMvtList(benefsMvt);
            for (Beneficiaire b : benefs) {
                if (b.getId() == null) {
                    b.setId(new BeneficiaireId());
                }
                b.getId().setNumDossier(savedOperationsDeleguee.getNumDossier());
                b.getId().setDateDossier(savedOperationsDeleguee.getDateDossier());
                b.setOperationsDeleguee(savedOperationsDeleguee);
                // Par défaut, nouvel enregistrement bénéficiaire = actif ('A')
                b.setEtat("A");
            }
            savedBeneficiaires = beneficiaireRepository.saveAll(benefs);
        }

        // ---------- Documents (MVT -> Entité) ----------
        List<Document> savedDocuments = new ArrayList<>();

        if (docsMvt != null && !docsMvt.isEmpty()) {

            // docsMvt contient des entités Document mvt ou Document selon ton modèle :
            // on suppose que documentRepository.findByRefOperation retourne des Document (mêmes champs)
            for (Document d : docsMvt) {
                d.setOperationsDeleguee(savedOperationsDeleguee);
                d.setNumDossier(savedOperationsDeleguee.getNumDossier());
            }
            savedDocuments = documentRepository.saveAll(docsMvt);
        }

        // ---------- AvaMarche (OneToOne) (MVT -> Entité) ----------
        AvaMarche savedAvaMarche = null;

        if (marcheMvt != null) {

            AvaMarche marche = avaMarcheMapper.fromMvt(marcheMvt);
            marche.setOperationsDeleguee(savedOperationsDeleguee);
            marche.setNumDossier(savedOperationsDeleguee.getNumDossier());
            savedAvaMarche = avaMarcheRepository.save(marche);
        }

        // =====================================================
        // 7️⃣ Marquer le MVT comme traité
        // =====================================================
        // Après création/maj de l'opération déléguée, on met à jour le MVT pour refléter l'état 'V'
        operationOuv.setStatus("V");
        operationOuv.setEtatDossier("V");
        operationOuv.setDateValidation(now);
        mvtRepository.save(operationOuv);
        log.info("MVT refOperation={} marqué comme traité", refOperation);

        // =====================================================
        // 8️⃣ Construire le DTO résultat (depuis l'entité sauvegardée)
        // =====================================================
        // Construire un DTO minimal contenant uniquement les champs demandés
        OuvertureDossierDTO result = new OuvertureDossierDTO();
        result.setCodeAgenceAva(savedOperationsDeleguee.getCodeAgenceAva());
        result.setCodeTypeDosAva(savedOperationsDeleguee.getCodeTypeDosAva());
        result.setNumDossier(savedOperationsDeleguee.getNumDossier());
        result.setDateDossier(savedOperationsDeleguee.getDateDossier());
        result.setNumeroCompte(savedOperationsDeleguee.getNumeroCompte());
        result.setMntAvance(savedOperationsDeleguee.getMntAvance());
        result.setMntUtilise(savedOperationsDeleguee.getMntUtilise());
        result.setMntAutorise(savedOperationsDeleguee.getMntAutorise());
        result.setSolde(savedOperationsDeleguee.getSolde());
        result.setMntAutoriseBct(savedOperationsDeleguee.getMntAutoriseBct());
        result.setMntReserve(savedOperationsDeleguee.getMntReserve());
        result.setMntBlocage(savedOperationsDeleguee.getMntBlocage());
        result.setNoPieceClient(savedOperationsDeleguee.getNoPieceClient());
        result.setDateUltDeclCaf(savedOperationsDeleguee.getDateUltDeclCaf());
        result.setDeclarationFiscale(savedOperationsDeleguee.getDeclarationFiscale());
        result.setCodeActivite(savedOperationsDeleguee.getCodeActivite());
        result.setCodeSousActivite(savedOperationsDeleguee.getCodeSousActivite());
        // Ne pas renvoyer les listes (les mettre à null afin qu'elles ne soient pas sérialisées)
        result.setBeneficiaires(null);
        result.setDocuments(null);
        // Ne pas renvoyer le flag confirmationImportation dans la réponse
        result.setConfirmationImportation(null);

        log.info("ValidationDossier terminée avec succès pour numDossier={}", numDossier);
        return result;
    }

    // ==================== APPLY MVT TO DOSSIER (finalize) ====================

    @Override
    @Transactional
    public void applyMvtToDossier(Integer numDossier) {

        log.info("applyMvtToDossier appelé pour numDossier={}", numDossier);

        if (numDossier == null) {
            throw new BusinessException("NUM_DOSSIER_REQUIS",
                    "Le numéro de dossier est requis pour appliquer le mouvement");
        }

        final Short CODE_PRODUIT_SERVICE = 108;
        final Integer CODE_OPERATION = 200;

        // 1️⃣ Récupérer le MVT pour ce numDossier
        OperationsDelegueesMvt operationOuv = mvtRepository
                .findByCodeProduitServiceAndCodeOperationInAndNumDossier(
                        CODE_PRODUIT_SERVICE,
                        List.of(CODE_OPERATION),
                        numDossier
                )
                .orElseThrow(() -> new BusinessException("MVT_NON_TROUVE",
                        "Aucun mouvement MVT trouvé pour numDossier=" + numDossier));

        Long refOperation = operationOuv.getId().getRefOperation();

        // 2️⃣ Charger les relations MVT associées
        List<BeneficiairesMvt> benefsMvt = beneficiaireMvtRepository.findByIdRefOperation(refOperation);
        List<Document> docsMvt = documentRepository.findByRefOperation(refOperation);
        List<AvaMarcheMvt> marcheList = avaMarcheMvtRepository.findByIdRefOperation(refOperation.intValue());
        AvaMarcheMvt marcheMvt = (marcheList != null && !marcheList.isEmpty()) ? marcheList.get(0) : null;

        // 3️⃣ Mapper MVT → Dossier
        OperationsDeleguee dossier = operationsDelegueeMapper.fromMvt(operationOuv);
        dossier.setDernierNumMvtAva(operationOuv.getNumMvtAva());

        // ⚠️ IMPORTANT : Pour les opérations FV, il faut CUMULER mntUtilise
        // mntUtilise (nouveau) = mntUtilise (ancien) + mntMvtAva (du MVT actuel)
        BigDecimal mntMvtAva = operationOuv.getMntMvtAva() != null ? operationOuv.getMntMvtAva() : BigDecimal.ZERO;

        // Récupérer l'ancien mntUtilise (soit du dossier existant, soit 0 si nouveau)
        BigDecimal ancienMntUtilise = BigDecimal.ZERO;
        Optional<OperationsDeleguee> existingForUtilise = operationsDelegueeRepository.findById(numDossier);
        if (existingForUtilise.isPresent()) {
            ancienMntUtilise = existingForUtilise.get().getMntUtilise() != null ?
                existingForUtilise.get().getMntUtilise() : BigDecimal.ZERO;
        }

        // Cumuler le montant utilisé
        BigDecimal nouveauMntUtilise = ancienMntUtilise.add(mntMvtAva);
        dossier.setMntUtilise(nouveauMntUtilise);

        log.info("Mise à jour mntUtilise pour dossier {}: ancien={}, mvtAva={}, nouveau={}",
                numDossier, ancienMntUtilise, mntMvtAva, nouveauMntUtilise);

        // 4️⃣ Calculer solde APRÈS avoir mis à jour mntUtilise
        dossier.setSolde(businessRulesService.calculerSolde(
                dossier.getMntAutorise(),
                dossier.getMntAvance(),
                dossier.getMntAutoriseBct(),
                nouveauMntUtilise,  // ← Utiliser le nouveau montant
                dossier.getMntReserve(),
                dossier.getMntBlocage()
        ));
        dossier.setEtatDossier("V");

        // 5️⃣ Idempotence : vérifier si dossier existe déjà
        Integer dossierNumDossier = dossier.getNumDossier();
        OperationsDeleguee savedDossier;

        Optional<OperationsDeleguee> existingOpt = operationsDelegueeRepository.findByIdForUpdate(dossierNumDossier);

        if (existingOpt.isPresent()) {
            // Dossier existe → UPDATE (idempotent) avec lock acquis
            log.info("Dossier numDossier={} existe déjà, mise à jour (idempotent)", dossierNumDossier);
            OperationsDeleguee existing = existingOpt.get();
            operationsDelegueeMapper.updateFromMvt(operationOuv, existing);
            existing.setDernierNumMvtAva(operationOuv.getNumMvtAva());
            existing.setMntUtilise(nouveauMntUtilise);  // ← IMPORTANT : Mettre à jour mntUtilise
            existing.setSolde(dossier.getSolde());
            existing.setEtatDossier("V");
            savedDossier = operationsDelegueeRepository.save(existing);
        } else {
            // Dossier n'existe pas → INSERT
            log.info("Dossier numDossier={} n'existe pas, création", dossierNumDossier);
            try {
                entityManager.persist(dossier);
                entityManager.flush();
                savedDossier = dossier;
            } catch (Exception e) {
                log.error("Persist OperationsDeleguee failed numDossier={}: {}", dossierNumDossier, e.getMessage(), e);
                throw new BusinessException("SAVE_OP_DELEGUEE_FAILED",
                        "Impossible de sauvegarder le dossier: " + e.getMessage());
            }
        }

        log.info("Dossier sauvegardé numDossier={}", savedDossier.getNumDossier());

        // 6️⃣ Projeter les relations

        // ---------- Bénéficiaires (MVT → Entité) ----------
        if (benefsMvt != null && !benefsMvt.isEmpty()) {
            List<Beneficiaire> benefs = beneficiaireMapper.fromMvtList(benefsMvt);
            for (Beneficiaire b : benefs) {
                if (b.getId() == null) {
                    b.setId(new BeneficiaireId());
                }
                b.getId().setNumDossier(savedDossier.getNumDossier());
                b.getId().setDateDossier(savedDossier.getDateDossier());
                b.setOperationsDeleguee(savedDossier);
                b.setEtat("A");
            }
            beneficiaireRepository.saveAll(benefs);
        }

        // ---------- Documents ----------
        if (docsMvt != null && !docsMvt.isEmpty()) {
            for (Document d : docsMvt) {
                d.setOperationsDeleguee(savedDossier);
                d.setNumDossier(savedDossier.getNumDossier());
            }
            documentRepository.saveAll(docsMvt);
        }

        // ---------- AvaMarche (OneToOne) ----------
        if (marcheMvt != null) {
            AvaMarche marche = avaMarcheMapper.fromMvt(marcheMvt);
            marche.setOperationsDeleguee(savedDossier);
            marche.setNumDossier(savedDossier.getNumDossier());
            avaMarcheRepository.save(marche);
        }

        log.info("applyMvtToDossier terminé avec succès pour numDossier={}", numDossier);
    }

    /**
     * Applique un mouvement FV (Frais de Voyage) au dossier.
     * Cette méthode met à jour UNIQUEMENT mnt_utilise et solde, sans toucher aux autres champs.
     *
     * Logique FV :
     * - mnt_utilise (nouveau) = mnt_utilise (ancien) + mnt_mvt_ava
     * - solde (nouveau) = mnt_autorise + mnt_avance - mnt_utilise (nouveau)
     */
    @Override
    @Transactional
    public void applyFVToDossier(Integer numDossier, Long refOperation) {
        log.info("[applyFVToDossier] Début pour dossier={}, refOperation={}", numDossier, refOperation);

        if (numDossier == null || refOperation == null) {
            throw new BusinessException("PARAMS_REQUIS",
                    "Le numéro de dossier et la référence d'opération sont requis");
        }

        // 1. Charger le MVT FV
        LocalDate today = LocalDate.now();
        OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
        mvtId.setDateOperation(today);
        mvtId.setRefOperation(refOperation);

        OperationsDelegueesMvt mvtFV = mvtRepository.findById(mvtId)
                .orElseThrow(() -> new BusinessException("MVT_FV_NON_TROUVE",
                        "Mouvement FV non trouvé : refOperation=" + refOperation + ", date=" + today));

        // Vérifier que c'est bien un MVT validé
        if (!"V".equals(mvtFV.getStatus())) {
            throw new BusinessException("MVT_NON_VALIDE",
                    "Le mouvement FV doit avoir le status V pour être appliqué (status actuel=" + mvtFV.getStatus() + ")");
        }

        // 2. Charger le dossier avec lock pessimiste
        OperationsDeleguee dossier = operationsDelegueeRepository.findByIdForUpdate(numDossier)
                .orElseThrow(() -> new BusinessException("DOSSIER_NON_TROUVE",
                        "Dossier non trouvé : numDossier=" + numDossier));

        // 3. ✅ COPIER les valeurs calculées depuis le MVT vers le dossier
        // Le MVT a déjà calculé le bon solde et mntUtilise dans fillSnapshotFromDossier()
        BigDecimal ancienMntUtilise = dossier.getMntUtilise() != null ?
            dossier.getMntUtilise() : BigDecimal.ZERO;
        BigDecimal ancienSolde = dossier.getSolde() != null ?
            dossier.getSolde() : BigDecimal.ZERO;

        // Copier depuis le MVT (qui a déjà les bonnes valeurs calculées)
        BigDecimal nouveauMntUtilise = mvtFV.getMntUtilise();
        BigDecimal nouveauSolde = mvtFV.getSolde();

        dossier.setMntUtilise(nouveauMntUtilise);
        dossier.setSolde(nouveauSolde);

        log.info("[applyFVToDossier] Copie depuis MVT - mntUtilise : ancien={}, nouveau={}",
                ancienMntUtilise, nouveauMntUtilise);
        log.info("[applyFVToDossier] Copie depuis MVT - solde : ancien={}, nouveau={}",
                ancienSolde, nouveauSolde);

        // 4. Mettre à jour dernier_num_mvt_ava
        if (mvtFV.getNumMvtAva() != null) {
            dossier.setDernierNumMvtAva(mvtFV.getNumMvtAva());
        }

        // 5. Sauvegarder
        operationsDelegueeRepository.save(dossier);
        operationsDelegueeRepository.flush();

        log.info("[applyFVToDossier] ✅ Succès - Valeurs copiées depuis MVT vers dossier={}, mntUtilise={}, solde={}",
                numDossier, nouveauMntUtilise, nouveauSolde);
    }

    /**
     * Applique un mouvement RC (Rétrocession) au dossier.
     * Logique RC (inverse du FV) :
     * - mnt_utilise ↓ (diminue) = ancien - mnt_mvt_ava (plancher à 0)
     * - solde ↑ (augmente) = ancien + mnt_mvt_ava
     * - dernier_num_mvt_ava ↑ (incrémente)
     * Lock pessimiste sur le dossier.
     */
    @Override
    @Transactional
    public void applyRCToDossier(Integer numDossier, Long refOperation) {
        log.info("[applyRCToDossier] Début pour dossier={}, refOperation={}", numDossier, refOperation);

        if (numDossier == null || refOperation == null) {
            throw new BusinessException("PARAMS_REQUIS",
                    "Le numéro de dossier et la référence d'opération sont requis");
        }

        // 1. Charger le MVT RC
        LocalDate today = LocalDate.now();
        OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
        mvtId.setDateOperation(today);
        mvtId.setRefOperation(refOperation);

        OperationsDelegueesMvt mvtRC = mvtRepository.findById(mvtId)
                .orElseThrow(() -> new BusinessException("MVT_RC_NON_TROUVE",
                        "Mouvement RC non trouvé : refOperation=" + refOperation + ", date=" + today));

        // Vérifier que c'est bien un MVT validé
        if (!"V".equals(mvtRC.getStatus())) {
            throw new BusinessException("MVT_NON_VALIDE",
                    "Le mouvement RC doit avoir le status V pour être appliqué (status actuel=" + mvtRC.getStatus() + ")");
        }

        // 2. Charger le dossier avec lock pessimiste
        OperationsDeleguee dossier = operationsDelegueeRepository.findByIdForUpdate(numDossier)
                .orElseThrow(() -> new BusinessException("DOSSIER_NON_TROUVE",
                        "Dossier non trouvé : numDossier=" + numDossier));

        // 3. Copier les valeurs calculées depuis le MVT vers le dossier
        BigDecimal ancienMntUtilise = dossier.getMntUtilise() != null ?
            dossier.getMntUtilise() : BigDecimal.ZERO;
        BigDecimal ancienSolde = dossier.getSolde() != null ?
            dossier.getSolde() : BigDecimal.ZERO;

        BigDecimal nouveauMntUtilise = mvtRC.getMntUtilise();
        BigDecimal nouveauSolde = mvtRC.getSolde();

        dossier.setMntUtilise(nouveauMntUtilise);
        dossier.setSolde(nouveauSolde);

        log.info("[applyRCToDossier] Copie depuis MVT - mntUtilise : ancien={}, nouveau={}",
                ancienMntUtilise, nouveauMntUtilise);
        log.info("[applyRCToDossier] Copie depuis MVT - solde : ancien={}, nouveau={}",
                ancienSolde, nouveauSolde);

        // 4. Mettre à jour dernier_num_mvt_ava
        if (mvtRC.getNumMvtAva() != null) {
            dossier.setDernierNumMvtAva(mvtRC.getNumMvtAva());
        }

        // 5. Sauvegarder
        operationsDelegueeRepository.save(dossier);
        operationsDelegueeRepository.flush();

        log.info("[applyRCToDossier] ✅ Succès - Valeurs copiées depuis MVT vers dossier={}, mntUtilise={}, solde={}",
                numDossier, nouveauMntUtilise, nouveauSolde);
    }


    // ==================== READ ====================

    @Override
    @Transactional(readOnly = true)
    public List<OuvertureDossierDTO> findAll() {
        log.info("Récupération de toutes les opérations déléguées");
        return operationsDelegueeMapper.toDTOList(operationsDelegueeRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OuvertureDossierDTO> findById(Integer numDossier) {
        log.info("Recherche de l'opération déléguée avec numDossier: {}", numDossier);
        return operationsDelegueeRepository.findById(numDossier).map(operationsDelegueeMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OuvertureDossierDTO> findByIdWithRelations(Integer numDossier) {
        log.info("Recherche de l'opération déléguée avec relations. NumDossier: {}", numDossier);

        Optional<OperationsDeleguee> operationsDelegueeOpt = operationsDelegueeRepository.findById(numDossier);
        if (operationsDelegueeOpt.isEmpty()) {
            return Optional.empty();
        }

        OperationsDeleguee operationsDeleguee = operationsDelegueeOpt.get();
        OuvertureDossierDTO dto = operationsDelegueeMapper.toDTO(operationsDeleguee);

        Integer nd = operationsDeleguee.getNumDossier();
        if (nd == null) {
            // rien à charger
            return Optional.of(dto);
        }

        // 1) Beneficiaires (liste provenant de Beneficiaire)
        List<Beneficiaire> beneficiaires = beneficiaireRepository.findByIdNumDossier(nd);
        dto.setBeneficiaires(beneficiaireMapper.toDTOList(beneficiaires));

        // 2) Documents (par numDossier)
        List<Document> docs = documentRepository.findByNumDossier(nd);
        dto.setDocuments(documentMapper.toDTOList(docs));

        // 3) AvaMarche (one-to-one) - chargé en dernier
        avaMarcheRepository.findById(nd)
                .ifPresent(ava -> dto.setAvaMarche(avaMarcheMapper.toDTO(ava)));

        return Optional.of(dto);
    }

    /**
     * Récupère toutes les opérations déléguées et charge leurs relations (bénéficiaires, documents, AvaMarche).
     * Retourne une liste de DTOs `OuvertureDossierDTO` avec les listes de relations renseignées (même si vides).
     */
    @Transactional(readOnly = true)
    @Override
    public List<OuvertureDossierDTO> findAllWithRelations() {
        log.info("Récupération de toutes les opérations déléguées avec leurs relations");
        List<OperationsDeleguee> all = operationsDelegueeRepository.findAll();
        List<OuvertureDossierDTO> results = new ArrayList<>(all.size());

        for (OperationsDeleguee op : all) {
            OuvertureDossierDTO dto = operationsDelegueeMapper.toDTO(op);

            Integer numDossier = op.getNumDossier();
            // 1) Bénéficiaires
            List<Beneficiaire> benefEntities = beneficiaireRepository.findByIdNumDossier(numDossier != null ? numDossier : null);
            dto.setBeneficiaires(beneficiaireMapper.toDTOList(benefEntities));

            // 2) Documents
            dto.setDocuments(documentMapper.toDTOList(documentRepository.findByNumDossier(numDossier)));

            // 3) AvaMarche (OneToOne) - chargé en dernier pour respecter l'ordre demandé
            if (numDossier != null) {
                avaMarcheRepository.findById(numDossier)
                        .ifPresent(avaMarche -> dto.setAvaMarche(avaMarcheMapper.toDTO(avaMarche)));
            }


            results.add(dto);
        }

        log.info("Récupération terminée : {} opérations déléguées avec relations", results.size());
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OuvertureDossierDTO> findByCodeAgenceAva(Short codeAgenceAva) {
        log.info("Recherche des opérations déléguées par code agence AVA: {}", codeAgenceAva);
        return operationsDelegueeMapper.toDTOList(operationsDelegueeRepository.findByCodeAgenceAva(codeAgenceAva));
    }

    @Override
    @Transactional(readOnly = true)
    public List<OuvertureDossierDTO> findByEtatDossier(String etatDossier) {
        log.info("Recherche des opérations déléguées par état dossier: {}", etatDossier);
        return operationsDelegueeMapper.toDTOList(operationsDelegueeRepository.findByEtatDossier(etatDossier));
    }

    /**
     * Récupère les dossiers pour un matricule fiscal (noPieceClient) uniquement si l'état du dossier est 'V'
     */
    @Override
    @Transactional(readOnly = true)
    public List<OperationsDeleguee> findByMatriculeFiscaleValide(String noPieceClient) {
        log.info("Recherche des opérations déléguées valides (entité) pour matricule: {}", noPieceClient);
        if (noPieceClient == null || noPieceClient.trim().isEmpty()) {
            return List.of();
        }

        // Appel direct du repository pour retourner les entités
        return operationsDelegueeRepository.findByNoPieceClientAndEtatDossierAndCodeTypeDosAva(noPieceClient, "V" , 3);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DossierValideDTO> findDossiersValidesAvecNom() {
        log.info("Récupération des dossiers valides avec nom du client");

        List<OperationsDeleguee> dossiersValides = operationsDelegueeRepository.findByEtatDossier("V");
        List<DossierValideDTO> result = new ArrayList<>();

        for (OperationsDeleguee dossier : dossiersValides) {
            DossierValideDTO dto = new DossierValideDTO();
            dto.setCodeAgence(dossier.getCodeAgenceAva());
            dto.setTypeDossierAva(dossier.getCodeTypeDosAva());
            dto.setNumDossier(dossier.getNumDossier());
            dto.setDateDossier(dossier.getDateDossier());
            dto.setNoPieceClient(dossier.getNoPieceClient());

            // Appeler l'API pour obtenir le nom
            try {
                PersonneDTO personne = apiExterneService.getPersonneInfo(Integer.valueOf(dossier.getTypePieceClient()), dossier.getNoPieceClient());
                dto.setNomClient(personne != null ? personne.getNom() : null);
            } catch (Exception e) {
                log.warn("Erreur lors de la récupération du nom pour typePiece={}, noPiece={}: {}", dossier.getTypePieceClient(), dossier.getNoPieceClient(), e.getMessage());
                dto.setNomClient(null);
            }

            result.add(dto);
        }

        log.info("Récupéré {} dossiers valides avec nom", result.size());
        return result;
    }

    // ==================== UPDATE ====================

    @Override
    public OuvertureDossierDTO update(Integer numDossier, OuvertureDossierDTO dto) {
        log.info("Mise à jour de l'opération déléguée avec numDossier: {}", numDossier);

        OperationsDeleguee existingEntity = operationsDelegueeRepository.findById(numDossier)
                .orElseThrow(() -> new ResourceNotFoundException("Opération déléguée non trouvée avec numDossier: " + numDossier));

        List<String> alertes = new ArrayList<>();

        // 1) Contrôles obligatoires (toujours)
        runMandatoryControlsOnUpdate(dto);

        // 2) Contrôles conditionnels (seulement si champs modifiés)
        runConditionalControlsOnUpdate(dto, existingEntity);

        // 3) Contrôles avec alertes (toujours exécutés)
        runAlertControlsOnUpdate(dto, alertes);

        log.info("Contrôles de mise à jour optimisés terminés. Alertes: {}", alertes);

        // 4) Recalcul solde si montants financiers modifiés
        if (montantsFinanciersChanged(dto, existingEntity)) {
            log.debug("Recalcul du solde (montants financiers modifiés)");
            calculateAndSetSolde(dto);
            log.info("Solde recalculé: {}", dto.getSolde());
        } else {
            log.debug("Solde non recalculé (montants inchangés)");
        }

        // 5) Mise à jour entité
        operationsDelegueeMapper.updateEntityFromDTO(dto, existingEntity);
        OperationsDeleguee savedEntity = operationsDelegueeRepository.save(existingEntity);

        log.info("Opération déléguée mise à jour avec succès. NumDossier: {}", numDossier);

        // NOTE: on ne touche pas ici à AvaMarche (OneToOne) car ton code initial ne le gérait pas en update.
        // Si tu veux aussi le gérer en update, on l’ajoute en gardant exactement ta logique métier.

        return operationsDelegueeMapper.toDTO(savedEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(Integer numDossier) {
        return operationsDelegueeRepository.existsById(numDossier);
    }

    // =========================================================
    // ==================== PRIVATE HELPERS =====================
    // =========================================================

    private void runMandatoryControlsOnCreate(OuvertureDossierDTO dto) {

        log.debug("Contrôle 1: Type de dossier AVA");
        businessRulesService.controlerTypeDossier(dto.getCodeTypeDosAva() != null ? dto.getCodeTypeDosAva().intValue() : null);

        log.debug("Contrôle 2: Matricule fiscal");
        businessRulesService.controlerMatriculeFiscal(dto.getNoPieceClient());

        log.debug("Contrôle 3: Existence du client");
        businessRulesService.controlerPieceClientmatfisc(dto.getTypePieceClient(), dto.getNoPieceClient());

        // IMPORTANT : tu as supprimé controlerPieceClient, donc on utilise le nouveau contrôle
        log.debug("Contrôle 4: Dossiers incompatibles");
        businessRulesService.controlerCompatibiliteTypeDossier(dto.getNoPieceClient(), dto.getCodeTypeDosAva());

        log.debug("Contrôle 5: Agence AVA");
        if (dto.getNumeroCompte() != null) {
            businessRulesService.controlerAgenceAVA(dto.getNumeroCompte(), dto);
        }

        log.debug("Contrôle 6: Numéro de compte (RIB)");
        if (dto.getNumeroCompte() != null) {
            businessRulesService.controlerNumeroCompte(dto.getTypePieceClient(), dto.getNoPieceClient(), dto.getNumeroCompte());
        }

        log.debug("Contrôle 7: Code activité selon type dossier");
        if (dto.getCodeActivite() != null && dto.getCodeTypeDosAva() != null) {
            businessRulesService.validateActiviteTypeDossier(dto.getCodeTypeDosAva().intValue(), dto.getCodeActivite());
        }

        log.debug("Contrôle 8: Code sous-activité");
        Short codeTypeDos = dto.getCodeTypeDosAva();
        if (codeTypeDos != null && (codeTypeDos == 3 || codeTypeDos == 4 || codeTypeDos == 5)) {
            if (dto.getCodeSousActivite() == null) {
                throw new BusinessException(
                        "CODE_SOUS_ACTIVITE_OBLIGATOIRE",
                        "Code sous-activité obligatoire pour le type de dossier " + codeTypeDos
                );
            }
            businessRulesService.controlerCodeActiviteetSecondaire(dto.getCodeSousActivite(), Integer.valueOf(dto.getCodeTypeDosAva()));
        }

        log.debug("Contrôle 9: Autorisation BCT");
        businessRulesService.controlerAutorisationBct(dto.getNumeroBct(), dto.getDateBct());

        log.debug("Contrôle 10: Montants rapatriés");
        businessRulesService.controlerMontantsRapatries(
                dto.getCodeBanqueProvenance(),
                dto.getMntAutorise(),
                dto.getMntAvance(),
                dto.getMntAutoriseBct(),
                dto.getMntUtilise()
        );
    }

    private void runAlertControlsOnCreate(OuvertureDossierDTO dto, List<String> alertes) {

        log.debug("Contrôle 11: Montant importation");
        handleMontantImportationWithConfirmation(dto, alertes);

        log.debug("Contrôle 12: Déclaration fiscale");
        if (dto.getCodeTypeDosAva() != null && dto.getCodeTypeDosAva() == 3) {
            String resultatFiscal = businessRulesService.controlerDeclarationFiscale(
                    dto.getNoPieceClient(),
                    dto.getCodeActivite(),
                    dto.getCodeTypeDosAva(),
                    dto.getNumeroBct(),
                    dto.getTypePieceClient()
            );
            if (resultatFiscal != null && resultatFiscal.startsWith("ALERTE:")) {
                alertes.add(resultatFiscal);
                log.warn("Alerte déclaration fiscale: {}", resultatFiscal);
            }
        }
    }

    private void runMandatoryControlsOnUpdate(OuvertureDossierDTO dto) {
        log.debug("Contrôle 1: Type de dossier AVA");
        businessRulesService.controlerTypeDossier(dto.getCodeTypeDosAva() != null ? dto.getCodeTypeDosAva().intValue() : null);

        log.debug("Contrôle 2: Matricule fiscal");
        businessRulesService.controlerMatriculeFiscal(dto.getNoPieceClient());

        // Contrôles existence client + compatibilité supprimés en update (comme ton code)
        log.debug("Contrôles #3 et #4 ignorés en UPDATE (client déjà validé à la création)");
    }

    private void runConditionalControlsOnUpdate(OuvertureDossierDTO dto, OperationsDeleguee existingEntity) {

        // Agence AVA (ton code: exécuté si numeroCompte != null)
        log.debug("Contrôle 5: Agence AVA (champ modifié)");
        if (dto.getNumeroCompte() != null) {
            businessRulesService.controlerAgenceAVA(dto.getNumeroCompte(), dto);
        }

        // RIB seulement si changé
        boolean ribChange = changed(dto.getNumeroCompte(), existingEntity.getNumeroCompte());
        if (ribChange) {
            log.debug("Contrôle 6: Numéro de compte RIB (champ modifié)");
            if (dto.getNumeroCompte() != null) {
                businessRulesService.controlerNumeroCompte(dto.getTypePieceClient(), dto.getNoPieceClient(), dto.getNumeroCompte());
            }
        } else {
            log.debug("Contrôle 6: RIB ignoré (champ inchangé)");
        }

        // Activité si activité ou type dossier changés
        boolean activiteChange = changed(dto.getCodeActivite(), existingEntity.getCodeActivite())
                || changed(dto.getCodeTypeDosAva(), existingEntity.getCodeTypeDosAva());
        if (activiteChange) {
            log.debug("Contrôle 7: Code activité selon type dossier (champ modifié)");
            if (dto.getCodeActivite() != null && dto.getCodeTypeDosAva() != null) {
                businessRulesService.validateActiviteTypeDossier(dto.getCodeTypeDosAva().intValue(), dto.getCodeActivite());
            }
        } else {
            log.debug("Contrôle 7: Activité ignoré (champ inchangé)");
        }

        // Sous-activité si modifiée ou type dossier modifié (même condition que ton code : types 3 ou 5)
        boolean sousActiviteChange = changed(dto.getCodeSousActivite(), existingEntity.getCodeSousActivite())
                || changed(dto.getCodeTypeDosAva(), existingEntity.getCodeTypeDosAva());
        if (sousActiviteChange) {
            log.debug("Contrôle 8: Code sous-activité (champ modifié)");
            Short codeTypeDos = dto.getCodeTypeDosAva();
            if (codeTypeDos != null && (codeTypeDos == 3 || codeTypeDos == 5)) {
                if (dto.getCodeSousActivite() == null) {
                    throw new BusinessException(
                            "CODE_SOUS_ACTIVITE_OBLIGATOIRE",
                            "Code sous-activité obligatoire pour le type de dossier " + codeTypeDos
                    );
                }
                businessRulesService.controlerCodeActiviteetSecondaire(dto.getCodeSousActivite(), Integer.valueOf(dto.getCodeTypeDosAva()));
            }
        } else {
            log.debug("Contrôle 8: Sous-activité ignoré (champ inchangé)");
        }

        // Autorisation BCT si modifiée
        boolean bctChange = changed(dto.getNumeroBct(), existingEntity.getNumeroBct())
                || changed(dto.getDateBct(), existingEntity.getDateBct());
        if (bctChange) {
            log.debug("Contrôle 9: Autorisation BCT (champ modifié)");
            businessRulesService.controlerAutorisationBct(dto.getNumeroBct(), dto.getDateBct());
        } else {
            log.debug("Contrôle 9: BCT ignoré (champ inchangé)");
        }

        // Montants rapatriés si modifiés
        boolean montantsChange = changed(dto.getCodeBanqueProvenance(), existingEntity.getCodeBanqueProvenance())
                || changed(dto.getMntAutorise(), existingEntity.getMntAutorise())
                || changed(dto.getMntAvance(), existingEntity.getMntAvance())
                || changed(dto.getMntAutoriseBct(), existingEntity.getMntAutoriseBct())
                || changed(dto.getMntUtilise(), existingEntity.getMntUtilise());
        if (montantsChange) {
            log.debug("Contrôle 10: Montants rapatriés (champ modifié)");
            businessRulesService.controlerMontantsRapatries(
                    dto.getCodeBanqueProvenance() != null ? dto.getCodeBanqueProvenance().intValue() : null,
                    dto.getMntAutorise(),
                    dto.getMntAvance(),
                    dto.getMntAutoriseBct(),
                    dto.getMntUtilise()
            );
        } else {
            log.debug("Contrôle 10: Montants rapatriés ignorés (champs inchangés)");
        }
    }

    private void runAlertControlsOnUpdate(OuvertureDossierDTO dto, List<String> alertes) {

        log.debug("Contrôle 11: Montant importation");
        handleMontantImportationWithConfirmation(dto, alertes);

        // Déclaration fiscale: WARNING seulement en UPDATE (même comportement que ton code)
        log.debug("Contrôle 12: Déclaration fiscale (WARNING uniquement)");
        if (dto.getCodeTypeDosAva() != null && dto.getCodeTypeDosAva() == 3) {
            try {
                String resultatFiscal = businessRulesService.controlerDeclarationFiscale(
                        dto.getNoPieceClient(),
                        dto.getCodeActivite(),
                        dto.getCodeTypeDosAva(),
                        dto.getNumeroBct(),
                        dto.getTypePieceClient()
                );

                if (resultatFiscal != null && resultatFiscal.startsWith("ALERTE:")) {
                    alertes.add("WARNING (UPDATE): " + resultatFiscal);
                    log.warn("Alerte déclaration fiscale (UPDATE - non bloquante): {}", resultatFiscal);
                }
            } catch (BusinessException e) {
                alertes.add("WARNING: Déclaration fiscale - " + e.getMessage());
                log.warn("Alerte déclaration fiscale ignorée en UPDATE: {}", e.getMessage());
            }
        }
    }

    private void assertAvaMarcheMandatoryForType2(OuvertureDossierDTO dto) {
        if (dto.getCodeTypeDosAva() != null && dto.getCodeTypeDosAva() == 2) {
            if (dto.getAvaMarche() == null) {
                throw new BusinessException(
                        "AVA_MARCHE_OBLIGATOIRE",
                        "La liste des marchés AVA (avaMarcheListe) est obligatoire pour le type de dossier 2"
                );
            }
        }
    }

    private void handleMontantImportationWithConfirmation(OuvertureDossierDTO dto, List<String> alertes) {
        try {
            String resultatImportation = businessRulesService.controlerMontantImportation(
                    dto.getMntImportation(),
                    dto.getCodeActivite(),
                    dto.getCodeTypeDosAva(),
                    dto.getNumeroBct()
            );

            if (resultatImportation != null && resultatImportation.startsWith("ALERTE:")) {
                alertes.add(resultatImportation);
                log.warn("Alerte montant importation: {}", resultatImportation);
            }
        } catch (BusinessException e) {
            if (!Boolean.TRUE.equals(dto.getConfirmationImportation())) {
                throw e;
            }
            alertes.add("ALERTE CONFIRMEE: " + e.getMessage());
            log.warn("Alerte confirmée montant importation: {}", e.getMessage());
        }
    }

    private void calculateAndSetSolde(OuvertureDossierDTO dto) {
        BigDecimal soldeCalcule = businessRulesService.calculerSolde(
                dto.getMntAutorise(),
                dto.getMntAvance(),
                dto.getMntAutoriseBct(),
                dto.getMntUtilise(),
                dto.getMntReserve(),
                dto.getMntBlocage()
        );
        dto.setSolde(soldeCalcule);
    }

    private List<Beneficiaire> persistBeneficiaires(OuvertureDossierDTO dto, OperationsDeleguee savedOperationsDeleguee) {
        List<Beneficiaire> savedBeneficiaires = new ArrayList<>();

        if (dto.getBeneficiaires() == null || dto.getBeneficiaires().isEmpty()) {
            return savedBeneficiaires;
        }

        for (BeneficiaireDTO beneficiaireDTO : dto.getBeneficiaires()) {
            Beneficiaire beneficiaire = beneficiaireMapper.toEntity(beneficiaireDTO);

            BeneficiaireId beneficiaireId = new BeneficiaireId();
            beneficiaireId.setNumDossier(savedOperationsDeleguee.getNumDossier().intValue());
            beneficiaireId.setDateDossier(savedOperationsDeleguee.getDateDossier());
            beneficiaireId.setTypePieceBenef(beneficiaireDTO.getTypePieceBenef());
            beneficiaireId.setNoPieceBenef(beneficiaireDTO.getNoPieceBenef());
            beneficiaire.setId(beneficiaireId);

            beneficiaire.setOperationsDeleguee(savedOperationsDeleguee);


            savedBeneficiaires.add(beneficiaireRepository.save(beneficiaire));
        }

        log.debug("{} bénéficiaire(s) créé(s)", savedBeneficiaires.size());
        return savedBeneficiaires;
    }

    private List<Document> persistDocuments(OuvertureDossierDTO dto, OperationsDeleguee savedOperationsDeleguee) {
        List<Document> savedDocuments = new ArrayList<>();

        if (dto.getDocuments() == null || dto.getDocuments().isEmpty()) {
            return savedDocuments;
        }

        for (DocumentDTO documentDTO : dto.getDocuments()) {
            Document document = documentMapper.toEntity(documentDTO);
            document.setNumDossier(savedOperationsDeleguee.getNumDossier());
            document.setDateDossier(savedOperationsDeleguee.getDateDossier());
            document.setOperationsDeleguee(savedOperationsDeleguee);

            savedDocuments.add(documentRepository.save(document));
        }

        log.debug("{} document(s) créé(s)", savedDocuments.size());
        return savedDocuments;
    }

    /**
     * Persist AvaMarche (OneToOne).
     * IMPORTANT: propriétaire relation côté AvaMarche (mappedBy dans OperationsDeleguee).
     */
    private AvaMarche persistAvaMarche(OuvertureDossierDTO dto, OperationsDeleguee savedOperationsDeleguee) {

        AvaMarcheDTO avaMarcheDTO = dto.getAvaMarche();
        if (avaMarcheDTO == null) {
            return null;
        }

        AvaMarche avaMarche = avaMarcheMapper.toEntity(avaMarcheDTO);

        // Cohérence identifiants
        avaMarche.setNumDossier(savedOperationsDeleguee.getNumDossier().intValue());
        avaMarche.setDateDossier(savedOperationsDeleguee.getDateDossier());

        // Relation OneToOne (mappedBy="operationsDeleguee")
        avaMarche.setOperationsDeleguee(savedOperationsDeleguee);

        AvaMarche saved = avaMarcheRepository.save(avaMarche);
        log.debug("AvaMarche sauvegardé (OneToOne) pour NumDossier: {}", savedOperationsDeleguee.getNumDossier());
        return saved;
    }

    private boolean montantsFinanciersChanged(OuvertureDossierDTO dto, OperationsDeleguee existingEntity) {
        return changed(dto.getMntAutorise(), existingEntity.getMntAutorise())
                || changed(dto.getMntAvance(), existingEntity.getMntAvance())
                || changed(dto.getMntAutoriseBct(), existingEntity.getMntAutoriseBct())
                || changed(dto.getMntUtilise(), existingEntity.getMntUtilise())
                || changed(dto.getMntReserve(), existingEntity.getMntReserve())
                || changed(dto.getMntBlocage(), existingEntity.getMntBlocage());
    }

    private boolean changed(Object a, Object b) {
        return !Objects.equals(a, b);
    }

    // ==================== SUMMARY ====================

    @Override
    @Transactional(readOnly = true)
    public Optional<OperationsDelegueeSummaryDTO> findSummaryById(Integer numDossier) {
        log.info("Recherche du résumé de l'opération déléguée avec numDossier: {}", numDossier);
        return operationsDelegueeRepository.findById(numDossier).map(this::mapToSummaryDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OperationsDelegueeSummaryDTO> findSummaryWithBenefById(Integer numDossier) {
        log.info("Recherche du résumé de l'opération déléguée avec bénéficiaires actifs. numDossier: {}", numDossier);
        return operationsDelegueeRepository.findById(numDossier).map(entity -> {
            OperationsDelegueeSummaryDTO dto = mapToSummaryDTO(entity);

            // Charger et filtrer les bénéficiaires actifs
            List<BeneficiaireSummaryDTO> beneficiaires = beneficiaireRepository.findByIdNumDossier(numDossier)
                    .stream()
                    .filter(b -> "A".equals(b.getEtat()))
                    .map(b -> BeneficiaireSummaryDTO.builder()
                            .adresseBenef(b.getAdresseBenef())
                            .noPieceBenef(b.getId() != null ? b.getId().getNoPieceBenef() : null)
                            .nomBenef(b.getNomBenef())
                            .qualite(b.getQualite())
                            .typePieceBenef(b.getId() != null ? b.getId().getTypePieceBenef() : null)
                            .build())
                    .toList();

            dto.setBeneficiaires(beneficiaires);
            return dto;
        });
    }

    private OperationsDelegueeSummaryDTO mapToSummaryDTO(OperationsDeleguee entity) {
        OperationsDelegueeSummaryDTO dto = new OperationsDelegueeSummaryDTO();
        dto.setCodeTypeDosAva(entity.getCodeTypeDosAva());
        dto.setNumDossier(entity.getNumDossier());
        dto.setDateDossier(entity.getDateDossier());
        dto.setCodeAgenceAva(entity.getCodeAgenceAva());
        dto.setTypePieceClient(entity.getTypePieceClient());
        dto.setNoPieceClient(entity.getNoPieceClient());
        dto.setMntAvance(entity.getMntAvance());
        dto.setMntUtilise(entity.getMntUtilise());
        dto.setMntAutorise(entity.getMntAutorise());
        dto.setSolde(entity.getSolde());
        dto.setEcheance(entity.getEcheance());
        dto.setMntAutorisationBct(entity.getMntAutoriseBct());
        dto.setMntReserve(entity.getMntReserve());
        dto.setMntBlocage(entity.getMntBlocage());
        return dto;
    }
     @Override
    @Transactional
    public OuvertureDossierDTO suspensionDossier(SuspensionDTO dto) {
        return suspensionDossier(dto, true);
    }

    @Override
    @Transactional
    public OuvertureDossierDTO suspensionDossier(SuspensionDTO dto, boolean finalizeFlag) {
        log.info("Suspension de l'opération déléguée avec numDossier: {}, finalize: {}", dto.getNumDossier(), finalizeFlag);

        // 1) Vérification que le dossier existe
        OperationsDeleguee operationsDeleguee = operationsDelegueeRepository.findById(dto.getNumDossier().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Opération déléguée non trouvée avec numDossier: " + dto.getNumDossier()));

        // ===== Contrôles de saisie (appliqués quel que soit finalize) =====

        // 2) Vérification que l'état du dossier est 'V' (validé)
        if (!"V".equals(operationsDeleguee.getEtatDossier())) {
            throw new BusinessException("Le dossier n'est pas validé. État actuel: " + operationsDeleguee.getEtatDossier());
        }

        // 3) Validation du codeEtat (valeurs autorisées: 1, 2, 3, 4, 99)
        if (dto.getCodeEtat() == null || !(dto.getCodeEtat() == 1 || dto.getCodeEtat() == 2 || 
                dto.getCodeEtat() == 3 || dto.getCodeEtat() == 4 || dto.getCodeEtat() == 99)) {
            throw new BusinessException("Code d'état invalide. Valeurs autorisées: " +
                    "1 (DEPASSEMENT DU MONTANT AUTORISE), " +
                    "2 (DECLARATION FISCALE NON PRESENTEE), " +
                    "3 (TOTAL IMPORTATIONS INSUFFISANT), " +
                    "4 (DOSSIER NON RENOUVELE), " +
                    "99 (AUTRE MOTIF)");
        }

        // 4) Validation du motifEtat si codeEtat = 99
        if (dto.getCodeEtat() == 99 && (dto.getMotifEtat() == null || dto.getMotifEtat().trim().isEmpty())) {
            throw new BusinessException("Le motif d'état est obligatoire lorsque le code d'état est 99 (AUTRE MOTIF)");
        }

        if (finalizeFlag) {
            // ===== FINALIZE == TRUE : logique complète =====

            // 5) Mise à jour de l'opération déléguée
            operationsDeleguee.setEtatDossier("B"); // Bloqué
            operationsDeleguee.setCodeEtat(dto.getCodeEtat());
            operationsDeleguee.setMotifEtat(dto.getMotifEtat());
            operationsDeleguee.setDateEtat(LocalDate.now());

            OperationsDeleguee savedOperationsDeleguee = operationsDelegueeRepository.save(operationsDeleguee);
            log.debug("Opération déléguée suspendue avec ID: {}", savedOperationsDeleguee.getNumDossier());

            // 6) Création du mouvement avec status='A'
            createSuspensionMovement(savedOperationsDeleguee, STATUS_FINALIZED);

            // 7) Construction du résultat
            OuvertureDossierDTO resultDTO = buildSuspensionResultDTO(savedOperationsDeleguee);
            log.info("Opération déléguée suspendue avec succès. NumDossier: {}", resultDTO.getNumDossier());
            return resultDTO;

        } else {
            // ===== FINALIZE == FALSE : MVT seul =====

            // Création du mouvement sans modifier l'entité
            createSuspensionMovement(operationsDeleguee, STATUS_PENDING);

            // Retour minimal
            OuvertureDossierDTO resultDTO = new OuvertureDossierDTO();
            resultDTO.setNumDossier(operationsDeleguee.getNumDossier());
            resultDTO.setEtatDossier(operationsDeleguee.getEtatDossier());
            log.info("MVT suspension créé (finalize=false). NumDossier: {}", resultDTO.getNumDossier());
            return resultDTO;
        }
    }

    @Override
    @Transactional
    public OuvertureDossierDTO leveeSuspensionDossier(LeveeSuspensionDTO dto) {
        return leveeSuspensionDossier(dto, true);
    }

    @Override
    @Transactional
    public OuvertureDossierDTO leveeSuspensionDossier(LeveeSuspensionDTO dto, boolean finalizeFlag) {
        log.info("Levée de suspension de l'opération déléguée avec numDossier: {}, finalize: {}", dto.getNumDossier(), finalizeFlag);

        // 1) Vérification que le dossier existe
        OperationsDeleguee operationsDeleguee = operationsDelegueeRepository.findById(dto.getNumDossier().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Opération déléguée non trouvée avec numDossier: " + dto.getNumDossier()));

        // ===== Contrôles de saisie (appliqués quel que soit finalize) =====

        // 2) Vérification que l'état du dossier est 'B' (suspendu)
        if (!"B".equals(operationsDeleguee.getEtatDossier())) {
            throw new BusinessException("Le dossier n'est pas suspendu. État actuel: " + operationsDeleguee.getEtatDossier());
        }

        // 3) Vérification conditionnelle: si codeEtat était 1 (DEPASSEMENT DU MONTANT AUTORISE),
        //    alors numBct et dateBct sont obligatoires
        Short codeEtatAvantLevee = operationsDeleguee.getCodeEtat();
        if (codeEtatAvantLevee != null && codeEtatAvantLevee == 1) {
            if (dto.getNumBct() == null || dto.getNumBct().trim().isEmpty()) {
                throw new BusinessException("NUM_BCT_REQUIS",
                        "Le numéro BCT est obligatoire pour la levée de suspension d'un dossier avec code état 1 (DEPASSEMENT DU MONTANT AUTORISE)");
            }
            if (dto.getDateBct() == null) {
                throw new BusinessException("DATE_BCT_REQUISE",
                        "La date BCT est obligatoire pour la levée de suspension d'un dossier avec code état 1 (DEPASSEMENT DU MONTANT AUTORISE)");
            }
            // Validation du format numBct (doit être numérique)
            try {
                Integer.parseInt(dto.getNumBct());
            } catch (NumberFormatException e) {
                throw new BusinessException("NUM_BCT_INVALIDE",
                        "Le numéro BCT doit être un nombre entier valide: " + dto.getNumBct());
            }
        }

        if (finalizeFlag) {
            // ===== FINALIZE == TRUE : logique complète =====

            // Mise à jour BCT si codeEtat était 1
            if (codeEtatAvantLevee != null && codeEtatAvantLevee == 1) {
                operationsDeleguee.setNumeroBct(Integer.parseInt(dto.getNumBct()));
                operationsDeleguee.setDateBct(dto.getDateBct());
                log.info("Mise à jour BCT pour levée suspension - numBct: {}, dateBct: {}", dto.getNumBct(), dto.getDateBct());
            }

            // 4) Mise à jour de l'opération déléguée
            operationsDeleguee.setEtatDossier("V"); // Validé
            operationsDeleguee.setCodeEtat(null);
            operationsDeleguee.setMotifEtat(dto.getMotifEtat()); // Stockage du motif de levée
            operationsDeleguee.setDateEtat(LocalDate.now());

            OperationsDeleguee savedOperationsDeleguee = operationsDelegueeRepository.save(operationsDeleguee);
            log.debug("Levée de suspension appliquée avec ID: {}", savedOperationsDeleguee.getNumDossier());

            // 5) Création du mouvement avec status='A'
            createLeveeSuspensionMovement(savedOperationsDeleguee, STATUS_FINALIZED);

            // 6) Construction du résultat
            OuvertureDossierDTO resultDTO = buildSuspensionResultDTO(savedOperationsDeleguee);
            log.info("Levée de suspension appliquée avec succès. NumDossier: {}", resultDTO.getNumDossier());
            return resultDTO;

        } else {
            // ===== FINALIZE == FALSE : MVT seul =====

            // Création du mouvement sans modifier l'entité
            createLeveeSuspensionMovement(operationsDeleguee, STATUS_PENDING);

            // Retour minimal
            OuvertureDossierDTO resultDTO = new OuvertureDossierDTO();
            resultDTO.setNumDossier(operationsDeleguee.getNumDossier());
            resultDTO.setEtatDossier(operationsDeleguee.getEtatDossier());
            log.info("MVT levée suspension créé (finalize=false). NumDossier: {}", resultDTO.getNumDossier());
            return resultDTO;
        }
    }

    @Override
    @Transactional
    public OuvertureDossierDTO alimentationSuiteAccordBct(Integer numDossier, AutorisationBctDTO dto) {
        return alimentationSuiteAccordBct(numDossier, dto, true);
    }

    @Override
    @Transactional
    public OuvertureDossierDTO alimentationSuiteAccordBct(Integer numDossier, AutorisationBctDTO dto, boolean finalizeFlag) {
        log.info("Alimentation suite accord BCT pour numDossier: {} avec numeroBct: {}, finalize: {}", numDossier, dto.getNumeroBct(), finalizeFlag);

        // 1) Vérification que le dossier existe
        OperationsDeleguee operationsDeleguee = operationsDelegueeRepository.findById(numDossier)
                .orElseThrow(() -> new ResourceNotFoundException("Opération déléguée non trouvée avec numDossier: " + numDossier));

        // Calcul du nouveau montant d'autorisation BCT (nécessaire pour le MVT dans les deux cas)
        BigDecimal currentMntAutoriseBct = operationsDeleguee.getMntAutoriseBct() != null ? operationsDeleguee.getMntAutoriseBct() : BigDecimal.ZERO;
        BigDecimal newMntAutoriseBct = currentMntAutoriseBct.add(dto.getMntMvtAva());

        // ===== Contrôles de saisie (appliqués quel que soit finalize) =====

        // 2) Vérification que l'état du dossier est 'V' (validé)
        if (!"V".equals(operationsDeleguee.getEtatDossier())) {
            throw new BusinessException("Le dossier n'est pas validé. État actuel: " + operationsDeleguee.getEtatDossier());
        }

        if (finalizeFlag) {
            // ===== FINALIZE == TRUE : logique complète =====

            // 3) Mise à jour de l'opération déléguée
            operationsDeleguee.setNumeroBct(dto.getNumeroBct());
            operationsDeleguee.setDateBct(dto.getDateBct());
            operationsDeleguee.setMntAutoriseBct(newMntAutoriseBct);

            OperationsDeleguee savedOperationsDeleguee = operationsDelegueeRepository.save(operationsDeleguee);
            log.debug("Opération déléguée mise à jour avec alimentation BCT - ID: {}", savedOperationsDeleguee.getNumDossier());

            // 4) Création du mouvement avec status='A'
            createAlimentationBctMovement(savedOperationsDeleguee, dto, newMntAutoriseBct, STATUS_FINALIZED);

            // 5) Construction du résultat
            OuvertureDossierDTO resultDTO = buildSuspensionResultDTO(savedOperationsDeleguee);
            log.info("Alimentation suite accord BCT appliquée avec succès. NumDossier: {}", resultDTO.getNumDossier());
            return resultDTO;

        } else {
            // ===== FINALIZE == FALSE : MVT seul =====

            // Création du mouvement sans modifier l'entité
            createAlimentationBctMovement(operationsDeleguee, dto, newMntAutoriseBct, STATUS_PENDING);

            // Retour minimal
            OuvertureDossierDTO resultDTO = new OuvertureDossierDTO();
            resultDTO.setNumDossier(operationsDeleguee.getNumDossier());
            resultDTO.setEtatDossier(operationsDeleguee.getEtatDossier());
            log.info("MVT alimentation BCT créé (finalize=false). NumDossier: {}", resultDTO.getNumDossier());
            return resultDTO;
        }
    }
       // ==================== PRIVATE HELPERS FOR SUSPENSION ====================

    private OuvertureDossierDTO buildSuspensionResultDTO(OperationsDeleguee operationsDeleguee) {
        OuvertureDossierDTO dto = new OuvertureDossierDTO();
        dto.setNumDossier(operationsDeleguee.getNumDossier());
        dto.setCodeTypeDosAva(operationsDeleguee.getCodeTypeDosAva());
        dto.setDateDossier(operationsDeleguee.getDateDossier());
        dto.setCodeAgenceAva(operationsDeleguee.getCodeAgenceAva());
        dto.setTypePieceClient(operationsDeleguee.getTypePieceClient() != null ? operationsDeleguee.getTypePieceClient().intValue() : null);
        dto.setNoPieceClient(operationsDeleguee.getNoPieceClient());
        dto.setNumeroCompte(operationsDeleguee.getNumeroCompte());
        dto.setTel(operationsDeleguee.getTel());
        dto.setCodeActivite(operationsDeleguee.getCodeActivite());
        dto.setCodeSousActivite(operationsDeleguee.getCodeSousActivite());
        dto.setDeclarationFiscale(operationsDeleguee.getDeclarationFiscale());
        dto.setDateUltDeclCaf(operationsDeleguee.getDateUltDeclCaf());
        dto.setCodeBanqueProvenance(operationsDeleguee.getCodeBanqueProvenance());
        dto.setMntAvance(operationsDeleguee.getMntAvance());
        dto.setMntUtilise(operationsDeleguee.getMntUtilise());
        dto.setMntAutorise(operationsDeleguee.getMntAutorise());
        dto.setMntAutoriseBct(operationsDeleguee.getMntAutoriseBct());
        dto.setMntReserve(operationsDeleguee.getMntReserve());
        dto.setMntBlocage(operationsDeleguee.getMntBlocage());
        dto.setSolde(operationsDeleguee.getSolde());
        dto.setMntCa(operationsDeleguee.getMntCa());
        dto.setMntCaFiscal(operationsDeleguee.getMntCaFiscal());
        dto.setMntImportation(operationsDeleguee.getMntImportation());
        dto.setNumeroBct(operationsDeleguee.getNumeroBct());
        dto.setDateBct(operationsDeleguee.getDateBct());
        dto.setEcheance(operationsDeleguee.getEcheance());
        dto.setAnnee(operationsDeleguee.getAnnee());
        dto.setDernierNumMvtAva(operationsDeleguee.getDernierNumMvtAva());
        dto.setEtatDossier(operationsDeleguee.getEtatDossier());
        dto.setCodeEtat(operationsDeleguee.getCodeEtat());
        dto.setDateEtat(operationsDeleguee.getDateEtat());
        dto.setMotifEtat(operationsDeleguee.getMotifEtat());
        return dto;
    }

    private void createSuspensionMovement(OperationsDeleguee operationsDeleguee, String status) {
        log.info("Création du mouvement de suspension pour numDossier: {}, status: {}", operationsDeleguee.getNumDossier(), status);

        // Générer le refOperation et dateOperation
        Long refOperation = operationsDelegueeMvtRepository.getNextRefOperation();
        LocalDate dateOperation = LocalDate.now();

        // Créer l'ID du mouvement
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(dateOperation);

        // Créer l'entité mouvement
        OperationsDelegueesMvt mouvement = new OperationsDelegueesMvt();
        mouvement.setId(id);

        // Copier les données de l'opération déléguée
        mouvement.setCodeProduitService((short) 108);
        mouvement.setCodeOperation(9021); // Code for suspension
        mouvement.setCodeTypeDosAva(operationsDeleguee.getCodeTypeDosAva());
        mouvement.setNumDossier(operationsDeleguee.getNumDossier());
        mouvement.setDateDossier(operationsDeleguee.getDateDossier());
        mouvement.setCodeAgenceAva(operationsDeleguee.getCodeAgenceAva());
        mouvement.setTypePieceClient(operationsDeleguee.getTypePieceClient() != null ? operationsDeleguee.getTypePieceClient().intValue() : null);
        mouvement.setNoPieceClient(operationsDeleguee.getNoPieceClient());
        mouvement.setNumeroCompte(operationsDeleguee.getNumeroCompte());
        mouvement.setTel(operationsDeleguee.getTel());
        mouvement.setCodeActivite(operationsDeleguee.getCodeActivite());
        mouvement.setCodeSousActivite(operationsDeleguee.getCodeSousActivite());
        mouvement.setDeclarationFiscale(operationsDeleguee.getDeclarationFiscale());
        mouvement.setDateUltDeclCaf(operationsDeleguee.getDateUltDeclCaf());
        mouvement.setCodeBanqueProvenance(operationsDeleguee.getCodeBanqueProvenance());
        mouvement.setMntAvance(operationsDeleguee.getMntAvance());
        mouvement.setMntUtilise(operationsDeleguee.getMntUtilise());
        mouvement.setSolde(operationsDeleguee.getSolde());
        mouvement.setMntCa(operationsDeleguee.getMntCa());
        mouvement.setMntCaFiscal(operationsDeleguee.getMntCaFiscal());
        mouvement.setMntImportation(operationsDeleguee.getMntImportation());
        mouvement.setNumeroBct(operationsDeleguee.getNumeroBct());
        mouvement.setDateBct(operationsDeleguee.getDateBct());
        mouvement.setEcheance(operationsDeleguee.getEcheance());
        mouvement.setAnnee(operationsDeleguee.getAnnee());
        mouvement.setNumMvtAva(operationsDeleguee.getDernierNumMvtAva());
        mouvement.setEtatDossier(operationsDeleguee.getEtatDossier());
        mouvement.setCodeEtat(operationsDeleguee.getCodeEtat());
        mouvement.setDateEtat(operationsDeleguee.getDateEtat());
        mouvement.setMotifEtat(operationsDeleguee.getMotifEtat());
        mouvement.setStatus(status); 
        mouvement.setDateValidation(dateOperation);
        mouvement.setMntAutoriseBct(operationsDeleguee.getMntAutoriseBct());
        mouvement.setMntBlocage(operationsDeleguee.getMntBlocage());
        mouvement.setMntReserve(operationsDeleguee.getMntReserve());
        mouvement.setMntAutorise(operationsDeleguee.getMntAutorise());

        // Sauvegarder le mouvement
        operationsDelegueeMvtRepository.save(mouvement);
        log.debug("Mouvement de suspension créé avec refOperation: {}", refOperation);
    }

    private void createLeveeSuspensionMovement(OperationsDeleguee operationsDeleguee, String status) {
        log.info("Création du mouvement de levée de suspension pour numDossier: {}, status: {}", operationsDeleguee.getNumDossier(), status);

        // Générer le refOperation et dateOperation
        Long refOperation = operationsDelegueeMvtRepository.getNextRefOperation();
        LocalDate dateOperation = LocalDate.now();

        // Créer l'ID du mouvement
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(dateOperation);

        // Créer l'entité mouvement
        OperationsDelegueesMvt mouvement = new OperationsDelegueesMvt();
        mouvement.setId(id);

        // Copier les données de l'opération déléguée
        mouvement.setCodeProduitService((short) 108); // Always 108
        mouvement.setCodeOperation(221); // Code for levée de suspension
        mouvement.setCodeTypeDosAva(operationsDeleguee.getCodeTypeDosAva());
        mouvement.setNumDossier(operationsDeleguee.getNumDossier());
        mouvement.setDateDossier(operationsDeleguee.getDateDossier());
        mouvement.setCodeAgenceAva(operationsDeleguee.getCodeAgenceAva());
        mouvement.setTypePieceClient(operationsDeleguee.getTypePieceClient() != null ? operationsDeleguee.getTypePieceClient().intValue() : null);
        mouvement.setNoPieceClient(operationsDeleguee.getNoPieceClient());
        mouvement.setNumeroCompte(operationsDeleguee.getNumeroCompte());
        mouvement.setTel(operationsDeleguee.getTel());
        mouvement.setCodeActivite(operationsDeleguee.getCodeActivite());
        mouvement.setCodeSousActivite(operationsDeleguee.getCodeSousActivite());
        mouvement.setDeclarationFiscale(operationsDeleguee.getDeclarationFiscale());
        mouvement.setDateUltDeclCaf(operationsDeleguee.getDateUltDeclCaf());
        mouvement.setCodeBanqueProvenance(operationsDeleguee.getCodeBanqueProvenance());
        mouvement.setMntAvance(operationsDeleguee.getMntAvance());
        mouvement.setMntUtilise(operationsDeleguee.getMntUtilise());
        mouvement.setSolde(operationsDeleguee.getSolde());
        mouvement.setMntCa(operationsDeleguee.getMntCa());
        mouvement.setMntCaFiscal(operationsDeleguee.getMntCaFiscal());
        mouvement.setMntImportation(operationsDeleguee.getMntImportation());
        mouvement.setNumeroBct(operationsDeleguee.getNumeroBct());
        mouvement.setDateBct(operationsDeleguee.getDateBct());
        mouvement.setEcheance(operationsDeleguee.getEcheance());
        mouvement.setAnnee(operationsDeleguee.getAnnee());
        mouvement.setNumMvtAva(operationsDeleguee.getDernierNumMvtAva());
        mouvement.setEtatDossier(operationsDeleguee.getEtatDossier());
        mouvement.setCodeEtat(operationsDeleguee.getCodeEtat());
        mouvement.setDateEtat(operationsDeleguee.getDateEtat());
        mouvement.setMotifEtat(operationsDeleguee.getMotifEtat());
        mouvement.setStatus(status); // Status pour levée de suspension
        mouvement.setDateValidation(dateOperation);
        mouvement.setMntAutoriseBct(operationsDeleguee.getMntAutoriseBct());
        mouvement.setMntBlocage(operationsDeleguee.getMntBlocage());
        mouvement.setMntReserve(operationsDeleguee.getMntReserve());
        mouvement.setMntAutorise(operationsDeleguee.getMntAutorise());

        // Sauvegarder le mouvement
        operationsDelegueeMvtRepository.save(mouvement);
        log.debug("Mouvement de levée de suspension créé avec refOperation: {}", refOperation);
    }

    private void createAlimentationBctMovement(OperationsDeleguee operationsDeleguee, AutorisationBctDTO dto, BigDecimal newMntAutoriseBct, String status) {
        log.info("Création du mouvement d'alimentation BCT pour numDossier: {}, status: {}", operationsDeleguee.getNumDossier(), status);

        // Générer le refOperation et dateOperation
        Long refOperation = operationsDelegueeMvtRepository.getNextRefOperation();
        LocalDate dateOperation = LocalDate.now();

        // Créer l'ID du mouvement
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(dateOperation);

        // Créer l'entité mouvement
        OperationsDelegueesMvt mouvement = new OperationsDelegueesMvt();
        mouvement.setId(id);

        // Copier les données de l'opération déléguée
        mouvement.setCodeProduitService((short) 1); // À adapter selon les besoins
        mouvement.setCodeOperation(5); // Code pour alimentation BCT
        mouvement.setCodeTypeDosAva(operationsDeleguee.getCodeTypeDosAva());
        mouvement.setNumDossier(operationsDeleguee.getNumDossier());
        mouvement.setDateDossier(operationsDeleguee.getDateDossier());
        mouvement.setCodeAgenceAva(operationsDeleguee.getCodeAgenceAva());
        mouvement.setTypePieceClient(operationsDeleguee.getTypePieceClient() != null ? operationsDeleguee.getTypePieceClient().intValue() : null);
        mouvement.setNoPieceClient(operationsDeleguee.getNoPieceClient());
        mouvement.setNumeroCompte(operationsDeleguee.getNumeroCompte());
        mouvement.setTel(operationsDeleguee.getTel());
        mouvement.setCodeActivite(operationsDeleguee.getCodeActivite());
        mouvement.setCodeSousActivite(operationsDeleguee.getCodeSousActivite());
        mouvement.setDeclarationFiscale(operationsDeleguee.getDeclarationFiscale());
        mouvement.setDateUltDeclCaf(operationsDeleguee.getDateUltDeclCaf());
        mouvement.setCodeBanqueProvenance(operationsDeleguee.getCodeBanqueProvenance());
        mouvement.setMntAvance(operationsDeleguee.getMntAvance());
        mouvement.setMntMvtAva(dto.getMntMvtAva()); // Montant du mouvement AVA depuis l'input
        mouvement.setMntUtilise(operationsDeleguee.getMntUtilise());
        mouvement.setSolde(operationsDeleguee.getSolde());
        mouvement.setMntCa(operationsDeleguee.getMntCa());
        mouvement.setMntCaFiscal(operationsDeleguee.getMntCaFiscal());
        mouvement.setMntImportation(operationsDeleguee.getMntImportation());
        mouvement.setNumeroBct(dto.getNumeroBct()); // Depuis l'input
        mouvement.setDateBct(dto.getDateBct()); // Depuis l'input
        mouvement.setEcheance(operationsDeleguee.getEcheance());
        mouvement.setAnnee(operationsDeleguee.getAnnee());
        mouvement.setNumMvtAva(operationsDeleguee.getDernierNumMvtAva());
        mouvement.setEtatDossier(operationsDeleguee.getEtatDossier());
        mouvement.setCodeEtat(operationsDeleguee.getCodeEtat());
        mouvement.setDateEtat(operationsDeleguee.getDateEtat());
        mouvement.setMotifEtat(operationsDeleguee.getMotifEtat());
        mouvement.setStatus(status); // Status pour alimentation BCT
        mouvement.setDateValidation(dateOperation); // Date du mouvement AVA = sysdate
        mouvement.setMntAutoriseBct(newMntAutoriseBct); // Montant d'autorisation BCT mis à jour
        mouvement.setMntBlocage(operationsDeleguee.getMntBlocage());
        mouvement.setMntReserve(operationsDeleguee.getMntReserve());
        mouvement.setMntAutorise(operationsDeleguee.getMntAutorise());

        // Sauvegarder le mouvement
        operationsDelegueeMvtRepository.save(mouvement);
        log.debug("Mouvement d'alimentation BCT créé avec refOperation: {}", refOperation);
    }
        @Override
    @Transactional(readOnly = true)
    public Optional<IbansysPoc.AVA.DTO.SuspensionDataDTO> getSuspensionData(Integer numDossier) {
        log.info("Récupération des données de suspension pour numDossier: {}", numDossier);
        
        if (numDossier == null) {
            throw new BusinessException("NUM_DOSSIER_REQUIS", "Le numéro de dossier est requis");
        }

        OperationsDeleguee operationsDeleguee = operationsDelegueeRepository.findById(numDossier)
                .orElseThrow(() -> new ResourceNotFoundException("Dossier non trouvé avec numDossier: " + numDossier));
        
        // Vérifier que l'état du dossier est 'B' (suspendu/bloqué)
        if (!"B".equals(operationsDeleguee.getEtatDossier())) {
            log.warn("Le dossier {} n'est pas en état suspendu (B), état actuel: {}", 
                    numDossier, operationsDeleguee.getEtatDossier());
            throw new BusinessException("DOSSIER_NON_SUSPENDU", 
                    "Le dossier " + numDossier + " n'est pas suspendu. État actuel: " + operationsDeleguee.getEtatDossier());
        }
        
        // Mapper le code d'état vers le motif descriptif
        String motif = mapCodeEtatToMotif(operationsDeleguee.getCodeEtat());
        
        IbansysPoc.AVA.DTO.SuspensionDataDTO dto = new IbansysPoc.AVA.DTO.SuspensionDataDTO(
                operationsDeleguee.getDateEtat(),
                motif
        );
        
        log.info("Données de suspension récupérées pour dossier {}: dateEtat={}, motif={}", 
                numDossier, dto.getDateEtat(), dto.getMotif());
        
        return Optional.of(dto);
    }
     /**
     * Mappe le code d'état vers un motif descriptif.
     * @param codeEtat Le code d'état (1, 2, 3, 4, 99)
     * @return Le motif descriptif
     */
    private String mapCodeEtatToMotif(Short codeEtat) {
        if (codeEtat == null) {
            return "AUTRE MOTIF";
        }
        
        return switch (codeEtat) {
            case 1 -> "DEPASSEMENT DU MONTANT AUTORISE";
            case 2 -> "DECLARATION FISCALE NON PRESENTEE";
            case 3 -> "TOTAL IMPORTATIONS INSUFFISANT";
            case 4 -> "DOSSIER NON RENOUVELE";
            case 99 -> "AUTRE MOTIF";
            default -> "AUTRE MOTIF";
        };
    }

    /**
     * Mappe le code d'état vers un motif descriptif.
     * @param codeEtat Le code d'état (1, 2, 3, 4, 99)
     * @return Le motif descriptif
     */

}
