package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfNode;

import java.util.List;
import java.util.Optional;

@Repository
public interface WfNodeRepository extends JpaRepository<WfNode, Long> {
    Optional<WfNode> findByWfDefinition_WfDefIdAndNodeKey(Long wfDefId, String nodeKey);
    List<WfNode> findByWfDefinition_WfDefId(Long wfDefId);
    List<WfNode> findByWfDefinition_WfDefIdOrderByNodeIdAsc(Long wfDefId);
}

