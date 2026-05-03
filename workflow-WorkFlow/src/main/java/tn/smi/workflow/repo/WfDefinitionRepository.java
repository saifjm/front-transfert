package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfDefinition;

import java.util.Optional;

@Repository
public interface WfDefinitionRepository extends JpaRepository<WfDefinition, Long> {
    Optional<WfDefinition> findByOperationKeyAndActiveTrue(String operationKey);
    Optional<WfDefinition> findByOperationKey(String operationKey);
}
