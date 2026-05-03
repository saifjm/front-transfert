package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfDecision;

import java.util.List;
import java.util.Optional;

@Repository
public interface WfDecisionRepository extends JpaRepository<WfDecision, Long> {
    List<WfDecision> findByNode_NodeId(Long nodeId);
    Optional<WfDecision> findByNode_NodeIdAndTag(Long nodeId, String tag);
}

