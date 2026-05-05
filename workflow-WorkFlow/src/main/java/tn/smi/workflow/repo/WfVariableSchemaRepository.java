package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfVariableSchema;

import java.util.List;

@Repository
public interface WfVariableSchemaRepository extends JpaRepository<WfVariableSchema, Long> {
    List<WfVariableSchema> findByWfDefinition_WfDefId(Long wfDefId);
}

