package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfOperation;

import java.util.Optional;

@Repository
public interface WfOperationRepository extends JpaRepository<WfOperation, Long> {
    Optional<WfOperation> findByBusinessKey(String businessKey);
    Optional<WfOperation> findByWfDefinition_OperationKeyAndBusinessKey(String operationKey, String businessKey);
}

