package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.SodRule;

import java.util.List;

@Repository
public interface SodRuleRepository extends JpaRepository<SodRule, Long> {
    List<SodRule> findByEnabledTrueAndWfDefinition_WfDefId(Long wfDefId);
    List<SodRule> findByEnabledTrueAndOperationKey(String operationKey);
    List<SodRule> findByEnabledTrue();
}

