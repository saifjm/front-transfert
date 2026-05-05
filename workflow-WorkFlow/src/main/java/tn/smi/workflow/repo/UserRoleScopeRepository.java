package tn.smi.workflow.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.smi.workflow.domain.entity.UserRoleScope;

import java.util.List;

@Repository
public interface UserRoleScopeRepository extends JpaRepository<UserRoleScope, Long> {
    List<UserRoleScope> findByUserIdAndActiveTrue(Long userId);
    List<UserRoleScope> findByRole_RoleCodeAndActiveTrue(String roleCode);
    List<UserRoleScope> findByRole_RoleCodeAndOrgNodeIdAndActiveTrue(String roleCode, Long orgNodeId);
}

