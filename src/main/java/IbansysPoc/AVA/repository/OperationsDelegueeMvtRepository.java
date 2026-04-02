package IbansysPoc.AVA.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.OperationsDelegueesMvtId;

@Repository
public interface OperationsDelegueeMvtRepository extends JpaRepository<OperationsDelegueesMvt, OperationsDelegueesMvtId> {

    /**
     * Récupère la prochaine valeur de la séquence AVA_REF_OPR.
     * Cette séquence génère automatiquement les REF_OPERATION.
     */
    @Query(value = "SELECT AVA.AVA_REF_OPR.NEXTVAL FROM DUAL", nativeQuery = true)
    Long getNextRefOperation();

    @Query(value = "SELECT AVA.AVA_NUM_DOSSIER_SEQ.NEXTVAL FROM DUAL", nativeQuery = true)
    Integer getNextNumDossier();

    List<OperationsDelegueesMvt> findByIdRefOperation(Long refOperation);
    List<OperationsDelegueesMvt> findByCodeAgenceAva(Short codeAgenceAva);
    List<OperationsDelegueesMvt> findByStatus(String status);

    /**
     * Recherche les mouvements par numéro de pièce client.
     */
    List<OperationsDelegueesMvt> findByNoPieceClient(String noPieceClient);

    /**
     * Vérifie l'existence d'un mouvement pour un client avec un type de dossier différent de 1.
     */
    boolean existsByNoPieceClientAndCodeTypeDosAvaNot(String noPieceClient, Short codeTypeDosAva);

    /**
     * Vérifie l'existence d'un mouvement pour un client avec un type de dossier spécifique.
     */
    boolean existsByNoPieceClientAndCodeTypeDosAva(String noPieceClient, Short codeTypeDosAva);

    /**
     * Vérifie l'existence d'un mouvement pour un client.
     */
    boolean existsByNoPieceClientAndEtatDossier(String noPieceClient,String etatDossier);

    boolean existsByNoPieceClientAndCodeOperationAndCodeTypeDosAvaIn(String noPieceClient,Integer codeOperation, List<Short> codeTypes);
    /**
     * Recherche une opération par codeProduitService, codeOperation et status (retourne un seul résultat).
     */
    OperationsDelegueesMvt findByCodeProduitServiceAndCodeOperationAndStatus(Short codeProduitService, Integer codeOperation, String status);

    /**
     * Recherche toutes les opérations par codeProduitService, liste de codeOperation et status.
     * Utilise la convention Spring Data 'In' pour accepter une collection.
     */
    List<OperationsDelegueesMvt> findByCodeProduitServiceAndCodeOperationInAndStatus(Short codeProduitService, List<Integer> codeOperations, String status);

    /**
     * Recherche un mouvement correspondant aux critères et au numéro de dossier
     */
    @Query("SELECT o FROM OperationsDelegueesMvt o WHERE o.codeProduitService = :codeProduitService AND o.codeOperation IN :codeOperations AND o.status = :status AND o.numDossier = :numDossier")
    java.util.Optional<OperationsDelegueesMvt> findByCodeProduitServiceAndCodeOperationInAndStatusAndNumDossier(
            @Param("codeProduitService") Short codeProduitService,
            @Param("codeOperations") List<Integer> codeOperations,
            @Param("status") String status,
            @Param("numDossier") Integer numDossier
    );

    @Query("SELECT o FROM OperationsDelegueesMvt o WHERE o.codeProduitService = :codeProduitService AND o.codeOperation IN :codeOperations AND o.numDossier = :numDossier")
    Optional<OperationsDelegueesMvt> findByCodeProduitServiceAndCodeOperationInAndNumDossier(
            @Param("codeProduitService") Short codeProduitService,
            @Param("codeOperations") List<Integer> codeOperations,
            @Param("numDossier") Integer numDossier
    );


    List<OperationsDelegueesMvt> findByReferenceResAndCodeProduitServiceAndCodeOperationInAndStatusNot(
            String referenceRes,
            Short codeProduitService,
            List<Integer> codeOperation,
            String status
    );

    /**
     * Récupère tous les mouvements pour un numéro de dossier donné entre deux dates (inclusives)
     * Utilise les champs de l'embedded id pour dateOperation/refOperation
     */
    List<OperationsDelegueesMvt> findByNumDossierAndIdDateOperationBetween(
            Integer numDossier,
            LocalDate startDate,
            LocalDate endDate
    );
     /**
     * Récupère tous les MVT en status V ou E (opérations en attente d'application).
     * Utilisé par le scheduler de rattrapage MvtRecoveryWorker.
     */
    @Query("SELECT o FROM OperationsDelegueesMvt o WHERE o.status IN :statuses ORDER BY o.id.dateOperation ASC, o.id.refOperation ASC")
    List<OperationsDelegueesMvt> findByStatusIn(@Param("statuses") List<String> statuses);

    /**
     * Récupère tous les MVT V ou E pour un dossier donné, triés par date chronologique.
     * Utilisé par applyForDossier pour appliquer dans l'ordre.
     */
    @Query("SELECT o FROM OperationsDelegueesMvt o WHERE o.numDossier = :numDossier AND o.status IN :statuses ORDER BY o.id.dateOperation ASC, o.id.refOperation ASC")
    List<OperationsDelegueesMvt> findByNumDossierAndStatusInOrderByDateOperation(
            @Param("numDossier") Integer numDossier,
            @Param("statuses") List<String> statuses);





}
