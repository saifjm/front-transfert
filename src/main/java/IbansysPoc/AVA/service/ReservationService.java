package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.ReservationResponseDTO;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.Reservation;

import java.util.List;

public interface ReservationService {

    // CRUD simple
    Reservation create(Reservation reservation);

    Reservation getById(String id);

    Reservation update(String id, Reservation body);

    void delete(String id);

    /**
     * Réservation (269) : INSERT (si absente) / MAJ légère (si déjà existante)
     * basée sur referenceRes (PK) portée par le MVT.
     */
    Reservation createFromMvt(OperationsDelegueesMvt mvt);

    /**
     * Annulation (231) : UPDATE RESERVATION par referenceRes (PK)
     * avec cumul mntAnnulation = mntAnnulation + mvt.mntMvtAva
     */
    Reservation createAnnulationFromMvt(OperationsDelegueesMvt mvt);

    // Nouvelle méthode : recherche par referenceRes avec mntAnnulation == 0
    List<ReservationResponseDTO> getByNumeroDossierOrderForBalance(Long numDossier);
    
        // Reset mntReserve to zero for reservations of a given dossier
        void resetMntReserveByNumeroDossier(Long numeroDossier);
    
        // Return reservations for a dossier regardless of mntAnnulation
        java.util.List<IbansysPoc.AVA.DTO.ReservationResponseDTO> getByNumeroDossierAll(Long numDossier);
}
