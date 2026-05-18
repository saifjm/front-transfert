package IbansysPoc.AVA.service.impl;

import IbansysPoc.AVA.DTO.*;
import IbansysPoc.AVA.entity.*;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.repository.*;
import IbansysPoc.AVA.service.ApiExterneService;
import IbansysPoc.AVA.service.BusinessRulesService;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import IbansysPoc.AVA.service.OperationFVService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Implémentation du service de gestion des opérations Frais de Voyage (FV).
 * Utilise le pattern "finalize" en 2 phases :
 * - Phase 1 : Création MVT + validations (status I)
 * - Phase 2 : Application au dossier (status V → A/E)
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OperationFVServiceImpl implements OperationFVService {

    // ═══════════════════════════════════════════════════════════
    // CONSTANTES
    // ═══════════════════════════════════════════════════════════

    /** Code opération pour Frais de Voyage */
    private static final int CODE_OPERATION_FV = 250;

    /** Code produit service par défaut */
    private static final short CODE_PRODUIT_SERVICE = 108;

    /** Limite montant pour modes BB, CH, TC (30 000 TND) */
    private static final BigDecimal LIMITE_MONTANT_BB_CH_TC = new BigDecimal("30000");

    /** État dossier requis pour validation */
    private static final String ETAT_DOSSIER_VALIDE = "V";

    /** Modes de paiement soumis à limite */
    private static final List<String> MODES_LIMITES = List.of("BB", "CH", "TC");

    /** Modes de paiement acceptés pour les opérations FV */
    private static final List<String> MODES_ACCEPTES = List.of("BB", "CH", "TC");

    // ═══════════════════════════════════════════════════════════
    // DÉPENDANCES
    // ═══════════════════════════════════════════════════════════

    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeRepository dossierRepository;
    private final BeneficiaireRepository beneficiaireRepository;
    private final DocumentRepository documentRepository;

    private final BusinessRulesService businessRulesService;
    private final OperationsDelegueeService dossierService;
    private final ApiExterneService apiExterneService;

    // ═══════════════════════════════════════════════════════════
    // POINT D'ENTRÉE PRINCIPAL
    // ═══════════════════════════════════════════════════════════

    @Override
    public OperationCreationResponseDTO create(OperationFVDTO dto, boolean finalize) {
        log.info("[OperationFVService] Début création opération FV, finalize={}, refOperation={}",
                finalize, dto.getRefOperation());

        OperationsDelegueesMvt mvt;

        // CAS 1 : Si refOperation est fourni, charger le MVT existant
        if (dto.getRefOperation() != null) {
            log.info("[OperationFVService] RefOperation fourni : {}. Chargement du MVT existant...",
                    dto.getRefOperation());

            LocalDate now = LocalDate.now();

            // Créer l'ID composite avec setters (pas de constructeur avec paramètres)
            OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
            mvtId.setDateOperation(now);
            mvtId.setRefOperation(dto.getRefOperation());

            mvt = mvtRepository.findById(mvtId)
                .orElseThrow(() -> new BusinessException("MVT_NOT_FOUND",
                    "Le mouvement avec refOperation=" + dto.getRefOperation() +
                    " et dateOperation=" + now + " n'existe pas"));

            log.info("[OperationFVService] MVT existant chargé : refOperation={}, status={}",
                    mvt.getId().getRefOperation(), mvt.getStatus());

            // Vérifier que le MVT est en brouillon
            if (!"I".equals(mvt.getStatus())) {
                throw new BusinessException("MVT_ALREADY_FINALIZED",
                    "Le mouvement refOperation=" + dto.getRefOperation() +
                    " a déjà été finalisé (status=" + mvt.getStatus() + ")");
            }
        }
        // CAS 2 : Créer un nouveau MVT
        else {
            log.info("[OperationFVService] Aucun refOperation fourni. Création d'un nouveau MVT...");
            mvt = createMvt(dto);
        }

        // PHASE 2 : Si finalize=true, appliquer au dossier
        if (!finalize) {
            log.info("[OperationFVService] Mouvement créé en brouillon (status I), refOperation={}",
                    mvt.getId().getRefOperation());
            return new OperationCreationResponseDTO(
                mvt.getId().getRefOperation(),
                mvt.getNumDossier(),
                "I",
                null
            );
        }

        return writeDossier(mvt);
    }

    @Override
    public OperationCreationResponseDTO validate(Long refOperation) {
        log.info("[OperationFVService] Validation du mouvement refOperation={}", refOperation);

        // Charger le MVT
        OperationsDelegueesMvt mvt = mvtRepository.findByIdRefOperation(refOperation)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Mouvement introuvable avec refOperation=" + refOperation));

        // Vérifier que status != A (pas déjà appliqué)
        if ("A".equals(mvt.getStatus())) {
            log.warn("[OperationFVService] Le mouvement est déjà appliqué (status=A)");
            return new OperationCreationResponseDTO(
                refOperation,
                mvt.getNumDossier(),
                "A",
                "Mouvement déjà appliqué"
            );
        }

        return writeDossier(mvt);
    }

    @Override
    public OperationFVDTO getByRefOperation(Long refOperation) {
        OperationsDelegueesMvt mvt = mvtRepository.findByIdRefOperation(refOperation)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Mouvement introuvable avec refOperation=" + refOperation));

        return mapMvtToDTO(mvt);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 1 : CRÉATION DU MOUVEMENT (status I)
    // ═══════════════════════════════════════════════════════════

    private OperationsDelegueesMvt createMvt(OperationFVDTO dto) {
        LocalDate now = LocalDate.now();

        // 1. Générer refOperation (séquence Oracle)
        Long refOperation = mvtRepository.getNextRefOperation();
        log.info("[createMvt] refOperation généré : {}", refOperation);

        // 2. Récupérer le dossier existant
        Integer numDossier = dto.getDossier().getNumeroDossier();
        OperationsDeleguee dossier = dossierRepository.findById(numDossier)
                .orElseThrow(() -> new BusinessException("DOSSIER_INTROUVABLE",
                    "Dossier introuvable avec numDossier=" + numDossier));

        // 3. Enrichir le DTO avec les données du dossier si manquantes
        enrichDTOFromDossier(dto, dossier);

        // 4. Exécuter TOUTES les validations métier (bloquantes)
        validateAll(dto, dossier);

        // 5. Construire l'entité MVT
        OperationsDelegueesMvt entity = buildMvtEntity(dto, dossier, refOperation, now);

        // 6. Sauvegarder le MVT
        OperationsDelegueesMvt saved = mvtRepository.save(entity);
        log.info("[createMvt] Mouvement sauvegardé : refOperation={}, status={}",
                saved.getId().getRefOperation(), saved.getStatus());

        // 7. Sauvegarder les documents scannés
        if (dto.getDocumentsScannes() != null && !dto.getDocumentsScannes().isEmpty()) {
            for (DocumentScanneFVDTO docDTO : dto.getDocumentsScannes()) {
                saveDocument(docDTO, saved, now);
            }
        }

        return saved;
    }

    /**
     * Enrichit le DTO avec les données du dossier si manquantes.
     */
    private void enrichDTOFromDossier(OperationFVDTO dto, OperationsDeleguee dossier) {
        // Enrichir date et type de dossier si absents
        if (dto.getDossier().getDateDossier() == null) {
            dto.getDossier().setDateDossier(dossier.getDateDossier());
        }
        if (dto.getDossier().getTypeDossier() == null) {
            dto.getDossier().setTypeDossier(dossier.getCodeTypeDosAva() != null ?
                Integer.valueOf(dossier.getCodeTypeDosAva().intValue()) : null);
        }

        log.info("[enrichDTOFromDossier] DTO enrichi depuis dossier {}", dossier.getNumDossier());
    }

    /**
     * Construit l'entité OperationsDelegueesMvt à partir du DTO.
     */
    private OperationsDelegueesMvt buildMvtEntity(OperationFVDTO dto, OperationsDeleguee dossier,
                                                   Long refOperation, LocalDate now) {
        OperationsDelegueesMvt entity = new OperationsDelegueesMvt();

        // ID composite
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(now);
        entity.setId(id);

        // Informations dossier (récupérées depuis le dossier, pas depuis le DTO)
        entity.setNumDossier(dto.getDossier().getNumeroDossier());
        entity.setDateDossier(dto.getDossier().getDateDossier());
        entity.setCodeTypeDosAva(dossier.getCodeTypeDosAva());
        entity.setCodeAgenceAva(dossier.getCodeAgenceAva());

        // Informations client (depuis dossier)
        entity.setTypePieceClient(dossier.getTypePieceClient() != null ?
            Integer.valueOf(dossier.getTypePieceClient().intValue()) : null);
        entity.setNoPieceClient(dossier.getNoPieceClient());

        // Code opération et produit
        entity.setCodeOperation(CODE_OPERATION_FV);
        entity.setCodeProduitService(CODE_PRODUIT_SERVICE);

        // Montant du mouvement
        entity.setMntMvtAva(dto.getMouvement().getMontant());

        // Statuts
        entity.setStatus("I");  // Brouillon
        entity.setEtatDossier("X");  // En cours

        // Snapshot du dossier
        fillSnapshotFromDossier(entity, dossier);

        // Année
        entity.setAnnee((short) now.getYear());

        // Numéro de mouvement (snapshot)
        entity.setNumMvtAva(dossier.getDernierNumMvtAva() != null ? dossier.getDernierNumMvtAva() + 1 : 1);

        return entity;
    }

    /**
     * Remplit les champs snapshot depuis le dossier.
     */
    private void fillSnapshotFromDossier(OperationsDelegueesMvt entity, OperationsDeleguee dossier) {
        // Récupérer les valeurs actuelles du dossier
        BigDecimal ancienMntUtilise = dossier.getMntUtilise() != null ?
            dossier.getMntUtilise() : BigDecimal.ZERO;
        BigDecimal ancienSolde = dossier.getSolde() != null ?
            dossier.getSolde() : BigDecimal.ZERO;

        // Récupérer le montant du MVT FV actuel
        BigDecimal mntMvtAva = entity.getMntMvtAva() != null ?
            entity.getMntMvtAva() : BigDecimal.ZERO;

        // ✅ LOGIQUE FV SIMPLE :
        // mntUtilise (nouveau) = mntUtilise (ancien) + montant
        // solde (nouveau) = solde (ancien) - montant
        BigDecimal nouveauMntUtilise = ancienMntUtilise.add(mntMvtAva);
        BigDecimal nouveauSolde = ancienSolde.subtract(mntMvtAva);

        log.info("[fillSnapshotFromDossier] FV - mntUtilise: ancien={}, mvtAva={}, nouveau={}",
                ancienMntUtilise, mntMvtAva, nouveauMntUtilise);
        log.info("[fillSnapshotFromDossier] FV - solde: ancien={}, nouveau={}",
                ancienSolde, nouveauSolde);

        // Copier les champs depuis le dossier avec les nouvelles valeurs
        entity.setMntAutorise(dossier.getMntAutorise());
        entity.setMntAvance(dossier.getMntAvance());
        entity.setMntUtilise(nouveauMntUtilise);  // ← NOUVEAU mntUtilise
        entity.setMntReserve(dossier.getMntReserve());
        entity.setMntBlocage(dossier.getMntBlocage());
        entity.setSolde(nouveauSolde);  // ← NOUVEAU solde
        entity.setMntCaFiscal(dossier.getMntCaFiscal());
    }

    /**
     * Sauvegarde le document scanné lié au mouvement.
     */
    private void saveDocument(DocumentScanneFVDTO docDTO, OperationsDelegueesMvt mvt, LocalDate now) {
        Document doc = new Document();

        // ID (numLigne) depuis le DTO ou généré automatiquement
        if (docDTO.getLigne() != null) {
            doc.setNumLigne(docDTO.getLigne().longValue());
        } else {
            // Générer un numLigne unique (timestamp ou séquence)
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

        // Extraire l'extension depuis nomImage si présente
        String nomImage = docDTO.getNomImage();
        if (nomImage != null && nomImage.contains(".")) {
            String extension = nomImage.substring(nomImage.lastIndexOf(".") + 1);
            doc.setExtention(extension);
        }

        // Chemin année/mois
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy");
        doc.setPathAnnee(now.format(formatter));
        doc.setPathMois(String.format("%02d", now.getMonthValue()));

        documentRepository.save(doc);
        log.info("[saveDocument] Document sauvegardé : ligne={}, nomImage={}, refOperation={}",
                doc.getNumLigne(), docDTO.getNomImage(), mvt.getId().getRefOperation());
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATIONS MÉTIER
    // ═══════════════════════════════════════════════════════════

    /**
     * Exécute TOUTES les validations métier (bloquantes).
     * Lance une BusinessException si une validation échoue.
     */
    private void validateAll(OperationFVDTO dto, OperationsDeleguee dossier) {
        log.info("[validateAll] Début validations métier FV");

        // 1. État du dossier doit être 'V' (Valide)
        validateEtatDossier(dossier);

        // 2. Validation de la devise (appel API externe)
        validateDevise(dto.getMouvement().getDevise());

        // 3. Validation du pays (appel API externe)
        validatePays(dto.getMouvement().getPays());

        // 4. Validation financière (solde suffisant) - utilise les valeurs du dossier
        validateFinancial(dto, dossier);

        // 5. Validation du mode de paiement + limite montant
        validateModePaiement(dto.getMouvement());

        // 6. Validation des dates de voyage
        validateDatesVoyage(dto.getMouvement());

        // 7. Validation du bénéficiaire (doit exister dans la table BENEFICIAIRE)
        validateBeneficiaire(dto.getMouvement().getBeneficiaire(), dossier.getNumDossier());

        log.info("[validateAll] Toutes les validations passées avec succès");
    }

    /**
     * Valide que l'état du dossier est exactement 'V' (Valide).
     */
    private void validateEtatDossier(OperationsDeleguee dossier) {
        if (!ETAT_DOSSIER_VALIDE.equals(dossier.getEtatDossier())) {
            throw new BusinessException("DOSSIER_NON_VALIDE",
                String.format("Le dossier %d n'est pas dans l'état 'Valide' (état actuel: %s). " +
                    "Seuls les dossiers validés peuvent recevoir des opérations FV.",
                    dossier.getNumDossier(), dossier.getEtatDossier()));
        }
    }

    /**
     * Valide le compte RIB (doit contenir exactement 20 chiffres).
     */
    private void validateCompteRib(CompteRibFVDTO compteRib) {
        if (compteRib == null) {
            throw new BusinessException("COMPTE_RIB_MANQUANT",
                "Les informations du compte RIB sont obligatoires");
        }

        String ribComplet = compteRib.getRibComplet();
        if (ribComplet == null || !ribComplet.matches("\\d{20}")) {
            throw new BusinessException("COMPTE_RIB_INVALIDE",
                "Le RIB doit contenir exactement 20 chiffres (format: 2+3+13+2). " +
                "RIB fourni: " + (ribComplet != null ? ribComplet : "null"));
        }

        log.info("[validateCompteRib] RIB valide : {}", ribComplet);
    }

    /**
     * Valide la devise via appel API externe.
     * Vérifie que le codeDevise existe dans la liste des devises de l'API REF.
     */
    private void validateDevise(Integer codeDevise) {
        try {
            // Appel API REF pour récupérer toutes les devises
            java.util.List<Object> devises = apiExterneService.getDevises();

            // Vérifier si le codeDevise existe dans la liste
            boolean deviseExiste = devises.stream()
                .filter(d -> d instanceof java.util.Map)
                .map(d -> (java.util.Map<?, ?>) d)
                .anyMatch(map -> {
                    Object code = map.get("codeDevise");
                    return code != null && code.equals(codeDevise);
                });

            if (!deviseExiste) {
                throw new BusinessException("DEVISE_INVALIDE",
                    "La devise " + codeDevise + " n'existe pas dans le référentiel");
            }

            log.info("[validateDevise] Devise validée : {}", codeDevise);
        } catch (BusinessException e) {
            throw e; // Re-throw business exceptions
        } catch (Exception e) {
            log.error("[validateDevise] Erreur lors de la validation de la devise {}: {}",
                    codeDevise, e.getMessage());
            throw new BusinessException("DEVISE_INVALIDE",
                "Erreur lors de la validation de la devise " + codeDevise + ": " + e.getMessage());
        }
    }

    /**
     * Valide le pays via appel API externe.
     * Vérifie que le codePays existe dans la liste des pays de l'API REF.
     */
    private void validatePays(Integer codePays) {
        try {
            // Appel API REF pour récupérer tous les pays
            java.util.List<Object> paysList = apiExterneService.getPays();

            // Vérifier si le codePays existe dans la liste
            boolean paysExiste = paysList.stream()
                .filter(p -> p instanceof java.util.Map)
                .map(p -> (java.util.Map<?, ?>) p)
                .anyMatch(map -> {
                    Object code = map.get("codePays");
                    return code != null && code.equals(codePays);
                });

            if (!paysExiste) {
                throw new BusinessException("PAYS_INVALIDE",
                    "Le pays " + codePays + " n'existe pas dans le référentiel");
            }

            log.info("[validatePays] Pays validé : {}", codePays);
        } catch (BusinessException e) {
            throw e; // Re-throw business exceptions
        } catch (Exception e) {
            log.error("[validatePays] Erreur lors de la validation du pays {}: {}",
                    codePays, e.getMessage());
            throw new BusinessException("PAYS_INVALIDE",
                "Erreur lors de la validation du pays " + codePays + ": " + e.getMessage());
        }
    }

    /**
     * Validation financière :
     * - Solde = mntAutorise + mntAvance - mntUtilise
     * - Avance demandée <= Solde disponible
     */
    private void validateFinancial(OperationFVDTO dto, OperationsDeleguee dossier) {
        BigDecimal soldeCalcule = businessRulesService.calculerSolde(
            dossier.getMntAutorise(),
            dossier.getMntAvance(),
            BigDecimal.ZERO,  // mntAutoriseBct (non utilisé pour FV)
            dossier.getMntUtilise(),
            dossier.getMntReserve(),
            dossier.getMntBlocage()
        );

        log.info("[validateFinancial] Solde calculé : {} pour dossier {}", soldeCalcule, dossier.getNumDossier());

        BigDecimal montantDemande = dto.getMouvement().getMontant();

        if (montantDemande.compareTo(soldeCalcule) > 0) {
            throw new BusinessException("SOLDE_INSUFFISANT",
                String.format("Solde insuffisant. Montant demandé: %s TND, Solde disponible: %s TND",
                    montantDemande, soldeCalcule));
        }
    }

    /**
     * Valide le mode de paiement et vérifie les limites de montant.
     * Modes acceptés : BB, CH, TC, VR
     * Modes BB, CH, TC : limités à 30 000 TND.
     */
    private void validateModePaiement(MouvementFVDTO mouvement) {
        String mode = mouvement.getMode();
        BigDecimal montant = mouvement.getMontant();

        // Vérifier si le mode est dans la liste des modes acceptés
        //without returning the accepted method in the message error
        if (!MODES_ACCEPTES.contains(mode)) {
            throw new BusinessException("MODE_PAIEMENT_INVALIDE",
                String.format("Le mode de paiement '%s' n'est pas accepté. Mode Invalide : %s",
                    mode, String.join(" ")));
        }

        log.info("[validateModePaiement] Mode de paiement valide : {}", mode);

        // Vérifier la limite pour BB, CH, TC
        if (MODES_LIMITES.contains(mode) && montant.compareTo(LIMITE_MONTANT_BB_CH_TC) > 0) {
            throw new BusinessException("MONTANT_DEPASSE_LIMITE",
                String.format("Pour le mode de paiement '%s', le montant maximum autorisé est de %s TND. " +
                    "Montant demandé: %s TND", mode, LIMITE_MONTANT_BB_CH_TC, montant));
        }
    }

    /**
     * Valide les dates de voyage (dateDepart < dateRetour).
     */
    private void validateDatesVoyage(MouvementFVDTO mouvement) {
        LocalDate dateDepart = mouvement.getDateDepart();
        LocalDate dateRetour = mouvement.getDateRetour();

        if (dateDepart != null && dateRetour != null) {
            if (!dateDepart.isBefore(dateRetour)) {
                throw new BusinessException("DATES_VOYAGE_INVALIDES",
                    String.format("La date de départ (%s) doit être antérieure à la date de retour (%s)",
                        dateDepart, dateRetour));
            }
        }

        log.info("[validateDatesVoyage] Dates de voyage valides : départ={}, retour={}",
                dateDepart, dateRetour);
    }

    /**
     * Valide que le bénéficiaire existe dans la table BENEFICIAIRE pour ce dossier.
     * Vérifie numDossier + code (type de pièce) + numero (numéro de pièce).
     */
    private void validateBeneficiaire(BeneficiaireFVDTO benefDTO, Integer numDossier) {
        if (benefDTO == null) {
            throw new BusinessException("BENEFICIAIRE_MANQUANT",
                "Les informations du bénéficiaire sont obligatoires");
        }

        boolean exists = beneficiaireRepository.existsByNumDossierCodeAndNoPiece(
            numDossier,
            benefDTO.getCode(),
            benefDTO.getNumero()
        );

        if (!exists) {
            throw new BusinessException("BENEFICIAIRE_INEXISTANT",
                String.format("Le bénéficiaire (code=%d, numero=%s) n'existe pas pour le dossier %d. " +
                    "Veuillez d'abord créer le bénéficiaire avant d'effectuer une opération FV.",
                    benefDTO.getCode(), benefDTO.getNumero(), numDossier));
        }

        log.info("[validateBeneficiaire] Bénéficiaire validé : code={}, numero={}",
                benefDTO.getCode(), benefDTO.getNumero());
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 2 : VALIDATION ET APPLICATION AU DOSSIER
    // ═══════════════════════════════════════════════════════════

    /**
     * Marque le mouvement comme validé (V) et applique au dossier via applyForDossier.
     * Status final : A (appliqué) ou E (erreur).
     */
    private OperationCreationResponseDTO writeDossier(OperationsDelegueesMvt mvt) {
        LocalDate now = LocalDate.now();
        Long refOperation = mvt.getId().getRefOperation();
        Integer numDossier = mvt.getNumDossier();

        log.info("[writeDossier] Début application au dossier pour refOperation={}, numDossier={}",
                refOperation, numDossier);

        // 1. Marquer comme VALIDÉ
        mvt.setStatus("V");
        mvt.setDateValidation(now);
        mvtRepository.save(mvt);

        // IMPORTANT : Forcer la synchronisation avec la BD avant applyForDossier
        // pour garantir que le status 'V' est bien visible
        mvtRepository.flush();

        log.info("[writeDossier] Mouvement marqué 'V' (Validé) et synchronisé avec la BD");

        // 2. Appliquer le MVT FV au dossier (mise à jour mnt_utilise et solde)
        //    Utilise applyFVToDossier (spécifique FV) et non applyForDossier (pour ouvertures)
        try {
            dossierService.applyFVToDossier(numDossier, refOperation);

            // 3. Marquer le MVT comme APPLIQUÉ (status A)
            mvt.setStatus("A");
            mvtRepository.save(mvt);
            mvtRepository.flush();

            log.info("[writeDossier] Opération FV appliquée avec succès (status=A)");
            return new OperationCreationResponseDTO(
                refOperation,
                numDossier,
                "A",
                "Opération Frais de Voyage appliquée avec succès. " +
                "Le dossier a été mis à jour avec les nouveaux mnt_utilise et solde."
            );

        } catch (Exception e) {
            log.error("[writeDossier] Erreur lors de l'application au dossier pour numDossier={}: {}",
                    numDossier, e.getMessage());

            // Marquer le MVT en erreur
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

    /**
     * Mappe un mouvement vers le DTO de réponse.
     */
    private OperationFVDTO mapMvtToDTO(OperationsDelegueesMvt mvt) {
        OperationFVDTO dto = new OperationFVDTO();

        // Dossier (minimal)
        DossierFVDTO dossierDTO = new DossierFVDTO();
        dossierDTO.setNumeroDossier(mvt.getNumDossier());
        dossierDTO.setDateDossier(mvt.getDateDossier());
        dossierDTO.setTypeDossier(mvt.getCodeTypeDosAva() != null ?
            Integer.valueOf(mvt.getCodeTypeDosAva().intValue()) : null);
        dto.setDossier(dossierDTO);

        // Mouvement
        MouvementFVDTO mouvementDTO = new MouvementFVDTO();
        mouvementDTO.setMontant(mvt.getMntMvtAva());
        // TODO: récupérer les autres champs si nécessaire (devise, mode, pays, dates, bénéficiaire)
        dto.setMouvement(mouvementDTO);

        return dto;
    }
}

