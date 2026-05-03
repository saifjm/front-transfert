package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfDownstreamCall;

@Repository
public interface WfDownstreamCallRepository extends JpaRepository<WfDownstreamCall, Long> {
}

