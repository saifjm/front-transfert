package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.OrgNode;

@Repository
public interface OrgNodeRepository extends JpaRepository<OrgNode, Long> {
}

