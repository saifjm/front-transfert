package tn.smi.workflow.repo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfOperationIndex;

@Repository
public interface WfOperationIndexRepository extends JpaRepository<WfOperationIndex, Long> {

    @Query("SELECT i FROM WfOperationIndex i JOIN i.wfOperation o " +
           "WHERE (:clientId IS NULL OR i.idxClientId = :clientId) " +
           "AND (:ref IS NULL OR i.idxRef = :ref) " +
           "AND (:agenceId IS NULL OR i.idxAgenceId = :agenceId) " +
           "AND (:operationKey IS NULL OR o.wfDefinition.operationKey = :operationKey)")
    Page<WfOperationIndex> findByFilters(
            @Param("clientId") String clientId,
            @Param("ref") String ref,
            @Param("agenceId") String agenceId,
            @Param("operationKey") String operationKey,
            Pageable pageable);
}

