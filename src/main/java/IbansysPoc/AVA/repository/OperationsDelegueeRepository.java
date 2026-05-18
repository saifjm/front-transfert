package IbansysPoc.AVA.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import IbansysPoc.AVA.entity.OperationsDeleguee;

@Repository
public interface OperationsDelegueeRepository extends JpaRepository<OperationsDeleguee, Integer> {
    List<OperationsDeleguee> findByCodeAgenceAva(Short codeAgenceAva);
    List<OperationsDeleguee> findByEtatDossier(String etatDossier);

    /**
     * Recherche les dossiers par numéro de pièce client.
     */
    List<OperationsDeleguee> findByNoPieceClient(String noPieceClient);

    /**
     * Recherche les dossiers par numéro de pièce client et état du dossier.
     */
    List<OperationsDeleguee> findByNoPieceClientAndEtatDossierAndCodeTypeDosAva(String noPieceClient, String etatDossier, Integer codeTypeDosAva  );

    /**
     * Recherche les dossiers par numéro de pièce client et état du dossier (sans filtrer par type de dossier).
     */
    List<OperationsDeleguee> findByNoPieceClientAndEtatDossier(String noPieceClient, String etatDossier);

    /**
     * Vérifie l'existence d'un dossier pour un client avec un type de dossier différent de 1.
     */
    boolean existsByNoPieceClientAndCodeTypeDosAvaNot(String noPieceClient, Short codeTypeDosAva);

    /**
     * Vérifie l'existence d'un dossier pour un client.
     */
    boolean existsByNoPieceClient(String noPieceClient);

    boolean existsByNoPieceClientAndCodeTypeDosAvaIn(String noPieceClient, List<Short> codeTypeDosAva);

    OperationsDeleguee findByNumDossier(Integer numDossier);

    @Query("SELECT o.solde FROM OperationsDeleguee o WHERE o.numDossier = :numDossier")
    BigDecimal findSoldeByNumDossier(@Param("numDossier") Integer numDossier);

    /**
     * Lock pessimiste sur le dossier pour garantir qu'un seul thread applique un MVT à la fois.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM OperationsDeleguee o WHERE o.numDossier = :numDossier")
    Optional<OperationsDeleguee> findByIdForUpdate(@Param("numDossier") Integer numDossier);

}