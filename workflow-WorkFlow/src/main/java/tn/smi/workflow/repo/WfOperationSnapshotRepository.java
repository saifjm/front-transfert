package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfOperationSnapshot;

import java.util.List;

@Repository
public interface WfOperationSnapshotRepository extends JpaRepository<WfOperationSnapshot, Long> {
    List<WfOperationSnapshot> findByWfOperation_WfOpIdOrderByCreatedAtDesc(Long wfOpId);
}

