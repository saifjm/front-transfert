package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.ReservationOperationDTO;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;

import java.util.List;

public interface ReservationOperationService {

    // CRUD (backward compat)
    ReservationOperationDTO create(ReservationOperationDTO dto);
    ReservationOperationDTO createOprAnnulation(ReservationOperationDTO dto);

    /**
     * Crée une réservation (269). Si finalize=true → valide + applique au dossier (I→V→A/E).
     */
    OperationCreationResponseDTO create(ReservationOperationDTO dto, boolean finalize);

    /**
     * Crée une annulation (231). Si finalize=true → valide + applique au dossier (I→V→A/E).
     */
    OperationCreationResponseDTO createAnnulation(ReservationOperationDTO dto, boolean finalize);

    ReservationOperationDTO getById(Long refOperation);
    List<ReservationOperationDTO> getAll();

    ReservationOperationDTO update(Long refOperation, ReservationOperationDTO dto);
    void delete(Long refOperation);

    List<ReservationOperationDTO> findByNumDossier(Integer numDossier);
    List<ReservationOperationDTO> findByNoPieceClient(String noPieceClient);

    // Traitement (utilitaire)
    void processMvt(OperationsDelegueesMvt mvt);

    // ✅ NEW: API unique de validation par referenceRes (269 ou 231)
    ReservationOperationDTO validateAndProcessByReferenceRes(String referenceRes);
}
