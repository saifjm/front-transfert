package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfTransitionRule;

import java.util.List;

@Repository
public interface WfTransitionRuleRepository extends JpaRepository<WfTransitionRule, Long> {
    List<WfTransitionRule> findByDecision_DecisionIdOrderByPriorityAsc(Long decisionId);
}

