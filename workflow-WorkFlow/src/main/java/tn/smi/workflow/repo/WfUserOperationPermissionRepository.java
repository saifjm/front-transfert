package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.WfUserOperationPermission;

import java.util.List;

@Repository
public interface WfUserOperationPermissionRepository extends JpaRepository<WfUserOperationPermission, Long> {
    List<WfUserOperationPermission> findByUserIdAndOperationKeyAndActiveTrue(Long userId, String operationKey);
}

