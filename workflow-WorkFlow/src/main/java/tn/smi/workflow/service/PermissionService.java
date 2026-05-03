package tn.smi.workflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.smi.workflow.domain.entity.WfUserOperationPermission;
import tn.smi.workflow.repo.WfUserOperationPermissionRepository;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionService {

    private final WfUserOperationPermissionRepository permissionRepository;

    /**
     * Check if a user has nominative permission to act on an operation.
     * If no permissions are configured, default is allowed.
     */
    public boolean hasPermission(Long userId, String operationKey, Long orgNodeId) {
        List<WfUserOperationPermission> perms = permissionRepository
                .findByUserIdAndOperationKeyAndActiveTrue(userId, operationKey);

        if (perms.isEmpty()) {
            // No nominative permission configured -> allowed by default
            return true;
        }

        return perms.stream().anyMatch(p -> {
            if (!p.getCanAct()) return false;
            // If orgNodeId scope is configured, check it
            if (p.getOrgNodeId() != null && orgNodeId != null) {
                return p.getOrgNodeId().equals(orgNodeId);
            }
            return true;
        });
    }
}
