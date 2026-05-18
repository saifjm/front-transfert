package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfActionAudit;

import java.util.List;

@Repository
public interface WfActionAuditRepository extends JpaRepository<WfActionAudit, Long> {
    List<WfActionAudit> findByWfOperation_WfOpIdOrderByCreatedAtDesc(Long wfOpId);
    List<WfActionAudit> findByWfOperation_WfOpIdAndNodeKey(Long wfOpId, String nodeKey);
}

