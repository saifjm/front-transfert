package IbansysPoc.AVA.service.impl;

import IbansysPoc.AVA.DTO.ReservationResponseDTO;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.Reservation;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.repository.ReservationRepository;
import IbansysPoc.AVA.service.ReservationService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
@Slf4j
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository repo;

    @PersistenceContext
    private EntityManager entityManager;

    public ReservationServiceImpl(ReservationRepository repo) {
        this.repo = repo;
    }

    @Override
    public Reservation create(Reservation reservation) {

        if (reservation.getReferenceRes() == null) {
            throw new IllegalArgumentException("REFERENCE_RES (id) est obligatoire (pas auto-généré).");
        }
        if (reservation.getDateResa() == null) {
            throw new IllegalArgumentException("DATE_RESA est obligatoire.");
        }
        if (repo.existsById(reservation.getReferenceRes())) {
            throw new IllegalArgumentException("Reservation déjà existante avec id=" + reservation.getReferenceRes());
        }
        return repo.save(reservation);
    }

    @Transactional(readOnly = true)
    @Override
    public Reservation getById(String id) {
        return repo.findById(id)
                .orElseThrow(() -> new BusinessException("Reservation introuvable id=" + id));
    }

    @Override
    public Reservation update(String id, Reservation body) {
        Reservation existing = repo.findById(id)
                .orElseThrow(() -> new BusinessException("Reservation introuvable id=" + id));

        existing.setDateResa(body.getDateResa());
        existing.setOrigine(body.getOrigine());
        existing.setMntUtilise(body.getMntUtilise());
        existing.setMntReserve(body.getMntReserve());
        existing.setMntAnnulation(body.getMntAnnulation());
        existing.setNumeroDossier(body.getNumeroDossier());

        if (existing.getDateResa() == null) {
            throw new IllegalArgumentException("DATE_RESA est obligatoire.");
        }

        return repo.save(existing);
    }

    @Override
    public void delete(String id) {
        if (!repo.existsById(id)) {
            throw new BusinessException("Reservation introuvable id=" + id);
        }
        repo.deleteById(id);
    }

    /**
     * Réservation (269) => INSERT RESERVATION si absente.
     * Si déjà existante : MAJ uniquement infos (numDossier/date/origine),
     * sans écraser mntAnnulation.
     */
    @Override
    public Reservation createFromMvt(OperationsDelegueesMvt mvt) {
        log.debug("ReservationService.createFromMvt referenceRes={} codeOp={}",
                mvt != null ? mvt.getReferenceRes() : null,
                mvt != null ? mvt.getCodeOperation() : null);

        if (mvt == null) {
            throw new BusinessException("OPERATION_MVT_NULL", "L'opération MVT ne peut pas être null");
        }

        String referenceRes = mvt.getReferenceRes();
        if (referenceRes == null || referenceRes.isEmpty()) {
            throw new BusinessException("REFERENCE_MANQUANTE", "La référence (referenceRes) est obligatoire.");
        }

        Reservation managed = entityManager.find(Reservation.class, referenceRes);

        if (managed == null) {
            managed = new Reservation();
            managed.setReferenceRes(referenceRes);
            managed.setNumeroDossier(mvt.getNumDossier() != null ? mvt.getNumDossier().longValue() : null);
            managed.setDateResa(mvt.getId() != null ? mvt.getId().getDateOperation() : LocalDate.now());
            managed.setOrigine(mvt.getOrigine());

            managed.setMntUtilise(BigDecimal.ZERO);
            managed.setMntReserve(defaultZero(mvt.getMntMvtAva()));
            managed.setMntAnnulation(BigDecimal.ZERO);

            if (managed.getDateResa() == null) managed.setDateResa(LocalDate.now());

            entityManager.persist(managed);
            entityManager.flush();
            return managed;
        }

        managed.setNumeroDossier(mvt.getNumDossier() != null ? mvt.getNumDossier().longValue() : managed.getNumeroDossier());
        managed.setDateResa(mvt.getId() != null ? mvt.getId().getDateOperation() : managed.getDateResa());
        managed.setOrigine(mvt.getOrigine());

        if (managed.getMntReserve() == null) {
            managed.setMntReserve(defaultZero(mvt.getMntMvtAva()));
        }
        if (managed.getMntUtilise() == null) {
            managed.setMntUtilise(BigDecimal.ZERO);
        }
        if (managed.getDateResa() == null) managed.setDateResa(LocalDate.now());

        return managed;
    }

    /**
     * Annulation (231) => UPDATE RESERVATION par referenceRes :
     * - CUMUL mntAnnulation sur la même referenceRes.
     * - si reservation introuvable => erreur.
     */
    @Override
    public Reservation createAnnulationFromMvt(OperationsDelegueesMvt mvt) {
        log.debug("ReservationService.createAnnulationFromMvt referenceRes={} codeOp={}",
                mvt != null ? mvt.getReferenceRes() : null,
                mvt != null ? mvt.getCodeOperation() : null);

        if (mvt == null) {
            throw new BusinessException("OPERATION_MVT_NULL", "L'opération MVT ne peut pas être null");
        }

        String referenceRes = mvt.getReferenceRes();
        if (referenceRes == null || referenceRes.isEmpty()) {
            throw new BusinessException("REFERENCE_MANQUANTE", "La référence (referenceRes) est obligatoire.");
        }

        Reservation managed = entityManager.find(Reservation.class, referenceRes);
        if (managed == null) {
            throw new BusinessException("RESERVATION_INTROUVABLE",
                    "Impossible d'annuler : aucune réservation trouvée pour referenceRes=" + referenceRes);
        }

        managed.setNumeroDossier(mvt.getNumDossier() != null ? mvt.getNumDossier().longValue() : managed.getNumeroDossier());
        managed.setDateResa(mvt.getId() != null ? mvt.getId().getDateOperation() : managed.getDateResa());
        managed.setOrigine(mvt.getOrigine());

        BigDecimal oldAnnul = defaultZero(managed.getMntAnnulation());
        BigDecimal addAnnul = defaultZero(mvt.getMntMvtAva());
        managed.setMntAnnulation(oldAnnul.add(addAnnul));

        if (managed.getMntUtilise() == null) {
            managed.setMntUtilise(BigDecimal.ZERO);
        }
        if (managed.getDateResa() == null) managed.setDateResa(LocalDate.now());

        return managed;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationResponseDTO> getByNumeroDossierOrderForBalance(Long numeroDossier) {

        if (numeroDossier == null ) {
            throw new BusinessException("REFERENCE_VIDE", "Le numéro de dossier est requis");
        }

        List<Reservation> entities;
        try {
            // Remplacer la recherche par mntAnnulation==0 par recherche des réservations dont
            // (mnt_reserve - mnt_utilise - mnt_annulation) != 0
            entities = repo.findByNumeroDossierAndBalanceNotZero(numeroDossier);
        } catch (Exception e) {
            log.error("Erreur lors de la recherche des réservations pour numeroDossier={}", numeroDossier, e);
            throw new BusinessException("ERREUR_RECHERCHE", "Une erreur est survenue lors de la recherche des réservations : " + e.getMessage());
        }

        if (entities == null || entities.isEmpty()) {
            throw new BusinessException("RESERVATION_NON_TROUVEE", "Aucune réservation trouvée pour DOSSIER=" + numeroDossier + " avec solde (mntReserve - mntUtilise - mntAnnulation) <> 0");
        }

        // Mapper entités -> DTOs
        java.util.List<ReservationResponseDTO> dtos = new java.util.ArrayList<>();
        for (Reservation r : entities) {
            ReservationResponseDTO dto = new ReservationResponseDTO();
            dto.setReferenceRes(r.getReferenceRes());
            dto.setNumeroDossier(r.getNumeroDossier());
            dto.setDateResa(r.getDateResa());
            dto.setOrigine(r.getOrigine());
            dto.setMntReserve(defaultZero(r.getMntReserve()));
            dto.setMntUtilise(defaultZero(r.getMntUtilise()));
            dto.setMntAnnulation(defaultZero(r.getMntAnnulation()));
            dtos.add(dto);
        }

        return dtos;
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<ReservationResponseDTO> getByNumeroDossierAll(Long numeroDossier) {
        if (numeroDossier == null ) {
            throw new BusinessException("REFERENCE_VIDE", "Le numéro de dossier est requis");
        }

        // repo.findByNumeroDossier returns a single Reservation (existing API)
        Reservation r = repo.findByNumeroDossier(numeroDossier);
        if (r == null) {
            throw new BusinessException("RESERVATION_NON_TROUVEE", "Aucune réservation trouvée pour DOSSIER=" + numeroDossier);
        }

        ReservationResponseDTO dto = new ReservationResponseDTO();
        dto.setReferenceRes(r.getReferenceRes());
        dto.setNumeroDossier(r.getNumeroDossier());
        dto.setDateResa(r.getDateResa());
        dto.setOrigine(r.getOrigine());
        dto.setMntReserve(defaultZero(r.getMntReserve()));
        dto.setMntUtilise(defaultZero(r.getMntUtilise()));
        dto.setMntAnnulation(defaultZero(r.getMntAnnulation()));

        java.util.List<ReservationResponseDTO> list = new java.util.ArrayList<>();
        list.add(dto);
        return list;
    }

    @Override
    public void resetMntReserveByNumeroDossier(Long numeroDossier) {
        if (numeroDossier == null) {
            throw new BusinessException("REFERENCE_VIDE", "Le numéro de dossier est requis");
        }

        List<Reservation> entities = repo.findByNumeroDossierAndMntAnnulation(numeroDossier, java.math.BigDecimal.ZERO);
        if (entities == null || entities.isEmpty()) {
            throw new BusinessException("RESERVATION_NON_TROUVEE", "Aucune réservation trouvée pour DOSSIER=" + numeroDossier);
        }

        for (Reservation r : entities) {
            r.setMntReserve(java.math.BigDecimal.ZERO);
            repo.save(r);
        }
    }

    private BigDecimal defaultZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
