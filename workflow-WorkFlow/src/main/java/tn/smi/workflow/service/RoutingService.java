package tn.smi.workflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.smi.workflow.domain.dto.ManualTarget;
import tn.smi.workflow.domain.dto.RouteResult;
import tn.smi.workflow.domain.entity.WfDecision;
import tn.smi.workflow.domain.entity.WfNode;
import tn.smi.workflow.domain.entity.WfTransitionRule;
import tn.smi.workflow.domain.enums.DecisionBehavior;
import tn.smi.workflow.repo.WfDecisionRepository;
import tn.smi.workflow.repo.WfNodeRepository;
import tn.smi.workflow.repo.WfTransitionRuleRepository;
import tn.smi.workflow.util.SpelEvaluator;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoutingService {

    private final WfDecisionRepository decisionRepository;
    private final WfTransitionRuleRepository transitionRuleRepository;
    private final WfNodeRepository nodeRepository;
    private final SpelEvaluator spelEvaluator;

    public RouteResult resolve(Long wfDefId, String nodeKey, String decisionTag,
                                Map<String, Object> variables, String manualTargetNodeKey) {

        WfNode node = nodeRepository.findByWfDefinition_WfDefIdAndNodeKey(wfDefId, nodeKey)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + nodeKey));

        WfDecision decision = decisionRepository.findByNode_NodeIdAndTag(node.getNodeId(), decisionTag)
                .orElseThrow(() -> new IllegalArgumentException("Decision not found: " + decisionTag + " for node " + nodeKey));

        if (decision.getBehavior() == DecisionBehavior.END_PROCESS) {
            return RouteResult.builder().endProcess(true).metierFinalize(true).wfFinalize(true).build();
        }

        if (decision.getBehavior() == DecisionBehavior.STAY) {
            return RouteResult.builder().targetNodeKey(nodeKey).metierFinalize(false).wfFinalize(true).endProcess(false).build();
        }

        List<WfTransitionRule> rules = transitionRuleRepository
                .findByDecision_DecisionIdOrderByPriorityAsc(decision.getDecisionId());

        if (rules.isEmpty()) {
            throw new IllegalStateException("No transition rules defined for decision: " + decisionTag);
        }

        List<WfTransitionRule> matchingRules = new ArrayList<>();
        String manualGroup = null;

        for (WfTransitionRule rule : rules) {
            boolean conditionMatch = spelEvaluator.evaluate(rule.getConditionExpr(), variables);
            if (conditionMatch) {
                matchingRules.add(rule);
                if (rule.getManualChoiceGroup() != null) {
                    manualGroup = rule.getManualChoiceGroup();
                }
            }
        }

        if (matchingRules.isEmpty()) {
            throw new IllegalStateException("No matching transition rule for decision: " + decisionTag);
        }

        if (manualGroup != null && (manualTargetNodeKey == null || manualTargetNodeKey.isBlank())) {
            List<ManualTarget> targets = new ArrayList<>();
            for (WfTransitionRule rule : matchingRules) {
                if (rule.getTargetNodeKey() != null) {
                    WfNode targetNode = nodeRepository.findByWfDefinition_WfDefIdAndNodeKey(wfDefId, rule.getTargetNodeKey())
                            .orElse(null);
                    targets.add(ManualTarget.builder()
                            .nodeKey(rule.getTargetNodeKey())
                            .label(targetNode != null ? targetNode.getLabel() : rule.getTargetNodeKey())
                            .build());
                }
            }
            return RouteResult.builder().manualRequired(true).manualTargets(targets).build();
        }

        if (manualTargetNodeKey != null && !manualTargetNodeKey.isBlank()) {
            boolean valid = matchingRules.stream()
                    .anyMatch(r -> manualTargetNodeKey.equals(r.getTargetNodeKey()));
            if (!valid) {
                throw new IllegalArgumentException("Manual target not allowed: " + manualTargetNodeKey);
            }
            WfTransitionRule selectedRule = matchingRules.stream()
                    .filter(r -> manualTargetNodeKey.equals(r.getTargetNodeKey()))
                    .findFirst().orElseThrow();
            return RouteResult.builder()
                    .targetNodeKey(manualTargetNodeKey)
                    .metierFinalize(Boolean.TRUE.equals(selectedRule.getMetierFinalize()))
                    .wfFinalize(selectedRule.getWfFinalize() == null || selectedRule.getWfFinalize())
                    .serviceAction(selectedRule.getServiceAction())
                    .endProcess(false)
                    .build();
        }

        WfTransitionRule selectedRule = matchingRules.get(0);
        boolean isEnd = selectedRule.getTargetNodeKey() == null;

        return RouteResult.builder()
                .targetNodeKey(selectedRule.getTargetNodeKey())
                .metierFinalize(Boolean.TRUE.equals(selectedRule.getMetierFinalize()))
                .wfFinalize(selectedRule.getWfFinalize() == null || selectedRule.getWfFinalize())
                .serviceAction(selectedRule.getServiceAction())
                .endProcess(isEnd)
                .build();
    }
}
