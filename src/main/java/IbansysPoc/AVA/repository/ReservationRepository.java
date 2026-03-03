package IbansysPoc.AVA.repository;

import IbansysPoc.AVA.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, String> {

    Reservation findByNumeroDossier(Long numeroDossier);

    // Nouvelles méthodes : ne pas utiliser le flag, baser sur mntAnnulation
    List<Reservation> findByMntAnnulationIsNull();
    List<Reservation> findByMntAnnulationIsNotNull();

    // Recherche par referenceRes et mntAnnulation exact (ex: BigDecimal.ZERO)
    Optional<Reservation> findByReferenceResAndMntAnnulation(String referenceRes, BigDecimal mntAnnulation);

    // Recherche par numeroDossier et mntAnnulation (retourne liste d'entités)
    List<Reservation> findByNumeroDossierAndMntAnnulation(Long numeroDossier, BigDecimal mntAnnulation);


    // Recherche par numeroDossier où (mnt_reserve - mnt_utilise - mnt_annulation) != 0
    @Query("SELECT r FROM Reservation r WHERE r.numeroDossier = :numeroDossier AND (COALESCE(r.mntReserve, 0) - COALESCE(r.mntUtilise, 0) - COALESCE(r.mntAnnulation, 0)) <> 0")
    List<Reservation> findByNumeroDossierAndBalanceNotZero(@Param("numeroDossier") Long numeroDossier);
}
