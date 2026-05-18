package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfAssignmentRule;

import java.util.List;

@Repository
public interface WfAssignmentRuleRepository extends JpaRepository<WfAssignmentRule, Long> {
    List<WfAssignmentRule> findByNode_NodeIdOrderByPriorityAsc(Long nodeId);
}

