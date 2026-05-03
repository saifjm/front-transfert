package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfSnapshotSchema;

import java.util.List;

@Repository
public interface WfSnapshotSchemaRepository extends JpaRepository<WfSnapshotSchema, Long> {
    List<WfSnapshotSchema> findByWfDefinition_WfDefId(Long wfDefId);
}

