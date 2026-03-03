package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.InitiationOuvertureDTO;
import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.OperationsDelegueesMvtId;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;


public interface OperationsDelegueesMvtService {

    InitiationOuvertureDTO initialisationOuverture(InitiationOuvertureDTO dto);

    /**
     * Crée un mouvement MVT. Si finalize=true, enchaîne validation → V → application dossier → A (ou E).
     * Si finalize=false, le MVT est laissé en status I.
     */
    OperationCreationResponseDTO create(InitiationOuvertureDTO dto, boolean finalize);

    List<InitiationOuvertureDTO> findAll();

    Optional<InitiationOuvertureDTO> findById(OperationsDelegueesMvtId id);

    Optional<InitiationOuvertureDTO> findByRefOperationAndDateOperation(Long refOperation, LocalDate dateOperation);

    Optional<InitiationOuvertureDTO> findByIdWithRelations(Long refOperation, LocalDate dateOperation);

    List<InitiationOuvertureDTO> findByRefOperation(Long refOperation);

    List<InitiationOuvertureDTO> findByCodeAgenceAva(Short codeAgenceAva);

    List<InitiationOuvertureDTO> findByStatus(String status);

    InitiationOuvertureDTO updateoperation(Long refOperation, InitiationOuvertureDTO dto);

    /**
     * Récupère un MVT par numDossier. Si finalize=true → applique writeDossier (V → A/E).
     */
    OperationCreationResponseDTO findByNumDossierAndFinalize(Integer numDossier, boolean finalize);

    /**
     * Met à jour un MVT existant. Si finalize=true → applique writeDossier après l'update (V → A/E).
     */
    OperationCreationResponseDTO updateOperationWithFinalize(Long refOperation, InitiationOuvertureDTO dto, boolean finalize);

    boolean existsById(Long refOperation, LocalDate dateOperation);

    // Nouvelle méthode: récupérer les mouvements MVT pour un numDossier entre deux dates (inclusives)
    // Retourne maintenant les entités complètes OperationsDelegueesMvt (avec relations chargées)
    List<OperationsDelegueesMvt> findByNumDossierAndPeriod(Integer numDossier, LocalDate startDate, LocalDate endDate);
}
