package tn.smi.workflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.smi.workflow.domain.entity.UserRoleScope;
import tn.smi.workflow.domain.entity.WfAssignmentRule;
import tn.smi.workflow.domain.entity.WfNode;
import tn.smi.workflow.domain.dto.UserContext;
import tn.smi.workflow.repo.UserRoleScopeRepository;
import tn.smi.workflow.repo.WfAssignmentRuleRepository;
import tn.smi.workflow.repo.WfNodeRepository;
import tn.smi.workflow.util.SpelEvaluator;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final WfAssignmentRuleRepository assignmentRuleRepository;
    private final WfNodeRepository nodeRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final SpelEvaluator spelEvaluator;

    /**
     * Get candidate user IDs for a node.
     */
    public Set<Long> getCandidates(Long wfDefId, String nodeKey, Map<String, Object> variables) {
        WfNode node = nodeRepository.findByWfDefinition_WfDefIdAndNodeKey(wfDefId, nodeKey)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + nodeKey));

        List<WfAssignmentRule> rules = assignmentRuleRepository.findByNode_NodeIdOrderByPriorityAsc(node.getNodeId());
        Set<Long> candidates = new HashSet<>();

        for (WfAssignmentRule rule : rules) {
            boolean condMatch = spelEvaluator.evaluate(rule.getConditionExpr(), variables);
            if (!condMatch) continue;

            // If specific user
            if (rule.getCandidateUserId() != null) {
                candidates.add(rule.getCandidateUserId());
            }

            // If role-based
            if (rule.getCandidateRoleCode() != null) {
                List<UserRoleScope> scopes = userRoleScopeRepository
                        .findByRole_RoleCodeAndActiveTrue(rule.getCandidateRoleCode());
                candidates.addAll(scopes.stream()
                        .map(UserRoleScope::getUserId)
                        .collect(Collectors.toSet()));
            }
        }
        return candidates;
    }

    /**
     * Check if a user can act on a given node.
     */
    public boolean canUserAct(Long userId, Long wfDefId, String nodeKey, Map<String, Object> variables) {
        Set<Long> candidates = getCandidates(wfDefId, nodeKey, variables);
        return candidates.contains(userId);
    }
}

