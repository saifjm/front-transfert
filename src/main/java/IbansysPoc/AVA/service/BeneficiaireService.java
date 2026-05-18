package IbansysPoc.AVA.service;

import java.util.List;

import IbansysPoc.AVA.DTO.BeneficiaireDTO;

/**
 * Service pour la gestion des bénéficiaires.
 * Permet la création et la mise à jour des bénéficiaires associés aux opérations déléguées.
 */
public interface BeneficiaireService {

    /**
     * Crée ou met à jour un bénéficiaire pour une opération déléguée spécifique.
     * 
     * Si le bénéficiaire existe déjà (identifié par numDossier, dateDossier, typePieceBenef, noPieceBenef),
     * il est mis à jour. Sinon, un nouveau bénéficiaire est créé.
     * 
     * En parallèle, un mouvement est créé dans OPERATIONS_DELEGUEES_MVT.
     * 
     * @param dto Le DTO contenant les informations du bénéficiaire
     * @return Le DTO du bénéficiaire créé ou mis à jour
     */
    BeneficiaireDTO createOrUpdateBeneficiaire(BeneficiaireDTO dto);

    /**
     * Crée ou met à jour un bénéficiaire avec option de finalisation.
     * 
     * Si finalizeFlag == true : crée/met à jour le bénéficiaire ET crée un MVT avec status='A'.
     * Si finalizeFlag == false : crée uniquement le MVT sans affecter la table bénéficiaire.
     * 
     * @param dto Le DTO contenant les informations du bénéficiaire
     * @param finalizeFlag true pour finaliser (bénéficiaire + MVT), false pour MVT uniquement
     * @return Le DTO du bénéficiaire (créé/mis à jour si finalize=true, ou DTO minimal pour finalize=false)
     */
    BeneficiaireDTO createOrUpdateBeneficiaire(BeneficiaireDTO dto, boolean finalizeFlag);

    /**
     * Récupère la liste des bénéficiaires pour un numéro de dossier donné.
     * 
     * @param numDossier Le numéro de dossier
     * @return La liste des DTO des bénéficiaires associés au dossier
     */
    List<BeneficiaireDTO> getBeneficiairesByNumDossier(Integer numDossier);
}