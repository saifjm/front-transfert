package IbansysPoc.AVA.service.impl;

import IbansysPoc.AVA.DTO.NotificationClientRequest;
import IbansysPoc.AVA.DTO.TraitementAvaDTO;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.OperationsDelegueesMvtId;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.repository.OperationsDelegueeMvtRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.service.ApiExterneService;
import IbansysPoc.AVA.service.BusinessRulesService;
import IbansysPoc.AVA.service.TraitementAvaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.Optional;

/**
 * Implémentation du service de traitement AVA.
 * Équivalent de la procédure PL/SQL TRAITEMENT_AVA.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TraitementAvaServiceImpl implements TraitementAvaService {

    private final OperationsDelegueeRepository operationsDelegueeRepository;
    private final OperationsDelegueeMvtRepository operationsDelegueeMvtRepository;
    private final BusinessRulesService businessRulesService;
    private final ApiExterneService apiExterneService;


    // Constantes
    private static final Short CODE_TYPE_DOSSIER_AVA = 3;
    private static final BigDecimal SEUIL_CA_FISCAL = new BigDecimal("500000");
    private static final Integer CODE_ACTIVITE_SEUIL = 23;
    private static final Short CODE_PRODUIT_SERVICE_DEFAULT = 108;
    private static final Integer CODE_OPERATION_DEFAULT = 207;

    @Override
    @Transactional
    public void traiterDeclarationFiscale(TraitementAvaDTO dto) {
        log.info("Début traitement AVA - numDossier: {}, codeTypeDosAva: {}, annee: {}, mntCaFiscalHT: {}",
                dto.getNumDossier(), dto.getCodeTypeDosAva(), dto.getAnnee(), dto.getMntCaFiscalHT());

        // Validation : codeTypeDosAva doit être 3
        if (dto.getCodeTypeDosAva() == null || !dto.getCodeTypeDosAva().equals(CODE_TYPE_DOSSIER_AVA)) {
            throw new BusinessException("CODE_TYPE_DOSSIER_INVALIDE",
                    "Le code type dossier AVA doit être 3. Valeur reçue: " + dto.getCodeTypeDosAva());
        }

        // Validation : numDossier obligatoire
        if (dto.getNumDossier() == null) {
            throw new BusinessException("NUM_DOSSIER_OBLIGATOIRE",
                    "Le numéro de dossier est obligatoire");
        }

        int anneeEnCours = LocalDate.now().getYear();
        int anneeN1 = anneeEnCours - 1;
        int anneeN2 = anneeEnCours - 2;

        // Vérifier si l'année est N-1 ou N-2 (avant le 15 juin)
        boolean isAnneeN1 = dto.getAnnee() != null && dto.getAnnee() == anneeN1;
        boolean isAnneeN2AvantJuin = dto.getAnnee() != null
                && dto.getAnnee() == anneeN2
                && MonthDay.now().isBefore(MonthDay.of(6, 16));

        if (!isAnneeN1 && !isAnneeN2AvantJuin) {
            throw new BusinessException("ANNEE_NON_ELIGIBLE",
                    "Année " + dto.getAnnee() + " non éligible pour le traitement AVA");
        }

        // Rechercher le dossier par numDossier
        Optional<OperationsDeleguee> dossierOpt = operationsDelegueeRepository.findById(dto.getNumDossier());

        if (dossierOpt.isEmpty()) {
            throw new BusinessException("DOSSIER_NON_TROUVE",
                    "Dossier non trouvé pour le numéro: " + dto.getNumDossier());
        }

        OperationsDeleguee dossier = dossierOpt.get();

        // Vérifier que le dossier est de type 3 et état non R ou C
        if (!CODE_TYPE_DOSSIER_AVA.equals(dossier.getCodeTypeDosAva())) {
            throw new BusinessException("TYPE_DOSSIER_INVALIDE",
                    "Le dossier " + dto.getNumDossier() + " n'est pas de type 3");
        }

        if (dossier.getEtatDossier() != null &&
                (dossier.getEtatDossier().equals("R") || dossier.getEtatDossier().equals("C"))) {
            throw new BusinessException("DOSSIER_INACTIF",
                    "Le dossier " + dto.getNumDossier() + " est rejeté ou clôturé (état: " + dossier.getEtatDossier() + ")");
        }

        log.info("Dossier AVA trouvé: numDossier={}, etatDossier={}, codeEtat={}",
                dossier.getNumDossier(), dossier.getEtatDossier(), dossier.getCodeEtat());

        // Vérifier si la déclaration fiscale a déjà été faite pour ce dossier
        if ("O".equals(dossier.getDeclarationFiscale())) {
            throw new BusinessException("DECLARATION_FISCALE_DEJA_FAITE",
                    "La déclaration fiscale a déjà été effectuée pour le dossier " + dto.getNumDossier());
        }

        // Variables de travail
        BigDecimal mntAutorise = nvl(dossier.getMntAutorise());
        BigDecimal mntUtilise = nvl(dossier.getMntUtilise());
        String etatDossier = dossier.getEtatDossier();
        Short codeEtat = dossier.getCodeEtat();
        LocalDate dateEtat = dossier.getDateEtat();
        Integer numMvtAva = (dossier.getDernierNumMvtAva() != null ? dossier.getDernierNumMvtAva() : 0) + 1;

        // Calculer le montant MVT AVA (seulement pour année N-1)
        BigDecimal mntMvtAva = BigDecimal.ZERO;
        BigDecimal solde;

        if (isAnneeN1) {
            mntMvtAva = businessRulesService.calculMvtAvaCr(
                    dossier.getCodeTypeDosAva(),
                    mntAutorise,
                    nvl(dto.getMntCaFiscalHT())
            );
            if (mntMvtAva == null) {
                mntMvtAva = BigDecimal.ZERO;
            }
        }

        // Calculer le solde via la fonction BusinessRulesService
        BigDecimal nouveauMntAutorise = mntAutorise.add(nvl(mntMvtAva));
        solde = businessRulesService.calculerSolde(
                nouveauMntAutorise,
                BigDecimal.ZERO,
                dossier.getMntAutoriseBct(),
                dossier.getMntUtilise(),
                dossier.getMntReserve(),
                dossier.getMntBlocage()
        );

        log.info("=== DEBUG CALCULS ===");
        log.info("mntAutorise={}, mntMvtAva={}, nouveauMntAutorise={}", mntAutorise, mntMvtAva, nouveauMntAutorise);
        log.info("solde calculé={}, codeActivite={}, mntCaFiscalHT={}", solde, dossier.getCodeActivite(), dto.getMntCaFiscalHT());
        log.info("Condition solde < 0: {}", solde.compareTo(BigDecimal.ZERO) < 0);
        log.info("Condition CA insuffisant: codeActivite=23 ? {}, mntCaFiscalHT < 500000 ? {}",
                dossier.getCodeActivite() != null && dossier.getCodeActivite().equals(CODE_ACTIVITE_SEUIL),
                dto.getMntCaFiscalHT() != null && dto.getMntCaFiscalHT().compareTo(SEUIL_CA_FISCAL) < 0);

        // Vérifier si solde négatif -> suspension pour dépassement
        if (solde.compareTo(BigDecimal.ZERO) < 0) {
            etatDossier = "B"; // Bloqué
            codeEtat = 1; // Code blocage pour dépassement
            dateEtat = LocalDate.now();

            // Notification client
            envoyerNotification(
                    dossier,
                    "AVA : Suspension du dossier AVA N. ",
                    "Nous vous informons que votre dossier ci-dessus mentionné a été suspendu avec le motif 'Dépassement du montant autorisé'"
            );

            // Lever une BusinessException pour alerter
            throw new BusinessException("DOSSIER_SUSPENDU_DEPASSEMENT",
                    "Le dossier AVA N. " + dossier.getNumDossier() + " sera suspendu pour : \"Dépassement des droits\"");
        }

        // Vérifier si CA fiscal insuffisant pour activité 23 et type 3 -> clôture
        if (dossier.getCodeActivite() != null
                && dossier.getCodeActivite().equals(CODE_ACTIVITE_SEUIL)
                && dossier.getCodeTypeDosAva() != null
                && dossier.getCodeTypeDosAva().equals(CODE_TYPE_DOSSIER_AVA)
                && dto.getMntCaFiscalHT() != null
                && dto.getMntCaFiscalHT().compareTo(SEUIL_CA_FISCAL) < 0) {

            etatDossier = "C"; // Clôturé

            // Notification client
            envoyerNotification(
                    dossier,
                    "AVA : Clôture du dossier AVA N. ",
                    "Nous vous informons que votre dossier ci-dessus mentionné a été clôturé avec le motif 'CA fiscal n'a pas atteint le montant nécessaire'."
            );

            // Lever une BusinessException pour alerter
            throw new BusinessException("DOSSIER_CLOTURE_CA_INSUFFISANT",
                    "Le dossier AVA N. " + dossier.getNumDossier() + " sera clôturé pour : \"CA Fiscal n'a pas atteint le seuil exigé\"");
        }

        // Créer le mouvement MVT
        OperationsDelegueesMvt mvt = creerMouvement(dto, dossier, mntMvtAva, mntAutorise,
                mntUtilise, solde, etatDossier, codeEtat, dateEtat, numMvtAva);
        operationsDelegueeMvtRepository.save(mvt);
        log.info("Mouvement créé: refOperation={}, numMvtAva={}",
                mvt.getId().getRefOperation(), numMvtAva);

        // Mettre à jour le dossier
        if (isAnneeN1) {
            dossier.setMntCaFiscal(dto.getMntCaFiscalHT());
            dossier.setSolde(solde);
            dossier.setMntAutorise(nouveauMntAutorise);
            dossier.setMntAvance(BigDecimal.ZERO);
            dossier.setDeclarationFiscale("O");
        }
        dossier.setDernierNumMvtAva(numMvtAva);
        dossier.setEtatDossier(etatDossier);
        dossier.setCodeEtat(codeEtat);
        dossier.setDateEtat(dateEtat);

        operationsDelegueeRepository.save(dossier);
        log.info("Dossier mis à jour: numDossier={}, etatDossier={}, codeEtat={}",
                dossier.getNumDossier(), etatDossier, codeEtat);
    }

    /**
     * Crée un mouvement operations_deleguees_mvt.
     */
    private OperationsDelegueesMvt creerMouvement(TraitementAvaDTO dto,
                                                   OperationsDeleguee dossier,
                                                   BigDecimal mntMvtAva,
                                                   BigDecimal mntAutorise,
                                                   BigDecimal mntUtilise,
                                                   BigDecimal solde,
                                                   String etatDossier,
                                                   Short codeEtat,
                                                   LocalDate dateEtat,
                                                   Integer numMvtAva) {
        OperationsDelegueesMvt mvt = new OperationsDelegueesMvt();

        // ID composite - générer refOperation via la séquence
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(operationsDelegueeMvtRepository.getNextRefOperation()); // Séquence AVA_REF_OPR
        id.setDateOperation(LocalDate.now()); // SYSDATE
        mvt.setId(id);

        // Valeurs par défaut
        mvt.setCodeProduitService(CODE_PRODUIT_SERVICE_DEFAULT); // 108
        mvt.setCodeOperation(CODE_OPERATION_DEFAULT); // 207

        // Champs du dossier
        mvt.setNumDossier(dossier.getNumDossier());
        mvt.setDeclarationFiscale("O");
        mvt.setDateDossier(dto.getDateDossier() != null ? dto.getDateDossier() : dossier.getDateDossier());
        mvt.setCodeAgenceAva(dossier.getCodeAgenceAva());
        mvt.setCodeTypeDosAva(dossier.getCodeTypeDosAva());
        mvt.setEcheance(dossier.getEcheance());
        mvt.setCodeActivite(dossier.getCodeActivite());
        mvt.setNumeroCompte(dossier.getNumeroCompte());
        mvt.setTypePieceClient(dossier.getTypePieceClient() != null ? dossier.getTypePieceClient().intValue() : null);
        mvt.setNoPieceClient(dossier.getNoPieceClient());
        mvt.setAnnee(dto.getAnnee());

        // Montants
        mvt.setMntMvtAva(mntMvtAva);
        mvt.setMntAutorise(mntAutorise);
        mvt.setMntUtilise(mntUtilise);
        mvt.setMntAvance(BigDecimal.ZERO);
        mvt.setSolde(solde);
        mvt.setMntCa(dto.getMntCaFiscalHT());
        mvt.setMntCaFiscal(dto.getMntCaFiscalHT());
        mvt.setMntBlocage(dossier.getMntBlocage());

        // État
        mvt.setNumMvtAva(numMvtAva);
        mvt.setEtatDossier(etatDossier);
        mvt.setCodeEtat(codeEtat);
        mvt.setDateEtat(dateEtat);
        mvt.setDeclarationFiscale("O");
        mvt.setStatus("V");
        mvt.setDateValidation(LocalDate.now());

        return mvt;
    }

    /**
     * Envoie une notification au client via le microservice SWF-Mail.
     */
    private void envoyerNotification(OperationsDeleguee dossier,
                                      String objet,
                                      String message) {
        log.info("=== DEBUT ENVOI NOTIFICATION ===");
        log.info("Dossier: {}, Objet: {}", dossier.getNumDossier(), objet);

        try {
            // Récupérer l'email expéditeur reconnu depuis SWF-Mail
            java.util.List<IbansysPoc.AVA.DTO.RecognizedEmailSenderDTO> senders = apiExterneService.getAllRecognizedEmailSenders();
            if (senders == null || senders.isEmpty()) {
                log.error("Aucun email expéditeur reconnu trouvé dans SWF-Mail");
                throw new IbansysPoc.AVA.exception.BusinessException("EMAIL_EXPEDITEUR_NON_TROUVE",
                        "Aucun email expéditeur reconnu trouvé dans le système");
            }

            String senderEmail = senders.get(0).getEmail();
            log.info("Email expéditeur récupéré depuis SWF-Mail: {}", senderEmail);

            NotificationClientRequest notifRequest = NotificationClientRequest.builder()
                    .codeBanque(26) // Code banque par défaut
                    .codeAgenceBct(dossier.getCodeAgenceAva() != null ? dossier.getCodeAgenceAva().intValue() : null)
                    .typePieceClient(dossier.getTypePieceClient() != null ? dossier.getTypePieceClient().intValue() : null)
                    .noPieceClient(dossier.getNoPieceClient())
                    .numDossier(dossier.getNumDossier())
                    .dateDossier(dossier.getDateDossier())
                    .racineCompte(dossier.getNumeroCompte())
                    .objet(objet + dossier.getNumDossier())
                    .message(message)
                    .senderEmail(senderEmail)
                    .build();

            log.info("NotificationClientRequest créé: codeBanque={}, codeAgenceBct={}, typePieceClient={}, noPieceClient={}, numDossier={}, senderEmail={}",
                    notifRequest.getCodeBanque(),
                    notifRequest.getCodeAgenceBct(),
                    notifRequest.getTypePieceClient(),
                    notifRequest.getNoPieceClient(),
                    notifRequest.getNumDossier(),
                    notifRequest.getSenderEmail());

            var result = apiExterneService.notifierClient(notifRequest);

            if (result != null) {
                log.info("Notification envoyée avec succès pour le dossier: {}, id email: {}, status: {}",
                        dossier.getNumDossier(), result.getId(), result.getStatus());
            } else {
                log.warn("Notification retournée null pour le dossier: {}", dossier.getNumDossier());
            }

            log.info("=== FIN ENVOI NOTIFICATION ===");

        } catch (Exception e) {
            log.error("=== ERREUR ENVOI NOTIFICATION ===");
            log.error("Erreur lors de l'envoi de la notification pour dossier {}: {} - {}",
                    dossier.getNumDossier(), e.getClass().getName(), e.getMessage(), e);
        }
    }

    /**
     * Retourne la valeur ou ZERO si null.
     */
    private BigDecimal nvl(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

}
