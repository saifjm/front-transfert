package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.OperationRCDTO;

/**
 * Service de gestion des opérations Rétrocession (RC).
 *
 * Implémente le pattern "finalize" en 2 phases (identique au FV) :
 * - Phase 1 : Création du mouvement (status I) + validations
 * - Phase 2 : Application au dossier (status V → A/E)
 *
 * Deux sous-types :
 * - RAV : Rétrocession AVA (annulation complète d'un FV, montant auto-récupéré)
 * - RRV : Remboursement Rétrocession Voyage (partiel, montant fourni)
 */
public interface OperationRCService {

    /**
     * Crée une opération Rétrocession (RAV ou RRV).
     *
     * @param dto       DTO contenant les informations de l'opération RC
     * @param finalize  Si true : crée + applique au dossier (I → V → A/E)
     *                  Si false : crée un brouillon uniquement (status I)
     * @return Réponse contenant refOperation, numDossier et status final
     */
    OperationCreationResponseDTO create(OperationRCDTO dto, boolean finalize);

    /**
     * Valide et applique un mouvement RC existant (brouillon) au dossier.
     *
     * @param refOperation Référence du mouvement RC à valider
     * @return Réponse contenant le status final (A ou E)
     */
    OperationCreationResponseDTO validate(Long refOperation);

    /**
     * Récupère une opération RC par sa référence.
     *
     * @param refOperation Référence du mouvement
     * @return DTO de l'opération RC
     */
    OperationRCDTO getByRefOperation(Long refOperation);
}

