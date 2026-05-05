package tn.smi.workflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.smi.workflow.domain.dto.SodCheckResult;
import tn.smi.workflow.domain.dto.UserContext;
import tn.smi.workflow.domain.dto.WarningInfo;
import tn.smi.workflow.domain.entity.SodRule;
import tn.smi.workflow.domain.entity.WfActionAudit;
import tn.smi.workflow.domain.entity.WfOperation;
import tn.smi.workflow.domain.enums.Severity;
import tn.smi.workflow.domain.enums.SodRuleType;
import tn.smi.workflow.repo.SodRuleRepository;
import tn.smi.workflow.repo.WfActionAuditRepository;
import tn.smi.workflow.util.SpelEvaluator;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SodService {

    private final SodRuleRepository sodRuleRepository;
    private final WfActionAuditRepository actionAuditRepository;
    private final SpelEvaluator spelEvaluator;

    /**
     * Check SoD rules for a given operation/node/user.
     */
    public SodCheckResult check(WfOperation operation, String nodeKey, UserContext userContext, Map<String, Object> variables) {
        Long wfDefId = operation.getWfDefinition().getWfDefId();
        List<SodRule> rules = sodRuleRepository.findByEnabledTrueAndWfDefinition_WfDefId(wfDefId);

        // Also load global rules
        List<SodRule> globalRules = sodRuleRepository.findByEnabledTrueAndOperationKey(operation.getWfDefinition().getOperationKey());
        rules.addAll(globalRules);

        List<WfActionAudit> history = actionAuditRepository.findByWfOperation_WfOpIdOrderByCreatedAtDesc(operation.getWfOpId());

        List<WarningInfo> warnings = new ArrayList<>();
        boolean blocked = false;

        for (SodRule rule : rules) {
            // Check exception expression
            if (rule.getExceptionExpr() != null && !rule.getExceptionExpr().isBlank()) {
                if (spelEvaluator.evaluate(rule.getExceptionExpr(), variables)) {
                    continue; // Exception applies, skip this rule
                }
            }

            boolean violated = false;
            String message = "";

            switch (rule.getRuleType()) {
                case INITIATOR_CANNOT_APPROVE:
                    if (operation.getInitiatorUserId() != null &&
                        operation.getInitiatorUserId().equals(userContext.getUserId())) {
                        violated = true;
                        message = "Initiator cannot approve: user " + userContext.getUserId() + " initiated this operation";
                    }
                    break;

                case SAME_USER_FORBIDDEN:
                    if (rule.getNodeA() != null && rule.getNodeB() != null) {
                        boolean userActedOnNodeA = history.stream()
                                .anyMatch(a -> rule.getNodeA().equals(a.getNodeKey()) &&
                                              userContext.getUserId().equals(a.getUserId()));
                        if (userActedOnNodeA && rule.getNodeB().equals(nodeKey)) {
                            violated = true;
                            message = "Same user cannot act on both " + rule.getNodeA() + " and " + rule.getNodeB();
                        }
                    }
                    break;

                case SAME_ORGNODE_FORBIDDEN:
                    if (rule.getNodeA() != null && rule.getNodeB() != null) {
                        boolean sameOrgActedOnNodeA = history.stream()
                                .anyMatch(a -> rule.getNodeA().equals(a.getNodeKey()) &&
                                              userContext.getOrgNodeId() != null &&
                                              userContext.getOrgNodeId().equals(a.getOrgNodeId()));
                        if (sameOrgActedOnNodeA && rule.getNodeB().equals(nodeKey)) {
                            violated = true;
                            message = "Same org node cannot act on both " + rule.getNodeA() + " and " + rule.getNodeB();
                        }
                    }
                    break;
            }

            if (violated) {
                if (rule.getSeverity() == Severity.BLOCK) {
                    blocked = true;
                }
                warnings.add(WarningInfo.builder()
                        .ruleType(rule.getRuleType().name())
                        .message(message)
                        .build());
            }
        }

        String result;
        if (blocked) {
            result = "BLOCK";
        } else if (!warnings.isEmpty()) {
            result = "WARN";
        } else {
            result = "OK";
        }

        return SodCheckResult.builder()
                .result(result)
                .warnings(warnings)
                .build();
    }
}

