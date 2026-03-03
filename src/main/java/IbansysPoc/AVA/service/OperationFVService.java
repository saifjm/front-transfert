package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.OperationFVDTO;

/**
 * Service de gestion des opérations Frais de Voyage (FV).
 * Implémente le pattern "finalize" en 2 phases :
 * - Phase 1 : Création du mouvement (status I) + validations
 * - Phase 2 : Application au dossier (status V → A/E)
 */
public interface OperationFVService {

    /**
     * Crée une opération Frais de Voyage.
     *
     * @param dto DTO contenant toutes les informations de l'opération FV
     * @param finalize Si true, applique immédiatement au dossier (I → V → A/E)
     *                 Si false, crée uniquement le mouvement en brouillon (status I)
     * @return Réponse contenant refOperation, numDossier et status final (I, A ou E)
     */
    OperationCreationResponseDTO create(OperationFVDTO dto, boolean finalize);

    /**
     * Valide et applique un mouvement FV existant (brouillon) au dossier.
     *
     * @param refOperation Référence du mouvement à valider
     * @return Réponse contenant le status final (A ou E)
     */
    OperationCreationResponseDTO validate(Long refOperation);

    /**
     * Récupère une opération FV par sa référence.
     *
     * @param refOperation Référence du mouvement
     * @return DTO de l'opération FV
     */
    OperationFVDTO getByRefOperation(Long refOperation);
}

