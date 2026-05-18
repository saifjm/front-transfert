package IbansysPoc.AVA.service.impl;

import IbansysPoc.AVA.DTO.AgenceDTO;
import IbansysPoc.AVA.DTO.DeclarationFiscaleDTO;
import IbansysPoc.AVA.DTO.InitiationOuvertureDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.entity.TypeDossierAva;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.repository.AvaActiviteRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeMvtRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.repository.TypeDossierAvaRepository;
import IbansysPoc.AVA.service.ApiExterneService;
import IbansysPoc.AVA.service.BusinessRulesService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Consumer;


@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessRulesServiceImpl implements BusinessRulesService {

    // ==================== DEPENDANCES ====================

    private final TypeDossierAvaRepository typeDossierAvaRepository;
    private final OperationsDelegueeRepository operationsDelegueeRepository;
    private final OperationsDelegueeMvtRepository operationsDelegueeMvtRepository;
    private final AvaActiviteRepository avaActiviteRepository;
    private final ApiExterneService apiExterneService;

    // ==================== CONSTANTES ====================

    private static final String OK = "OK";

    private static final int CODE_ACTIVITE_TYPE4_OBLIGATOIRE = 26;

    private static final long MONTANT_IMPORTATION_PLAFOND = 200_000L;
    private static final int ACTIVITE_IMPORTATION_SENSIBLE = 24;
    private static final short TYPE_DOSSIER_IMPORTATION_SENSIBLE = 3;

    private static final BigDecimal CENT = new BigDecimal("100");
    private static final BigDecimal SEUIL_CA_FISCAL_MIN = new BigDecimal("500000");

    private static final String MATRICULE_VECTEUR = "ABCDEFGHJKLMNPQRSTVWXYZ";

    private static final List<Short> TYPES_DOSSIER_INCOMPATIBLES_1_3_4_5 = List.of((short) 1, (short) 3, (short) 4, (short) 5);
    private static final List<Short> TYPES_DOSSIER_INCOMPATIBLES_3_4_5 = List.of((short) 3, (short) 4, (short) 5);

    // ==================== CALCULS ====================

    @Override
    public BigDecimal calculMvtAvaCr(Short codeTypeDosAva, BigDecimal autorise, BigDecimal baseCalcul) {
        if (baseCalcul == null) {
            return null;
        }

        Optional<TypeDossierAva> typeDossierOpt =
                typeDossierAvaRepository.findByCodeTypeDosAvaAndDateFinApplicationIsNull(codeTypeDosAva);

        if (typeDossierOpt.isEmpty()) {
            return null;
        }

        TypeDossierAva typeDossier = typeDossierOpt.get();
        BigDecimal tauxAva = typeDossier.getTauxAva();
        BigDecimal droitMaximum = typeDossier.getDroitMaximum();

        BigDecimal pAutorise = nvl(autorise);
        BigDecimal pBaseCalcul = nvl(baseCalcul);

        if (tauxAva != null) {
            BigDecimal calculBase = pBaseCalcul.multiply(tauxAva).divide(CENT, 3, RoundingMode.DOWN);

            if (nvl(droitMaximum).compareTo(BigDecimal.ZERO) != 0) {
                BigDecimal total = pAutorise.add(calculBase);

                if (total.compareTo(droitMaximum) > 0) {
                    return pAutorise.compareTo(droitMaximum) <= 0
                            ? droitMaximum.subtract(pAutorise)
                            : BigDecimal.ZERO;
                }
                return calculBase;
            }
            return calculBase;
        }

        return droitMaximum;
    }

    @Override
    public BigDecimal calculerSolde(
            BigDecimal mntAutorise,
            BigDecimal mntAvance,
            BigDecimal mntAutoriseBct,
            BigDecimal mntUtilise,
            BigDecimal mntReserve,
            BigDecimal mntBlocage
    ) {
        return nvl(mntAutorise)
                .add(nvl(mntAvance))
                .add(nvl(mntAutoriseBct))
                .subtract(nvl(mntUtilise))
                .subtract(nvl(mntReserve))
                .subtract(nvl(mntBlocage));
    }

    // ==================== CONTROLES DE SAISIE ====================

    @Override
    public String[] decomposerNumeroCompte(String numeroCompte) {
        if (numeroCompte == null) {
            throw new BusinessException("NUMERO_COMPTE_OBLIGATOIRE", "Le numéro de compte est obligatoire");
        }
        String n = numeroCompte.trim();
        if (n.length() != 20) {
            throw new BusinessException("NUMERO_COMPTE_INVALIDE", "Le numéro de compte doit contenir exactement 20 caractères");
        }

        String codeBanque = n.substring(0, 2);
        String codeAgence = n.substring(2, 5);
        String racineCompte = n.substring(5, 18);
        String cleRib = n.substring(18, 20);

        return new String[]{codeBanque, codeAgence, racineCompte, cleRib};
    }

    @Override
    public String controlerAgenceAVA(String numeroCompte, InitiationOuvertureDTO dto) {
        return controlerAgenceAVAInternal(numeroCompte, dto::setCodeAgenceAva);
    }

    @Override
    public String controlerAgenceAVA(String numeroCompte, OuvertureDossierDTO dto) {
        return controlerAgenceAVAInternal(numeroCompte, dto::setCodeAgenceAva);
    }

    private String controlerAgenceAVAInternal(String numeroCompte, Consumer<Short> codeAgenceAvaSetter) {

        // On décompose le numéro de compte pour récupérer codeBanque et codeAgenceBCT
        String[] parts = decomposerNumeroCompte(numeroCompte);
        String codeBanqueStr = parts[0];
        String codeAgenceBCTStr = parts[1];

        Integer codeBanque;
        Integer codeAgenceBCT;
        try {
            codeBanque = Integer.valueOf(codeBanqueStr);
            codeAgenceBCT = Integer.valueOf(codeAgenceBCTStr);
        } catch (NumberFormatException e) {
            throw new BusinessException(
                    "NUMERO_COMPTE_INVALIDE",
                    "Le numéro de compte contient des codes banque/agence non numériques"
            );
        }

        if (codeBanque == null || codeAgenceBCT == null) {
            throw new BusinessException("AGENCE_OBLIGATOIRE", "Code Banque et Code Agence BCT obligatoires");
        }

        AgenceDTO agence = apiExterneService.getAgenceByCode(codeBanque, codeAgenceBCT);
        if (agence == null) {
            throw new BusinessException(
                    "AGENCE_INEXISTANTE",
                    "Agence inexistante pour le code banque " + codeBanque + " et code agence BCT " + codeAgenceBCT
            );
        }

        codeAgenceAvaSetter.accept(codeAgenceBCT.shortValue());
        return OK;
    }

    @Override
    public TypeDossierAva controlerTypeDossier(Integer codeTypeDossier) {
        if (codeTypeDossier == null) {
            throw new BusinessException("CODE_TYPE_DOSSIER_OBLIGATOIRE", "Code type dossier obligatoire");
        }

        Optional<TypeDossierAva> typeDossierOpt =
                typeDossierAvaRepository.findByCodeTypeDosAvaAndDateFinApplicationIsNull(codeTypeDossier.shortValue());

        if (typeDossierOpt.isEmpty()) {
            throw new BusinessException("CODE_TYPE_DOSSIER_INEXISTANT", "Code type dossier inexistant. Consulter la liste !");
        }

        return typeDossierOpt.get();
    }

    @Override
    public String controlerPieceClientmatfisc(Integer typePieceClient, String numeroPieceClient) {
        if (typePieceClient == null || numeroPieceClient == null || numeroPieceClient.trim().isEmpty()) {
            throw new BusinessException("PIECE_CLIENT_OBLIGATOIRE", "Type et numéro de pièce client obligatoires");
        }

        Integer resultat = apiExterneService.verifierPersonne(typePieceClient, numeroPieceClient);

        if (resultat == null || resultat != 0) {
            throw new BusinessException(
                    "CLIENT_INEXISTANT",
                    "Client inexistant pour le type de pièce " + typePieceClient + " et numéro " + numeroPieceClient
            );
        }

        if (!isMatriculeFiscalValide(numeroPieceClient)) {
            throw new BusinessException("MATRICULE_FISCAL_INVALIDE", "Matricule Fiscal Invalide");
        }

        return OK;
    }

    @Override
    public String controlerNumeroCompte(
            Integer typePieceClient,
            String numeroPieceClient,
            String numeroCompte
    ) {

        ParsedCompte parsed = parseNumeroCompte(numeroCompte);
        Integer codeBanque = parsed.codeBanque;
        Integer codeAgenceBCT = parsed.codeAgenceBCT;
        String racineCompte = parsed.racineCompte;
        Integer cleRib = parsed.cleRib;

        if (codeAgenceBCT == null || racineCompte == null || racineCompte.trim().isEmpty() || cleRib == null) {
            throw new BusinessException("NUMERO_COMPTE_INVALIDE", "Numero de Compte Invalide");
        }

        // Vérifier l'existence du compte pour le client donné via API externe
        if (numeroPieceClient != null && !numeroPieceClient.trim().isEmpty()) {
            boolean compteExiste = apiExterneService.existsCompteByCombinaison(
                    numeroPieceClient, codeAgenceBCT, racineCompte, cleRib);
            if (!compteExiste) {
                throw new BusinessException("COMPTE_INEXISTANT",
                        "La combinaison compte n'existe pas pour ce client (noPieceClient: " + numeroPieceClient +
                                ", codeAgenceBct: " + codeAgenceBCT + ", racineCompte: " + racineCompte + ", cleRib: " + cleRib + ")");
            }
        }

        // Construire le RIB complet pour validation
        // Appel API pour vérifier l'existence du code banque via REF
        Optional<Integer> apiCodeBanque = Optional.empty();
        try {
            Optional<Integer> result = apiExterneService.getcodeBanque(codeBanque);
            apiCodeBanque = Objects.requireNonNullElse(result, Optional.empty());
        } catch (Exception e) {
            log.warn("Erreur lors de l'appel getcodeBanque: {}", e.getMessage());
            apiCodeBanque = Optional.empty();
        }

        // Si REF retourne 404 / ne trouve pas le code banque, cela doit être bloquant
        if (apiCodeBanque.isEmpty()) {
            // Lever une BusinessException (bloquant) — conforme à votre demande
            throw new BusinessException("CODE_BANQUE_INEXISTANTE", "Code banque introuvable via REF: " + codeBanque);
        }

        // Déterminer la valeur numérique du code banque à utiliser pour le RIB (ici présent obligatoirement)
        int codeBanqueValue = apiCodeBanque.get();

        String codeBanqueStr = String.format("%02d", codeBanqueValue);
        String codeAgenceStr = String.format("%03d", codeAgenceBCT);
        String cleRibStr = String.format("%02d", cleRib);
        String compteRib = codeBanqueStr + codeAgenceStr + racineCompte + cleRibStr;

        // Valider le RIB complet (format + clé de contrôle)
        String erreurRib = validerRib(compteRib);
        if (erreurRib != null) {
            throw new BusinessException("RIB_INVALIDE", erreurRib);
        }

        return OK;
    }

    @Override
    public Boolean validateActiviteTypeDossier(Integer codeTypeDosAva, Integer codeActivite) {
        if (codeTypeDosAva == null) {
            throw new BusinessException("CODE_TYPE_DOSSIER_OBLIGATOIRE", "Code type dossier AVA obligatoire");
        }
        if (codeActivite == null) {
            throw new BusinessException("CODE_ACTIVITE_OBLIGATOIRE", "Code activité obligatoire");
        }

        // Si codeTypeDosAva = 1 ou 2 : vérifier l'existence via API externe
        if (codeTypeDosAva == 1 || codeTypeDosAva == 2) {
            boolean activiteExiste = apiExterneService.verifierActiviteParCode(codeActivite);
            if (!activiteExiste) {
                throw new BusinessException(
                        "CODE_ACTIVITE_INEXISTANT",
                        "Code activité " + codeActivite + " inexistant pour le type dossier " + codeTypeDosAva
                );
            }
            return true;
        }

        // Si codeTypeDosAva = 3 ou 5 : vérifier l'existence dans la table AVA_ACTIVITE
        if (codeTypeDosAva == 3 || codeTypeDosAva == 5) {
            boolean activiteExiste = avaActiviteRepository.existsByCodeActivite(codeActivite);
            if (!activiteExiste) {
                throw new BusinessException(
                        "CODE_ACTIVITE_AVA_INEXISTANT",
                        "Code activité " + codeActivite + " inexistant dans la table AVA_ACTIVITE pour le type dossier " + codeTypeDosAva
                );
            } else {

            }
            return true;
        }

        // Si codeTypeDosAva = 4 : le code activité doit être égal à 26
        if (codeTypeDosAva == 4) {
            if (codeActivite != CODE_ACTIVITE_TYPE4_OBLIGATOIRE) {
                throw new BusinessException(
                        "CODE_ACTIVITE_INVALIDE_TYPE4",
                        "Pour le type dossier 4, le code activité doit être égal à 26. Valeur reçue: " + codeActivite
                );
            }
            return true;
        }

        return true;
    }

    @Override
    public String controlerMatriculeFiscal(String noPieceClient) {
        if (noPieceClient == null || noPieceClient.trim().isEmpty()) {
            throw new BusinessException("MATRICULE_FISCAL_OBLIGATOIRE", "Matricule Fiscal Obligatoire");
        }

        if (!isMatriculeFiscalValide(noPieceClient)) {
            throw new BusinessException("MATRICULE_FISCAL_INVALIDE", "Matricule Fiscal Invalide");
        }

        return OK;
    }

    @Override
    public boolean controlerCodeActiviteetSecondaire(Integer codeActiviteSecondaire, Integer codeTypeDosAva) {

        if (codeTypeDosAva == 3 || codeTypeDosAva == 4) {
            boolean activiteExiste = apiExterneService.verifierActiviteParCode(codeActiviteSecondaire);
            if (!activiteExiste) {
                throw new BusinessException(
                        "CODE_SOUS_ACTIVITE_INEXISTANT",
                        "Code Sous activité  " + codeActiviteSecondaire + " inexistant pour le type dossier " + codeTypeDosAva
                );
            } else if ((codeTypeDosAva == 1|| codeTypeDosAva == 2|| codeTypeDosAva == 5)&& codeTypeDosAva != null) {
                throw new BusinessException(
                        "CODE_SOUS_ACTIVITE_NON_AUTORISE",
                        "Code Sous activité non autorisé pour le type dossier " + codeTypeDosAva
                );

            }
            return true;
        }
        return true;
    }

    @Override
    public String controlerAutorisationBct(Integer numeroBct, LocalDate dateBct) {
        boolean numeroPresent = numeroBct != null;
        boolean datePresente = dateBct != null;

        if (numeroPresent && !datePresente) {
            throw new BusinessException("DATE_BCT_OBLIGATOIRE", "Date autorisation BCT non renseignee");
        }
        if (!numeroPresent && datePresente) {
            throw new BusinessException("NUMERO_BCT_OBLIGATOIRE", "Numero autorisation BCT non renseigne");
        }
        return OK;
    }

    @Override
    public String controlerMontantImportation(Long mntImportation, Integer codeActivite, Short codeTypeDosAva, Integer numeroBct) {
        long montant = mntImportation != null ? mntImportation : 0L;

        if (montant == 0L&& Integer.valueOf(ACTIVITE_IMPORTATION_SENSIBLE).equals(codeActivite)
                && Short.valueOf(TYPE_DOSSIER_IMPORTATION_SENSIBLE).equals(codeTypeDosAva)) {
            throw new BusinessException("MONTANT_IMPORTATION_OBLIGATOIRE", "Montant importation obligatoire");
        } else if (montant < MONTANT_IMPORTATION_PLAFOND
                && Integer.valueOf(ACTIVITE_IMPORTATION_SENSIBLE).equals(codeActivite)
                && Short.valueOf(TYPE_DOSSIER_IMPORTATION_SENSIBLE).equals(codeTypeDosAva)) {

                    if (numeroBct == null) {
                        throw new BusinessException("Total importations inferieur au montant tolere");
                    }
            return "ALERTE: Total importations au dessous du montant tolere. Verifier l'autorisation.";
        }
        return OK;
    }

    @Override
    public Boolean controlerMontantsRapatries(
            Integer codeBanqueProvenance,
            BigDecimal mntAutorise,
            BigDecimal mntAvance,
            BigDecimal mntAutorisationBct,
            BigDecimal mntUtilise
    ) {
        boolean codeBanquePresent = codeBanqueProvenance != null;
        boolean mntAutorisePresent = mntAutorise != null;
        boolean mntAvancePresent = mntAvance != null;
        boolean mntAutorisationBctPresent = mntAutorisationBct != null;
        boolean mntUtilisePresent = mntUtilise != null;

        boolean auMoinsUnPresent = codeBanquePresent || mntAutorisePresent || mntAvancePresent || mntAutorisationBctPresent || mntUtilisePresent;

        if (!auMoinsUnPresent) {
            return true;
        }

        if (!codeBanquePresent) {
            throw new BusinessException(
                    "CODE_BANQUE_PROVENANCE_OBLIGATOIRE",
                    "Code banque de provenance obligatoire lorsque des montants rapatriés sont renseignés"
            );
        }
        if (!mntAutorisePresent) {
            throw new BusinessException("MNT_AUTORISE_OBLIGATOIRE", "Montant autorisé obligatoire lorsque des montants rapatriés sont renseignés");
        }
        if (!mntAvancePresent) {
            throw new BusinessException("MNT_AVANCE_OBLIGATOIRE", "Montant avance obligatoire lorsque des montants rapatriés sont renseignés");
        }
        if (!mntAutorisationBctPresent) {
            throw new BusinessException("MNT_Autorisation_BCT_OBLIGATOIRE", "Montant Autorisation BCT obligatoire lorsque des montants rapatriés sont renseignés");
        }
        if (!mntUtilisePresent) {
            throw new BusinessException("MNT_UTILISE_OBLIGATOIRE", "Montant utilisé obligatoire lorsque des montants rapatriés sont renseignés");
        }

        boolean banqueExiste = apiExterneService.verifierBanqueParCode(codeBanqueProvenance.shortValue());
        if (!banqueExiste) {
            throw new BusinessException("BANQUE_PROVENANCE_INEXISTANTE", "Code banque de provenance inexistant: " + codeBanqueProvenance);
        }

        return true;
    }

    // ==================== CONTROLES METIER ====================

    @Override
    public String controlerDeclarationFiscale(
            String noPieceClient,
            Integer codeActivite,
            Short codeTypeDosAva,
            Integer numeroBct,
            Integer typePieceClient
    ) {
        // Seulement pour code_type_dos_ava = 3
        if (codeTypeDosAva == null || codeTypeDosAva != 3) {
            return OK;
        }

        int anneeN1 = LocalDate.now().getYear() - 1;
        int anneeN2 = LocalDate.now().getYear() - 2;

        String erreurN1 = verifierDeclarationAnnee(
                noPieceClient, anneeN1, codeActivite, codeTypeDosAva, typePieceClient, numeroBct, SEUIL_CA_FISCAL_MIN
        );

        if (erreurN1 == null) {
            return OK;
        }

        if (!erreurN1.startsWith("ALERTE:") && !erreurN1.equals("NO_DATA_CHECK_N2")) {
            throw new BusinessException("DECLARATION_FISCALE_ERREUR", erreurN1);
        }

        if (erreurN1.equals("NO_DATA_CHECK_N2")) {
            String erreurN2 = verifierDeclarationAnneeN2(
                    noPieceClient, anneeN2, codeActivite, codeTypeDosAva, typePieceClient, numeroBct, SEUIL_CA_FISCAL_MIN
            );

            if (erreurN2 == null) {
                return OK;
            }
            if (!erreurN2.startsWith("ALERTE:")) {
                throw new BusinessException("DECLARATION_FISCALE_ERREUR", erreurN2);
            }
            return erreurN2;
        }

        return erreurN1;
    }

    @Override
    public boolean ControleCodeProduitServiceetoperation(Integer codeProduitService, Integer codeOperation) {

        if (codeProduitService != null && codeOperation != null) {
            boolean produitOperationExiste = apiExterneService.existsOperationByProduitAndOperation(codeProduitService, codeOperation);
            if (!produitOperationExiste) {
                throw new BusinessException(
                        "CODE_PRODUIT_SERVICE_INEXISTANT",
                        "Code produit/service " + codeProduitService + " inexistant."
                );
            }
            return true;
        }
        return false;
    }

    /**
     * Vérifie la déclaration fiscale pour une année donnée (N-1).
     */
    private String verifierDeclarationAnnee(
            String noPieceClient,
            int annee,
            Integer codeActivite,
            Short codeTypeDosAva,
            Integer typePieceClient,
            Integer numeroBct,
            BigDecimal seuilMinimum
    ) {
        DeclarationFiscaleDTO declaration = apiExterneService.getEtatCaFiscal(noPieceClient, typePieceClient);

        if (declaration == null) {
            LocalDate dateLimite = LocalDate.of(LocalDate.now().getYear(), 7, 15);
            boolean apres15Juillet = LocalDate.now().isAfter(dateLimite);

            if (apres15Juillet) {
                if (numeroBct == null) {
                    return "Declaration fiscale de l'annee " + annee + " non presentee";
                }
                return "ALERTE: Declaration fiscale de l'annee " + annee + " non presentee. Verifier l'autorisation.";
            }
            return "NO_DATA_CHECK_N2";
        }

        String etat = declaration.getEtat();
        if (!"V".equals(etat)) {
            return "Declaration fiscale de l'annee " + annee + " doit d'abord etre validee";
        }

        if (codeActivite != null && codeActivite == 23 && codeTypeDosAva != null && codeTypeDosAva == 3) {
            BigDecimal mntCaFiscal = declaration.getMntCaFiscal() != null ? declaration.getMntCaFiscal() : BigDecimal.ZERO;

            if (mntCaFiscal.compareTo(seuilMinimum) < 0) {
                if (numeroBct == null) {
                    return "Chiffre d'affaire fiscal minimum de l'annee " + annee + " non atteint";
                }
                return "ALERTE: Chiffre d'affaire fiscal minimum de l'annee " + annee + " non atteint. Verifier l'autorisation.";
            }
        }

        return null;
    }

    /**
     * Vérifie la déclaration fiscale pour l'année N-2.
     */
    private String verifierDeclarationAnneeN2(
            String noPieceClient,
            int annee,
            Integer codeActivite,
            Short codeTypeDosAva,
            Integer typePieceClient,
            Integer numeroBct,
            BigDecimal seuilMinimum
    ) {
        DeclarationFiscaleDTO declaration = apiExterneService.getEtatCaFiscal2(noPieceClient, typePieceClient);

        if (declaration == null) {
            if (numeroBct == null) {
                return "Declaration fiscale de l'annee " + annee + " non presentee";
            }
            return "ALERTE: Declaration fiscale de l'annee " + annee + " non presentee. Verifier l'autorisation.";
        }

        String etat = declaration.getEtat();
        if (!"V".equals(etat)) {
            return "Declaration fiscale de l'annee " + annee + " doit d'abord etre validee";
        }

        if (codeActivite != null && codeActivite == 23 && codeTypeDosAva != null && codeTypeDosAva == 3) {
            BigDecimal mntCaFiscal = declaration.getMntCaFiscal() != null ? declaration.getMntCaFiscal() : BigDecimal.ZERO;

            if (mntCaFiscal.compareTo(seuilMinimum) < 0) {
                if (numeroBct == null) {
                    return "Chiffre d'affaire fiscal minimum non atteint";
                }
                return "ALERTE: Chiffre d'affaire fiscal minimum non atteint. Verifier l'autorisation.";
            }
        }

        return null;
    }

    // ==================== CONTROLE COMPATIBILITE TYPE DOSSIER ====================

    @Override
    public void controlerCompatibiliteTypeDossier(
            String noPieceClient,
            Short codeTypeDosAva
    ) {
        if (noPieceClient == null || codeTypeDosAva == null) {
            return;
        }

        if (TYPES_DOSSIER_INCOMPATIBLES_1_3_4_5.contains(codeTypeDosAva)) {

            boolean existe = operationsDelegueeMvtRepository
                    .existsByNoPieceClientAndCodeOperationAndCodeTypeDosAvaIn(
                            noPieceClient,
                            200,
                            TYPES_DOSSIER_INCOMPATIBLES_1_3_4_5
                    );

            if (existe) {
                throw new BusinessException(
                        "DOSSIER_INCOMPATIBLE",
                        "Un dossier existe déjà pour ce client avec un type incompatible (1,3,4,5)"
                );
            }
        }

        if (codeTypeDosAva == 2) {

            boolean existe = operationsDelegueeRepository
                    .existsByNoPieceClientAndCodeTypeDosAvaIn(
                            noPieceClient,
                            TYPES_DOSSIER_INCOMPATIBLES_3_4_5
                    );

            if (existe) {
                throw new BusinessException(
                        "DOSSIER_INCOMPATIBLE",
                        "Impossible de créer un dossier de type 2 : un dossier (3,4,5) existe déjà pour ce client"
                );
            }
        }

        controlerCompatibiliteTypeDossierMvt(noPieceClient, codeTypeDosAva);
    }

    // ==================== CONTROLE COMPATIBILITE TYPE DOSSIER SUR MVT ====================

    @Override
    public void controlerCompatibiliteTypeDossierMvt(
            String noPieceClient,
            Short codeTypeDosAva
    ) {
        if (noPieceClient == null || codeTypeDosAva == null) {
            return;
        }

        if (TYPES_DOSSIER_INCOMPATIBLES_1_3_4_5.contains(codeTypeDosAva)) {

            boolean existeMvt = operationsDelegueeMvtRepository
                    .existsByNoPieceClientAndCodeOperationAndCodeTypeDosAvaIn(
                            noPieceClient,
                            200,
                            TYPES_DOSSIER_INCOMPATIBLES_1_3_4_5
                    );

            if (existeMvt) {
                throw new BusinessException(
                        "DOSSIER_INCOMPATIBLE_MVT",
                        "Un mouvement MVT en cours existe déjà pour ce client avec un type incompatible (1,3,4,5)"
                );
            }
        }

        if (codeTypeDosAva == 2) {

           boolean existeMvt = operationsDelegueeMvtRepository
                    .existsByNoPieceClientAndCodeOperationAndCodeTypeDosAvaIn(
                            noPieceClient,
                            200,
                            TYPES_DOSSIER_INCOMPATIBLES_3_4_5
                    );
            if (existeMvt) {
                throw new BusinessException(
                        "DOSSIER_INCOMPATIBLE_MVT",
                        "Impossible de créer un MVT de type 2 : un mouvement MVT (3,4,5) en cours existe déjà pour ce client"
                );
            }
        }
    }

    @Override
    public Boolean VerifFond(BigDecimal mntReserve, BigDecimal solde) {

            if (mntReserve != null && solde != null) {
                if (mntReserve.compareTo(solde) > 0) {
                    throw new BusinessException(
                            "FONDS_INSUFFISANTS",
                            "Le montant de la réserve dépasse le solde disponible"
                    );
                }
            }
        return null;
    }

    // ==================== UTILITAIRES ====================

    private BigDecimal nvl(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private void ajouterSiErreur(List<String> erreurs, String erreur) {
        if (erreur != null) {
            erreurs.add(erreur);
        }
    }

    /**
     * Vérifie la validité du matricule fiscal.
     */
    private boolean isMatriculeFiscalValide(String matricule) {
        // Vérifier si null
        if (matricule == null) {
            return false;
        }

        // La chaîne en entrée est vide alors considérée comme valide
        if (matricule.trim().isEmpty()) {
            return true;
        }

        // La chaîne en entrée est de longueur <> 8 alors non valide
        if (matricule.length() != 8) {
            return false;
        }

        // Vérifier si les 7 premiers caractères sont numériques
        String partieNumerique = matricule.substring(0, 7);
        for (char c : partieNumerique.toCharArray()) {
            if (!Character.isDigit(c)) {
                return false;
            }
        }

        // Calculer la clé
        try {
            int somme = 0;
            for (int i = 1; i <= 7; i++) {
                int chiffre = Character.getNumericValue(matricule.charAt(7 - i));
                somme += chiffre * i;
            }

            int index = (somme % 23);
            char cleCalculee = MATRICULE_VECTEUR.charAt(index);
            char cleFournie = matricule.charAt(7);

            return cleFournie == cleCalculee;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Valide uniquement le format d'un RIB (longueur et caractères numériques).
     * Ne vérifie PAS la clé de contrôle car l'API existsCompteByCombinaison le fait déjà.
     *
     * @param compteRib Le RIB à valider
     * @return null si format valide, message d'erreur sinon
     */
    private String validerFormatRib(String compteRib) {
        if (compteRib == null || compteRib.length() != 20) {
            return "RIB invalide: longueur incorrecte (doit être 20 caractères)";
        }

        if (compteRib.startsWith("TN")) {
            return "Format IBAN détecté (commence par TN), utilisez le format RIB";
        }

        for (int i = 0; i < 20; i++) {
            char c = compteRib.charAt(i);
            if (c < '0' || c > '9') {
                return "RIB invalide: caractères non numériques détectés";
            }
        }

        return null; // Format valide
    }

    /*
     * Contrôle la validité d'un RIB (Relevé d'Identité Bancaire).
     * Algorithme traduit depuis la fonction PL/SQL CTR_RIB.
     *
     * @param compteRib Le RIB à valider (20 caractères)
     * @return 0 si valide, autre code d'erreur sinon:
     *         1 = Longueur incorrecte (doit être 20)
     *         4 = Clé RIB invalide
     *         5 = Caractère non numérique détecté
     *         9 = Commence par 'TN' (IBAN tunisien, format différent)
     */
    private int controlerRib(String compteRib) {
        System.out.println("========== DEBUT CONTROLE RIB ==========");
        System.out.println("RIB complet: " + compteRib);

        // if NVL(length(P_compte_rib), 0) != 20 then return 1;
        if (compteRib == null || compteRib.length() != 20) {
            System.out.println("ERREUR: Longueur incorrecte");
            return 1;
        }

        // elsif substr(P_compte_rib, 1, 2) = 'TN' then return 9;
        if (compteRib.startsWith("TN")) {
            System.out.println("ERREUR: Format IBAN détecté");
            return 9;
        }

        // FOR i in 1..20 : numeric only else return 5;
        for (int idx = 0; idx < 20; idx++) {
            char c = compteRib.charAt(idx);
            if (c < '0' || c > '9') {
                System.out.println("ERREUR: Caractère non numérique à la position " + idx);
                return 5;
            }
        }

        // ---- Traduction fidèle des calculs PL/SQL ----
        // i := to_number(substr(P_compte_rib,1,10));
        long i = Long.parseLong(compteRib.substring(0, 10));
        System.out.println("Étape 1: i = substring(0,10) = " + compteRib.substring(0, 10) + " = " + i);

        // reste := floor(i - (floor(i/97) * 97));
        long reste = i - ((i / 97L) * 97L);
        System.out.println("Étape 2: reste = i - (floor(i/97) * 97) = " + i + " - (" + (i / 97L) + " * 97) = " + i + " - " + ((i / 97L) * 97L) + " = " + reste);

        // reste := floor(((reste/100) - floor (reste/100)) * 100);
        // En PL/SQL: manipulation décimale -> équivalent robuste en Java
        // ((reste/100) - floor(reste/100)) * 100 == reste % 100
        long resteAvant = reste;
        reste = reste % 100;
        System.out.println("Étape 3: reste = reste % 100 = " + resteAvant + " % 100 = " + reste);

        String wchar = twoDigits(reste);
        System.out.println("Étape 4: wchar = twoDigits(" + reste + ") = " + wchar);

        // i := to_number(wchar || substr(P_compte_rib,11,8) || '00');
        // substr(P_compte_rib,11,8) en PL/SQL = positions 11..18 (1-based)
        // En Java substring(10, 18) (0-based, end exclusive)
        String part = compteRib.substring(10, 18);
        System.out.println("Étape 5: part = substring(10,18) = " + part);

        String concatenation = wchar + part + "00";
        long i2 = Long.parseLong(concatenation);
        System.out.println("Étape 6: i2 = wchar + part + '00' = " + wchar + " + " + part + " + 00 = " + concatenation + " = " + i2);

        // reste := floor(i - (floor(i/97) * 97));
        long reste2 = i2 - ((i2 / 97L) * 97L);
        System.out.println("Étape 7: reste2 = i2 - (floor(i2/97) * 97) = " + i2 + " - (" + (i2 / 97L) + " * 97) = " + i2 + " - " + ((i2 / 97L) * 97L) + " = " + reste2);

        // reste := 97 - reste;
        long reste2Avant = reste2;
        reste2 = 97L - reste2;
        System.out.println("Étape 8: reste2 = 97 - reste2 = 97 - " + reste2Avant + " = " + reste2);

        // reste := floor (((reste/100) - floor (reste/100)) * 100);
        long reste2Avant2 = reste2;
        reste2 = reste2 % 100;
        System.out.println("Étape 9: reste2 = reste2 % 100 = " + reste2Avant2 + " % 100 = " + reste2);

        String expectedKey = twoDigits(reste2);
        System.out.println("Étape 10: expectedKey = twoDigits(" + reste2 + ") = " + expectedKey);

        // if (substr(P_compte_rib,19,2) != wchar) then return 4;
        // substr(P_compte_rib,19,2) = positions 19..20 (1-based)
        // Java substring(18,20)
        String actualKey = compteRib.substring(18, 20);
        System.out.println("Étape 11: actualKey = substring(18,20) = " + actualKey);

        System.out.println("========== COMPARAISON ==========");
        System.out.println("Clé attendue (expectedKey): " + expectedKey);
        System.out.println("Clé fournie (actualKey): " + actualKey);

        if (!actualKey.equals(expectedKey)) {
            System.out.println("RESULTAT: ERREUR - Clé de contrôle incorrecte");
            System.out.println("========== FIN CONTROLE RIB ==========");
            return 4;
        }

        System.out.println("RESULTAT: VALIDE");
        System.out.println("========== FIN CONTROLE RIB ==========");
        return 0;
    }

    /**
     * Formate un nombre sur 2 chiffres avec padding de zéro.
     */
    private String twoDigits(long n) {
        n = Math.abs(n) % 100;
        return (n < 10) ? ("0" + n) : Long.toString(n);
    }

    /**
     * Valide un RIB et retourne un message d'erreur si invalide.
     *
     * @param compteRib Le RIB à valider
     * @return null si valide, message d'erreur sinon
     */
    public String validerRib(String compteRib) {
        int resultat = controlerRib(compteRib);

        switch (resultat) {
            case 0:
                return null;
            case 1:
                return "RIB invalide: longueur incorrecte (doit être 20 caractères)";
            case 4:
                return "RIB invalide: clé de contrôle incorrecte";
            case 5:
                return "RIB invalide: caractères non numériques détectés";
            case 9:
                return "Format IBAN détecté (commence par TN), utilisez le format RIB";
            default:
                return "RIB invalide";
        }
    }

    /**
     * Vérifie si un RIB est valide.
     *
     * @param compteRib Le RIB à valider
     * @return true si valide, false sinon
     */
    public boolean isRibValide(String compteRib) {
        return controlerRib(compteRib) == 0;
    }

    // ==================== HELPERS (PARSING COMPTE) ====================

    private ParsedCompte parseNumeroCompte(String numeroCompte) {
        // On décompose le numéro de compte pour récupérer codeBanque et codeAgenceBCT
        String[] parts = decomposerNumeroCompte(numeroCompte);
        String codeBanqueStr1 = parts[0];
        String codeAgenceBCTStr1 = parts[1];
        String racineCompte = parts[2];
        String cleRibStr1 = parts[3];

        Integer codeBanque;
        Integer codeAgenceBCT;
        Integer cleRib;
        try {
            codeBanque = Integer.valueOf(codeBanqueStr1);
            codeAgenceBCT = Integer.valueOf(codeAgenceBCTStr1);
            racineCompte = racineCompte.trim();
            cleRib = Integer.valueOf(cleRibStr1);
        } catch (NumberFormatException e) {
            throw new BusinessException(
                    "NUMERO_COMPTE_INVALIDE",
                    "Le numéro de compte contient des codes banque/agence non numériques"
            );
        }

        return new ParsedCompte(codeBanque, codeAgenceBCT, racineCompte, cleRib);
    }

    private static final class ParsedCompte {
        private final Integer codeBanque;
        private final Integer codeAgenceBCT;
        private final String racineCompte;
        private final Integer cleRib;

        private ParsedCompte(Integer codeBanque, Integer codeAgenceBCT, String racineCompte, Integer cleRib) {
            this.codeBanque = codeBanque;
            this.codeAgenceBCT = codeAgenceBCT;
            this.racineCompte = racineCompte;
            this.cleRib = cleRib;
        }
    }

    //##################################################################################################################################################################


}
