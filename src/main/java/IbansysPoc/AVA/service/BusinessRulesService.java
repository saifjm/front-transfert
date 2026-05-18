package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.InitiationOuvertureDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.entity.TypeDossierAva;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Service des regles metier : calculs et controles de saisie.
 */
public interface BusinessRulesService {

    // ==================== CALCULS ====================

    BigDecimal calculMvtAvaCr(Short codeTypeDosAva, BigDecimal autorise, BigDecimal baseCalcul);

    BigDecimal calculerSolde(BigDecimal mntAutorise, BigDecimal mntAvance, BigDecimal mntAutoriseBct,
                             BigDecimal mntUtilise, BigDecimal mntReserve, BigDecimal mntBlocage);


    // ==================== AIDE - DECOMPOSITION NUMERO COMPTE ====================

    // Décompose un numéro de compte (20 caractères) en [codeBanque, codeAgence, racineCompte, cleRib]
    // Retourne un tableau String[4] contenant les quatre éléments (valeurs sous forme textuelle).
    // Lève BusinessException en cas de numéro null ou de longueur incorrecte.
    String[] decomposerNumeroCompte(String numeroCompte);

    // ==================== CONTROLES DE SAISIE ====================

    String controlerAgenceAVA(String numeroCompte, InitiationOuvertureDTO dto);

    String controlerAgenceAVA(String numeroCompte, OuvertureDossierDTO dto);

    // CODE_TYPE_DOS_AVA
    TypeDossierAva controlerTypeDossier(Integer codeTypeDosAva);

    // NO_PIECE_CLIENT
    String controlerPieceClientmatfisc(Integer typePieceClient, String numeroPieceClient);



    // COMPTE_CLIENT
     String controlerNumeroCompte(Integer typePieceClient, String numeroPieceClient, String numeroCompte);



    Boolean validateActiviteTypeDossier(Integer codeTypeDosAva, Integer codeActivite);


    String controlerMatriculeFiscal(String noPieceClient);

    // CODE_ACTIVITE_secondaire_et_primaire
    boolean controlerCodeActiviteetSecondaire(Integer codeActiviteSecondaire, Integer codeTypeDosAva);

    // Autorisation BCT
    String controlerAutorisationBct(Integer numeroBct, LocalDate dateBct);

    // Seuil importation
    String controlerMontantImportation(Long mntImportation, Integer codeActivite, Short codeTypeDosAva, Integer numeroBct);

    Boolean controlerMontantsRapatries(Integer codeBanqueProvenance, BigDecimal mntAutorise, BigDecimal mntAvance, BigDecimal mntAutorisationBct, BigDecimal mntUtilise);

    // MONTANTS RAPATRIÉS

    String controlerDeclarationFiscale(String noPieceClient, Integer codeActivite, Short codeTypeDosAva, Integer numeroBct, Integer typePieceClient);

    boolean ControleCodeProduitServiceetoperation(Integer codeProduitService, Integer codeOperation);


    void controlerCompatibiliteTypeDossier(
            String noPieceClient,
            Short codeTypeDosAva
    );

    /**
     * Même contrôle de compatibilité mais vérifie AUSSI les mouvements MVT en cours (status I ou V)
     * dans OPERATIONS_DELEGUEES_MVT, en plus des dossiers existants dans OPERATIONS_DELEGUEES.
     * Cela empêche la création de deux MVT incompatibles simultanément avant application au dossier.
     */
    void controlerCompatibiliteTypeDossierMvt(
            String noPieceClient,
            Short codeTypeDosAva
    );

    Boolean VerifFond(BigDecimal mntReserve, BigDecimal solde);
}
