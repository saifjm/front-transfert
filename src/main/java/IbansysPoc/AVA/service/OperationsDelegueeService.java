package IbansysPoc.AVA.service;

import java.util.List;
import java.util.Optional;

import org.springframework.transaction.annotation.Transactional;

import IbansysPoc.AVA.DTO.AutorisationBctDTO;
import IbansysPoc.AVA.DTO.DossierValideDTO;
import IbansysPoc.AVA.DTO.LeveeSuspensionDTO;
import IbansysPoc.AVA.DTO.OperationsDelegueeSummaryDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.DTO.SuspensionDTO;
import IbansysPoc.AVA.DTO.SuspensionDataDTO;
import IbansysPoc.AVA.entity.OperationsDeleguee;

public interface OperationsDelegueeService {

    OuvertureDossierDTO ValidationDossier(Integer numDosier);

    /**
     * Applique un mouvement validé (status V) au dossier (projection).
     * Lock pessimiste sur le dossier. Idempotent (si dossier existe → UPDATE).
     * Ne touche PAS le status du MVT (c'est le caller qui le met à A ou E).
     */
    void applyMvtToDossier(Integer numDossier);

     /**
     * Applique TOUTES les opérations V/E d'un dossier dans l'ordre chronologique.
     * Lock pessimiste sur le dossier → sérialisation garantie.
     * Chaque MVT est appliqué via applyOne (idempotent).
     */
    void applyForDossier(Integer numDossier);

    /**
     * Applique UN mouvement au dossier. Idempotent : si déjà A → skip.
     * Projette MVT → Dossier + relations + recalcul solde.
     * Si succès → status A. Si erreur → status E.
     */
    void applyOne(Long refOperation);

    /**
     * Applique un mouvement FV (Frais de Voyage) au dossier.
     * Met à jour UNIQUEMENT mnt_utilise et solde.
     *
     * @param numDossier Le numéro du dossier à mettre à jour
     * @param refOperation La référence de l'opération FV validée (status V)
     */
    void applyFVToDossier(Integer numDossier, Long refOperation);

    /**
     * Applique un mouvement RC (Rétrocession) au dossier.
     * Met à jour mnt_utilise (↓), solde (↑) et dernier_num_mvt_ava (↑).
     * Lock pessimiste sur le dossier.
     *
     * @param numDossier   Le numéro du dossier à mettre à jour
     * @param refOperation La référence de l'opération RC validée (status V)
     */
    void applyRCToDossier(Integer numDossier, Long refOperation);

    /**
     * Applique TOUS les mouvements validés (V) ou en erreur (E) pour un dossier.
     * Lock pessimiste + idempotence + retry des erreurs.
     * Alias de applyMvtToDossier pour compatibilité avec le pattern finalize.
     */
   

    List<OuvertureDossierDTO> findAll();

    Optional<OuvertureDossierDTO> findById(Integer numDossier);

    Optional<OuvertureDossierDTO> findByIdWithRelations(Integer numDossier);

    @Transactional(readOnly = true)
    List<OuvertureDossierDTO> findAllWithRelations();

    List<OuvertureDossierDTO> findByCodeAgenceAva(Short codeAgenceAva);

    List<OuvertureDossierDTO> findByEtatDossier(String etatDossier);

    /**
     * Recherche les dossiers valides ('V') pour un matricule fiscal (noPieceClient)
     */
    List<OperationsDeleguee> findByMatriculeFiscaleValide(String noPieceClient);

    OuvertureDossierDTO update(Integer numDossier, OuvertureDossierDTO dto);

    boolean existsById(Integer numDossier);

    List<DossierValideDTO> findDossiersValidesAvecNom();

    Optional<OperationsDelegueeSummaryDTO> findSummaryById(Integer numDossier);

    Optional<OperationsDelegueeSummaryDTO> findSummaryWithBenefById(Integer numDossier);
         OuvertureDossierDTO suspensionDossier(SuspensionDTO dto);

    OuvertureDossierDTO suspensionDossier(SuspensionDTO dto, boolean finalizeFlag);
    
    OuvertureDossierDTO leveeSuspensionDossier(LeveeSuspensionDTO dto);

    OuvertureDossierDTO leveeSuspensionDossier(LeveeSuspensionDTO dto, boolean finalizeFlag);
    
    OuvertureDossierDTO alimentationSuiteAccordBct(Integer numDossier, AutorisationBctDTO dto);

    OuvertureDossierDTO alimentationSuiteAccordBct(Integer numDossier, AutorisationBctDTO dto, boolean finalizeFlag);
    
    Optional<SuspensionDataDTO> getSuspensionData(Integer numDossier);
}
