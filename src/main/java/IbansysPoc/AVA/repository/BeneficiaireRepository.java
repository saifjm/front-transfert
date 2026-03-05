package IbansysPoc.AVA.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import IbansysPoc.AVA.entity.Beneficiaire;
import IbansysPoc.AVA.entity.BeneficiaireId;

@Repository
public interface BeneficiaireRepository extends JpaRepository<Beneficiaire, BeneficiaireId> {
    List<Beneficiaire> findByIdNumDossier(Integer numDossier);

    /**
     * Vérifie l'existence d'un bénéficiaire par numéro de dossier, type de pièce et numéro de pièce.
     * Note: typePieceBenef est Boolean dans l'entité, donc requête JPQL personnalisée requise.
     * Le paramètre typePiece (2ème param, ?2) est utilisé dans une condition toujours vraie pour respecter la séquence.
     */
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Beneficiaire b " +
           "WHERE b.id.numDossier = ?1 AND (?2 IS NOT NULL OR ?2 IS NULL) AND b.id.noPieceBenef = ?3")
    boolean existsByIdNumDossierAndIdTypePieceBenefAndIdNoPieceBenef(
        Integer numDossier,
        Integer typePiece,
        String noPiece
    );

    /**
     * Vérifie l'existence d'un bénéficiaire par numéro de dossier, type de pièce et numéro de pièce.
     */
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Beneficiaire b " +
           "WHERE b.id.numDossier = :numDossier " +
           "AND b.id.typePieceBenef = :code " +
           "AND b.id.noPieceBenef = :noPiece")
    boolean existsByNumDossierCodeAndNoPiece(
        @Param("numDossier") Integer numDossier,
        @Param("code") Integer code,
        @Param("noPiece") String noPiece
    );

    /**
     * Vérifie l'existence d'un bénéficiaire par numéro de dossier et numéro de pièce uniquement.
     * DEPRECATED: Utiliser existsByNumDossierCodeAndNoPiece pour inclure le type de pièce.
     */
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Beneficiaire b " +
           "WHERE b.id.numDossier = :numDossier AND b.id.noPieceBenef = :noPiece")
    boolean existsByNumDossierAndNoPiece(
        @Param("numDossier") Integer numDossier,
        @Param("noPiece") String noPiece
    );
}
