package IbansysPoc.AVA.repository;

import IbansysPoc.AVA.entity.TypeDossierAva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TypeDossierAvaRepository extends JpaRepository<TypeDossierAva, Short> {

    // Trouver par code type dossier AVA
    List<TypeDossierAva> findByCodeTypeDosAva(Short codeTypeDosAva);

    // Trouver par code type dossier AVA où date_fin_application est null (utilisé dans CALCUL_MVT_AVA_CR)
    Optional<TypeDossierAva> findByCodeTypeDosAvaAndDateFinApplicationIsNull(Short codeTypeDosAva);

    // Nouvelle méthode explicite : retourner directement la dateUltimeDeclCa pour le codeType (si active)
    @Query("SELECT t.dateUltimeDeclCa FROM TypeDossierAva t WHERE t.codeTypeDosAva = :code AND t.dateFinApplication IS NULL")
    LocalDate findDateUltimeDeclCaByCodeTypeDosAva(@Param("code") Short codeTypeDosAva);

    @Query("SELECT t.dateAnniversaire FROM TypeDossierAva t WHERE t.codeTypeDosAva = :code AND t.dateFinApplication IS NULL")
    LocalDate findDateAnniversaireByCodeTypeDosAva(@Param("code") Short codeTypeDosAva);

    // Trouver par statut
    List<TypeDossierAva> findByStatus(String status);

    // Trouver les types de dossiers actifs (date_fin_application est null)
    List<TypeDossierAva> findByDateFinApplicationIsNull();

    // Trouver par année circulaire
    List<TypeDossierAva> findByAnneeCirculaire(Short anneeCirculaire);

    // Trouver par numéro circulaire
    Optional<TypeDossierAva> findByNumeroCirculaire(Short numeroCirculaire);
}
