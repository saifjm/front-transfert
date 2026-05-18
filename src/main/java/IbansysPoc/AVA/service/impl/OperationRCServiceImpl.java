package IbansysPoc.AVA.service.impl;

import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.*;
import IbansysPoc.AVA.entity.*;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.repository.*;
import IbansysPoc.AVA.service.OperationRCService;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Implémentation du service Rétrocession (RC).
 *
 * Pattern "finalize" identique au FV :
 * - Phase 1 : Création MVT + validations (status I)
 * - Phase 2 : Application au dossier (status V → A/E)
 *
 * Sous-types :
 * - RAV : Annulation complète d'un FV (montant auto-récupéré depuis le MVT original)
 * - RRV : Remboursement partiel (montant fourni, déclaration obligatoire)
 *
 * Effet sur le dossier (inverse du FV) :
 * - MNT_UTILISE ↓ (diminue)
 * - SOLDE ↑ (augmente)
 * - DERNIER_NUM_MVT_AVA ↑ (incrémente)
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OperationRCServiceImpl implements OperationRCService {

    // ═══════════════════════════════════════════════════════════
    // CONSTANTES
    // ═══════════════════════════════════════════════════════════

    /** Code opération Rétrocession */
    private static final int CODE_OPERATION_RC = 206;

    /** Code produit service par défaut */
    private static final short CODE_PRODUIT_SERVICE = 108;

    /** État dossier requis pour validation */
    private static final String ETAT_DOSSIER_VALIDE = "V";

    /** Règle des 40 jours pour RAV */
    private static final int RAV_DELAI_JOURS = 40;

    /** Extensions autorisées pour les documents */
    private static final List<String> EXTENSIONS_AUTORISEES = List.of("pdf", "jpg", "jpeg", "png", "tiff");

    // ═══════════════════════════════════════════════════════════
    // DÉPENDANCES
    // ═══════════════════════════════════════════════════════════

    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeRepository dossierRepository;
    private final DocumentRepository documentRepository;
    private final OperationsDelegueeService dossierService;

    // ═══════════════════════════════════════════════════════════
    // POINT D'ENTRÉE PRINCIPAL
    // ═══════════════════════════════════════════════════════════

    @Override
    public OperationCreationResponseDTO create(OperationRCDTO dto, boolean finalize) {
        log.info("[OperationRCService] Début création opération RC ({}), finalize={}, refOperationRC={}",
                dto.getMouvements().getTypeMouvement(), finalize, dto.getRefOperationRC());

        OperationsDelegueesMvt mvt;

        // CAS 1 : refOperationRC fourni → charger le MVT existant (brouillon)
        if (dto.getRefOperationRC() != null) {
            log.info("[OperationRCService] RefOperationRC fourni : {}. Chargement du MVT existant...",
                    dto.getRefOperationRC());

            OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
            mvtId.setDateOperation(LocalDate.now());
            mvtId.setRefOperation(dto.getRefOperationRC());

            mvt = mvtRepository.findById(mvtId)
                .orElseThrow(() -> new BusinessException("MVT_NOT_FOUND",
                    "Le mouvement RC avec refOperation=" + dto.getRefOperationRC() +
                    " et dateOperation=" + LocalDate.now() + " n'existe pas"));

            if (!"I".equals(mvt.getStatus())) {
                throw new BusinessException("MVT_ALREADY_FINALIZED",
                    "Le mouvement refOperation=" + dto.getRefOperationRC() +
                    " a déjà été finalisé (status=" + mvt.getStatus() + ")");
            }
        }
        // CAS 2 : Créer un nouveau MVT
        else {
            mvt = createMvt(dto);
        }

        // Si finalize=false → retourner le brouillon
        if (!finalize) {
            log.info("[OperationRCService] Mouvement RC créé en brouillon (status I), refOperation={}",
                    mvt.getId().getRefOperation());
            return new OperationCreationResponseDTO(
                mvt.getId().getRefOperation(),
                mvt.getNumDossier(),
                "I",
                null
            );
        }

        // finalize=true → appliquer au dossier
        return writeDossier(mvt);
    }

    @Override
    public OperationCreationResponseDTO validate(Long refOperation) {
        log.info("[OperationRCService] Validation du mouvement refOperation={}", refOperation);

        OperationsDelegueesMvt mvt = mvtRepository.findByIdRefOperation(refOperation)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Mouvement RC introuvable avec refOperation=" + refOperation));

        if ("A".equals(mvt.getStatus())) {
            return new OperationCreationResponseDTO(
                refOperation, mvt.getNumDossier(), "A", "Mouvement déjà appliqué"
            );
        }

        return writeDossier(mvt);
    }

    @Override
    public OperationRCDTO getByRefOperation(Long refOperation) {
        OperationsDelegueesMvt mvt = mvtRepository.findByIdRefOperation(refOperation)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Mouvement RC introuvable avec refOperation=" + refOperation));
        return mapMvtToDTO(mvt);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 1 : CRÉATION DU MOUVEMENT (status I)
    // ═══════════════════════════════════════════════════════════

    private OperationsDelegueesMvt createMvt(OperationRCDTO dto) {
        LocalDate now = LocalDate.now();

        // 1. Générer refOperation (séquence Oracle)
        Long refOperation = mvtRepository.getNextRefOperation();
        log.info("[createMvt-RC] refOperation généré : {}", refOperation);

        // 2. Récupérer le dossier existant
        Integer numDossier = dto.getDossier().getNumeroDossier();
        OperationsDeleguee dossier = dossierRepository.findById(numDossier)
                .orElseThrow(() -> new BusinessException("DOSSIER_INTROUVABLE",
                    "Dossier introuvable avec numDossier=" + numDossier));

        // 3. Résoudre le MVT original FV (obligatoire pour RAV et RRV)
        Long refOperationOriginal = dto.getMouvements().getRefOperation();
        OperationsDelegueesMvt mvtOriginal = findMvtOriginal(refOperationOriginal, numDossier);

        // 4. Déterminer le montant RC
        String typeMouvement = dto.getMouvements().getTypeMouvement().toUpperCase();
        BigDecimal montantRC = resolveMontantRC(dto, mvtOriginal, typeMouvement);

        // 5. Exécuter TOUTES les validations métier
        validateAll(dto, dossier, mvtOriginal, montantRC, typeMouvement);

        // 6. Construire l'entité MVT
        OperationsDelegueesMvt entity = buildMvtEntity(dto, dossier, refOperation, now, montantRC);

        // 7. Sauvegarder le MVT
        OperationsDelegueesMvt saved = mvtRepository.save(entity);
        log.info("[createMvt-RC] Mouvement sauvegardé : refOperation={}, type={}, montant={}, status={}",
                saved.getId().getRefOperation(), typeMouvement, montantRC, saved.getStatus());

        // 8. Sauvegarder les documents scannés
        if (dto.getDocumentsScannes() != null && !dto.getDocumentsScannes().isEmpty()) {
            for (DocumentScanneRCDTO docDTO : dto.getDocumentsScannes()) {
                saveDocument(docDTO, saved, now);
            }
        }

        return saved;
    }

    /**
     * Recherche le MVT FV original par refOperation + numDossier.
     */
    private OperationsDelegueesMvt findMvtOriginal(Long refOperation, Integer numDossier) {
        List<OperationsDelegueesMvt> mvts = mvtRepository.findByIdRefOperation(refOperation);

        return mvts.stream()
            .filter(m -> numDossier.equals(m.getNumDossier()))
            .findFirst()
            .orElseThrow(() -> new BusinessException("MVT_ORIGINAL_INTROUVABLE",
                String.format("Le mouvement original (refOperation=%d) n'existe pas pour le dossier %d",
                    refOperation, numDossier)));
    }

    /**
     * Résout le montant RC selon le type :
     * - RAV : montant = montant du MVT original (auto-récupéré)
     * - RRV : montant = montant fourni (doit être <= montant original)
     */
    private BigDecimal resolveMontantRC(OperationRCDTO dto, OperationsDelegueesMvt mvtOriginal, String typeMouvement) {
        if ("RAV".equals(typeMouvement)) {
            BigDecimal montantOriginal = mvtOriginal.getMntMvtAva();
            if (montantOriginal == null || montantOriginal.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("MVT_ORIGINAL_MONTANT_INVALIDE",
                    "Le mouvement original (refOperation=" + mvtOriginal.getId().getRefOperation() +
                    ") n'a pas de montant valide (mntMvtAva=" + montantOriginal + ")");
            }
            log.info("[resolveMontantRC] RAV - montant auto-récupéré depuis MVT original : {}", montantOriginal);
            return montantOriginal;
        }

        // RRV : montant fourni
        BigDecimal mntMvt = dto.getMouvements().getMntMvt();
        if (mntMvt == null || mntMvt.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("MONTANT_RRV_REQUIS",
                "Le montant est obligatoire et doit être > 0 pour une opération RRV");
        }

        BigDecimal montantOriginal = mvtOriginal.getMntMvtAva() != null ?
            mvtOriginal.getMntMvtAva() : BigDecimal.ZERO;

        if (mntMvt.compareTo(montantOriginal) > 0) {
            throw new BusinessException("MONTANT_RRV_DEPASSE",
                String.format("Le montant RRV (%s) dépasse le montant du mouvement original (%s)",
                    mntMvt, montantOriginal));
        }

        log.info("[resolveMontantRC] RRV - montant fourni : {}, montant original : {}", mntMvt, montantOriginal);
        return mntMvt;
    }

    /**
     * Construit l'entité OperationsDelegueesMvt pour la RC.
     */
    private OperationsDelegueesMvt buildMvtEntity(OperationRCDTO dto, OperationsDeleguee dossier,
                                                   Long refOperation, LocalDate now, BigDecimal montantRC) {
        OperationsDelegueesMvt entity = new OperationsDelegueesMvt();

        // ID composite
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(now);
        entity.setId(id);

        // Informations dossier
        entity.setNumDossier(dto.getDossier().getNumeroDossier());
        entity.setDateDossier(dto.getDossier().getDateDossier());
        entity.setCodeTypeDosAva(dossier.getCodeTypeDosAva());
        entity.setCodeAgenceAva(dossier.getCodeAgenceAva());

        // Informations client
        entity.setTypePieceClient(dossier.getTypePieceClient() != null ?
            Integer.valueOf(dossier.getTypePieceClient().intValue()) : null);
        entity.setNoPieceClient(dossier.getNoPieceClient());

        // Code opération et produit
        entity.setCodeOperation(CODE_OPERATION_RC);
        entity.setCodeProduitService(CODE_PRODUIT_SERVICE);

        // Montant du mouvement RC
        entity.setMntMvtAva(montantRC);

        // Statuts
        entity.setStatus("I");  // Brouillon
        entity.setEtatDossier("X");  // En cours

        // Snapshot du dossier avec calcul RC (inverse du FV)
        fillSnapshotFromDossier(entity, dossier, montantRC);

        // Année
        entity.setAnnee((short) now.getYear());

        // Numéro de mouvement
        entity.setNumMvtAva(dossier.getDernierNumMvtAva() != null ? dossier.getDernierNumMvtAva() + 1 : 1);

        return entity;
    }

    /**
     * Remplit les champs snapshot depuis le dossier avec la logique RC (inverse du FV).
     * RC restaure l'autorisation :
     * - mntUtilise (nouveau) = mntUtilise (ancien) - montantRC  (plancher à 0)
     * - solde (nouveau) = solde (ancien) + montantRC
     */
    private void fillSnapshotFromDossier(OperationsDelegueesMvt entity, OperationsDeleguee dossier,
                                          BigDecimal montantRC) {
        BigDecimal ancienMntUtilise = dossier.getMntUtilise() != null ?
            dossier.getMntUtilise() : BigDecimal.ZERO;
        BigDecimal ancienSolde = dossier.getSolde() != null ?
            dossier.getSolde() : BigDecimal.ZERO;

        // ✅ LOGIQUE RC (inverse du FV) :
        // mntUtilise (nouveau) = max(0, mntUtilise (ancien) - montantRC)
        // solde (nouveau) = solde (ancien) + montantRC
        BigDecimal nouveauMntUtilise = ancienMntUtilise.subtract(montantRC).max(BigDecimal.ZERO);
        BigDecimal nouveauSolde = ancienSolde.add(montantRC);

        log.info("[fillSnapshotFromDossier-RC] mntUtilise: ancien={}, montantRC={}, nouveau={}",
                ancienMntUtilise, montantRC, nouveauMntUtilise);
        log.info("[fillSnapshotFromDossier-RC] solde: ancien={}, nouveau={}",
                ancienSolde, nouveauSolde);

        entity.setMntAutorise(dossier.getMntAutorise());
        entity.setMntAvance(dossier.getMntAvance());
        entity.setMntUtilise(nouveauMntUtilise);
        entity.setMntReserve(dossier.getMntReserve());
        entity.setMntBlocage(dossier.getMntBlocage());
        entity.setSolde(nouveauSolde);
        entity.setMntCaFiscal(dossier.getMntCaFiscal());
    }

    /**
     * Sauvegarde un document scanné lié au mouvement RC.
     */
    private void saveDocument(DocumentScanneRCDTO docDTO, OperationsDelegueesMvt mvt, LocalDate now) {
        Document doc = new Document();

        if (docDTO.getLigne() != null) {
            doc.setNumLigne(docDTO.getLigne().longValue());
        } else {
            doc.setNumLigne(System.currentTimeMillis());
        }

        doc.setNumDossier(mvt.getNumDossier());
        doc.setDateDossier(mvt.getDateDossier());
        doc.setCodeProduitService(mvt.getCodeProduitService());
        doc.setCodeOperation(mvt.getCodeOperation());
        doc.setRefOperation(mvt.getId().getRefOperation());
        doc.setDateOperation(mvt.getId().getDateOperation());
        doc.setTypeDocument(docDTO.getTypeDocument() != null ?
            docDTO.getTypeDocument().longValue() : null);

        // Utiliser nomImage (pas cheminFichier) pour referenceFichierJoint
        doc.setReferenceFichierJoint(docDTO.getNomImage());

        // Extraire l'extension
        String nomImage = docDTO.getNomImage();
        if (nomImage != null && nomImage.contains(".")) {
            String extension = nomImage.substring(nomImage.lastIndexOf(".") + 1);
            doc.setExtention(extension);
        }

        // Chemin année/mois
        doc.setPathAnnee(now.format(DateTimeFormatter.ofPattern("yyyy")));
        doc.setPathMois(String.format("%02d", now.getMonthValue()));

        documentRepository.save(doc);
        log.info("[saveDocument-RC] Document sauvegardé : ligne={}, nomImage={}, refOperation={}",
                doc.getNumLigne(), docDTO.getNomImage(), mvt.getId().getRefOperation());
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATIONS MÉTIER
    // ═══════════════════════════════════════════════════════════

    /**
     * Exécute TOUTES les validations métier pour une opération RC.
     */
    private void validateAll(OperationRCDTO dto, OperationsDeleguee dossier,
                              OperationsDelegueesMvt mvtOriginal, BigDecimal montantRC,
                              String typeMouvement) {
        log.info("[validateAll-RC] Début validations métier RC ({})", typeMouvement);

        // 1. État du dossier
        validateEtatDossier(dossier);

        // 2. Type de mouvement valide
        validateTypeMouvement(typeMouvement);

        // 3. Validations spécifiques RAV
        if ("RAV".equals(typeMouvement)) {
            validateRAV(dto, dossier, mvtOriginal);
        }

        // 4. Validations spécifiques RRV
        if ("RRV".equals(typeMouvement)) {
            validateRRV(dto, mvtOriginal);
        }

        // 5. Validation documents (obligatoire pour RRV)
        validateDocuments(dto, typeMouvement);

        // 6. Le montant RC ne peut pas dépasser le mntUtilise actuel du dossier (garde-fou)
        BigDecimal mntUtiliseActuel = dossier.getMntUtilise() != null ?
            dossier.getMntUtilise() : BigDecimal.ZERO;
        if (montantRC.compareTo(mntUtiliseActuel) > 0) {
            log.warn("[validateAll-RC] Le montant RC ({}) dépasse mntUtilise du dossier ({}). " +
                    "Le mntUtilise sera plafonné à 0.", montantRC, mntUtiliseActuel);
        }

        log.info("[validateAll-RC] Toutes les validations passées avec succès");
    }

    private void validateEtatDossier(OperationsDeleguee dossier) {
        if (!ETAT_DOSSIER_VALIDE.equals(dossier.getEtatDossier())) {
            throw new BusinessException("DOSSIER_NON_VALIDE",
                String.format("Le dossier %d n'est pas dans l'état 'Valide' (état actuel: %s). " +
                    "Seuls les dossiers validés peuvent recevoir des opérations RC.",
                    dossier.getNumDossier(), dossier.getEtatDossier()));
        }
    }

    private void validateTypeMouvement(String typeMouvement) {
        if (!"RAV".equals(typeMouvement) && !"RRV".equals(typeMouvement)) {
            throw new BusinessException("TYPE_MOUVEMENT_INVALIDE",
                "Le type de mouvement doit être 'RAV' ou 'RRV'. Valeur reçue : " + typeMouvement);
        }
    }

    // ───────────────────── RAV ─────────────────────

    private void validateRAV(OperationRCDTO dto, OperationsDeleguee dossier,
                              OperationsDelegueesMvt mvtOriginal) {
        // RAV-1 : Vérification de la non-duplication (le slot N+1 ne doit pas exister déjà)
        Integer dernierNumMvt = dossier.getDernierNumMvtAva() != null ? dossier.getDernierNumMvtAva() : 0;
        int numMvtToSave = dernierNumMvt + 1;

        // RAV-2 : Le montant mntMvt ne doit PAS être fourni pour RAV
        if (dto.getMouvements().getMntMvt() != null) {
            log.warn("[validateRAV] Le montant mntMvt ({}) est fourni pour RAV mais sera ignoré " +
                    "(montant récupéré automatiquement depuis le MVT original)", dto.getMouvements().getMntMvt());
        }

        // RAV-3 : Règle des 40 jours
        LocalDate dateOperationOriginal = mvtOriginal.getId().getDateOperation();
        if (dateOperationOriginal != null) {
            LocalDate dateLimite = LocalDate.now().minusDays(RAV_DELAI_JOURS);
            if (dateOperationOriginal.isBefore(dateLimite)) {
                throw new BusinessException("RAV_DELAI_DEPASSE",
                    String.format("La rétrocession RAV n'est plus possible : le mouvement original (date=%s) " +
                        "a été créé il y a plus de %d jours (limite: %s)",
                        dateOperationOriginal, RAV_DELAI_JOURS, dateLimite));
            }
        }

        log.info("[validateRAV] Validations RAV passées : numMvtToSave={}, dateOriginal={}",
                numMvtToSave, dateOperationOriginal);
    }

    // ───────────────────── RRV ─────────────────────

    private void validateRRV(OperationRCDTO dto, OperationsDelegueesMvt mvtOriginal) {
        MouvementRCDTO mouvement = dto.getMouvements();

        // RRV-1 : Numéro de déclaration obligatoire
        if (mouvement.getNumeroDeclaration() == null || mouvement.getNumeroDeclaration().isBlank()) {
            throw new BusinessException("RRV_DECLARATION_MANQUANTE",
                "Le numéro de déclaration est obligatoire pour une opération RRV");
        }

        // RRV-2 : Date de déclaration obligatoire
        if (mouvement.getDateDeclaration() == null) {
            throw new BusinessException("RRV_DATE_DECLARATION_MANQUANTE",
                "La date de déclaration est obligatoire pour une opération RRV");
        }

        // RRV-3 : dateDeclaration >= date du mouvement original
        LocalDate dateOperationOriginal = mvtOriginal.getId().getDateOperation();
        if (dateOperationOriginal != null && mouvement.getDateDeclaration().isBefore(dateOperationOriginal)) {
            throw new BusinessException("RRV_DATE_DECLARATION_INVALIDE",
                String.format("La date de déclaration (%s) doit être >= à la date du mouvement original (%s)",
                    mouvement.getDateDeclaration(), dateOperationOriginal));
        }

        // RRV-4 : Montant obligatoire et borné (fait dans resolveMontantRC)

        log.info("[validateRRV] Validations RRV passées : numDeclaration={}, dateDeclaration={}",
                mouvement.getNumeroDeclaration(), mouvement.getDateDeclaration());
    }

    // ───────────────────── Documents ─────────────────────

    private void validateDocuments(OperationRCDTO dto, String typeMouvement) {
        // RRV requiert au moins un document scanné
        if ("RRV".equals(typeMouvement)) {
            if (dto.getDocumentsScannes() == null || dto.getDocumentsScannes().isEmpty()) {
                throw new BusinessException("DOCUMENTS_OBLIGATOIRES",
                    "Un document scanné (Déclaration de douane) est obligatoire pour une opération RRV");
            }
        }

        // Valider chaque document si présent
        if (dto.getDocumentsScannes() != null) {
            for (DocumentScanneRCDTO doc : dto.getDocumentsScannes()) {
                if (doc.getLigne() != null && doc.getLigne() <= 0) {
                    throw new BusinessException("DOCUMENT_LIGNE_INVALIDE",
                        "Le numéro de ligne du document doit être > 0");
                }
                if (doc.getNomImage() != null && !doc.getNomImage().isBlank()) {
                    String ext = extractExtension(doc.getNomImage());
                    if (ext != null && !EXTENSIONS_AUTORISEES.contains(ext.toLowerCase())) {
                        throw new BusinessException("DOCUMENT_EXTENSION_INVALIDE",
                            String.format("L'extension '%s' n'est pas autorisée. Extensions acceptées : %s",
                                ext, EXTENSIONS_AUTORISEES));
                    }
                }
            }
        }
    }

    private String extractExtension(String nomImage) {
        if (nomImage != null && nomImage.contains(".")) {
            return nomImage.substring(nomImage.lastIndexOf(".") + 1);
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 2 : VALIDATION ET APPLICATION AU DOSSIER
    // ═══════════════════════════════════════════════════════════

    /**
     * Marque le mouvement comme validé (V) et applique au dossier via applyRCToDossier.
     * Status final : A (appliqué) ou E (erreur).
     */
    private OperationCreationResponseDTO writeDossier(OperationsDelegueesMvt mvt) {
        Long refOperation = mvt.getId().getRefOperation();
        Integer numDossier = mvt.getNumDossier();

        log.info("[writeDossier-RC] Début application au dossier pour refOperation={}, numDossier={}",
                refOperation, numDossier);

        // 1. Marquer comme VALIDÉ
        mvt.setStatus("V");
        mvt.setDateValidation(LocalDate.now());
        mvtRepository.save(mvt);
        mvtRepository.flush();

        log.info("[writeDossier-RC] Mouvement marqué 'V' (Validé) et synchronisé avec la BD");

        // 2. Appliquer le MVT RC au dossier (mise à jour mnt_utilise et solde)
        try {
            dossierService.applyRCToDossier(numDossier, refOperation);

            // 3. Marquer le MVT comme APPLIQUÉ (status A)
            mvt.setStatus("A");
            mvtRepository.save(mvt);
            mvtRepository.flush();

            log.info("[writeDossier-RC] Opération RC appliquée avec succès (status=A)");
            return new OperationCreationResponseDTO(
                refOperation,
                numDossier,
                "A",
                "Opération Rétrocession appliquée avec succès. " +
                "Le dossier a été mis à jour : mnt_utilise ↓, solde ↑."
            );

        } catch (Exception e) {
            log.error("[writeDossier-RC] Erreur lors de l'application au dossier pour numDossier={}: {}",
                    numDossier, e.getMessage());

            mvt.setStatus("E");
            mvtRepository.save(mvt);
            mvtRepository.flush();

            return new OperationCreationResponseDTO(
                refOperation,
                numDossier,
                "E",
                "Erreur lors de l'application au dossier: " + e.getMessage()
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════

    private OperationRCDTO mapMvtToDTO(OperationsDelegueesMvt mvt) {
        OperationRCDTO dto = new OperationRCDTO();

        DossierRCDTO dossierDTO = new DossierRCDTO();
        dossierDTO.setNumeroDossier(mvt.getNumDossier());
        dossierDTO.setDateDossier(mvt.getDateDossier());
        dossierDTO.setTypeDossier(mvt.getCodeTypeDosAva() != null ?
            Integer.valueOf(mvt.getCodeTypeDosAva().intValue()) : null);
        dto.setDossier(dossierDTO);

        MouvementRCDTO mouvementDTO = new MouvementRCDTO();
        mouvementDTO.setMntMvt(mvt.getMntMvtAva());
        mouvementDTO.setRefOperation(mvt.getId().getRefOperation());
        dto.setMouvements(mouvementDTO);

        dto.setRefOperationRC(mvt.getId().getRefOperation());

        return dto;
    }
}

