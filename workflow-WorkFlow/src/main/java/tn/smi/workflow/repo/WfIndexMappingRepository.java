package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfIndexMapping;

import java.util.List;

@Repository
public interface WfIndexMappingRepository extends JpaRepository<WfIndexMapping, Long> {
    List<WfIndexMapping> findByWfDefinition_WfDefId(Long wfDefId);
}

