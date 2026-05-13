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

        // ═══════════════════════════════════════════════════════════════════════════
        // ROUTING SERVICE - FINALIZE DETERMINATION START
        // ═══════════════════════════════════════════════════════════════════════════
        log.info("═══════════════════════════════════════════════════════════");
        log.info("ROUTING SERVICE - RESOLVE START");
        log.info("═══════════════════════════════════════════════════════════");
        log.info("WF Definition ID: {}", wfDefId);
        log.info("Current Node Key: {}", nodeKey);
        log.info("Decision Tag: {}", decisionTag);
        log.info("Manual Target Node Key: {}", manualTargetNodeKey);
        log.info("═══════════════════════════════════════════════════════════");

        WfNode node = nodeRepository.findByWfDefinition_WfDefIdAndNodeKey(wfDefId, nodeKey)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + nodeKey));

        log.info("Found Node: ID={}, Key={}, Label={}, FinalizePolicy={}", 
                node.getNodeId(), node.getNodeKey(), node.getLabel(), node.getFinalizePolicy());

        WfDecision decision = decisionRepository.findByNode_NodeIdAndTag(node.getNodeId(), decisionTag)
                .orElseThrow(() -> new IllegalArgumentException("Decision not found: " + decisionTag + " for node " + nodeKey));

        log.info("Found Decision: ID={}, Tag={}, Behavior={}", 
                decision.getDecisionId(), decision.getTag(), decision.getBehavior());

        if (decision.getBehavior() == DecisionBehavior.END_PROCESS) {
            log.info("Decision behavior is END_PROCESS → metierFinalize=true, wfFinalize=true");
            return RouteResult.builder().endProcess(true).metierFinalize(true).wfFinalize(true).build();
        }

        if (decision.getBehavior() == DecisionBehavior.STAY) {
            log.info("Decision behavior is STAY → metierFinalize=false, wfFinalize=true");
            return RouteResult.builder().targetNodeKey(nodeKey).metierFinalize(false).wfFinalize(true).endProcess(false).build();
        }

        List<WfTransitionRule> rules = transitionRuleRepository
                .findByDecision_DecisionIdOrderByPriorityAsc(decision.getDecisionId());
        
        log.info("Found {} transition rules for decision ID {}", rules.size(), decision.getDecisionId());

        
        log.info("Found {} transition rules for decision ID {}", rules.size(), decision.getDecisionId());

        if (rules.isEmpty()) {
            throw new IllegalStateException("No transition rules defined for decision: " + decisionTag);
        }

        List<WfTransitionRule> matchingRules = new ArrayList<>();
        String manualGroup = null;

        for (WfTransitionRule rule : rules) {
            log.info("Evaluating Rule ID={}, Priority={}, Condition='{}', TargetNode={}, MetierFinalize={}, WfFinalize={}", 
                    rule.getRuleId(), rule.getPriority(), rule.getConditionExpr(), 
                    rule.getTargetNodeKey(), rule.getMetierFinalize(), rule.getWfFinalize());
            
            boolean conditionMatch = spelEvaluator.evaluate(rule.getConditionExpr(), variables);
            log.info("  → Condition match result: {}", conditionMatch);
            
            if (conditionMatch) {
                matchingRules.add(rule);
                if (rule.getManualChoiceGroup() != null) {
                    manualGroup = rule.getManualChoiceGroup();
                }
            }
        }

        log.info("Total matching rules: {}", matchingRules.size());

        log.info("Total matching rules: {}", matchingRules.size());

        if (matchingRules.isEmpty()) {
            throw new IllegalStateException("No matching transition rule for decision: " + decisionTag);
        }

        if (manualGroup != null && (manualTargetNodeKey == null || manualTargetNodeKey.isBlank())) {
            log.info("Manual choice required for group: {}", manualGroup);
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
            log.info("Manual target node specified: {}", manualTargetNodeKey);
            boolean valid = matchingRules.stream()
                    .anyMatch(r -> manualTargetNodeKey.equals(r.getTargetNodeKey()));
            if (!valid) {
                throw new IllegalArgumentException("Manual target not allowed: " + manualTargetNodeKey);
            }
            WfTransitionRule selectedRule = matchingRules.stream()
                    .filter(r -> manualTargetNodeKey.equals(r.getTargetNodeKey()))
                    .findFirst().orElseThrow();
            
            log.info("═══════════════════════════════════════════════════════════");
            log.info("SELECTED RULE (Manual): ID={}", selectedRule.getRuleId());
            log.info("  MetierFinalize (from rule): {}", selectedRule.getMetierFinalize());
            log.info("  WfFinalize (from rule): {}", selectedRule.getWfFinalize());
            log.info("  Computed metierFinalize: {}", Boolean.TRUE.equals(selectedRule.getMetierFinalize()));
            log.info("  Computed wfFinalize: {}", selectedRule.getWfFinalize() == null || selectedRule.getWfFinalize());
            log.info("═══════════════════════════════════════════════════════════");
            
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

        log.info("═══════════════════════════════════════════════════════════");
        log.info("SELECTED RULE (First Match): ID={}", selectedRule.getRuleId());
        log.info("  MetierFinalize (from rule): {}", selectedRule.getMetierFinalize());
        log.info("  WfFinalize (from rule): {}", selectedRule.getWfFinalize());
        log.info("  Computed metierFinalize: {}", Boolean.TRUE.equals(selectedRule.getMetierFinalize()));
        log.info("  Computed wfFinalize: {}", selectedRule.getWfFinalize() == null || selectedRule.getWfFinalize());
        log.info("  Target Node: {}", selectedRule.getTargetNodeKey());
        log.info("  Is End Process: {}", isEnd);
        log.info("═══════════════════════════════════════════════════════════");

        return RouteResult.builder()
                .targetNodeKey(selectedRule.getTargetNodeKey())
                .metierFinalize(Boolean.TRUE.equals(selectedRule.getMetierFinalize()))
                .wfFinalize(selectedRule.getWfFinalize() == null || selectedRule.getWfFinalize())
                .serviceAction(selectedRule.getServiceAction())
                .endProcess(isEnd)
                .build();
    }
}
