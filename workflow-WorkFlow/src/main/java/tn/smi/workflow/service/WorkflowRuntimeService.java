package tn.smi.workflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.smi.workflow.domain.dto.*;
import tn.smi.workflow.domain.entity.*;
import tn.smi.workflow.domain.enums.DecisionBehavior;
import tn.smi.workflow.domain.enums.FinalizePolicy;
import tn.smi.workflow.domain.enums.OperationStatus;
import tn.smi.workflow.domain.enums.SodMode;
import tn.smi.workflow.repo.*;
import tn.smi.workflow.util.JsonPathExtractor;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowRuntimeService {

    private final WfDefinitionRepository definitionRepository;
    private final WfNodeRepository nodeRepository;
    private final WfDecisionRepository decisionRepository;
    private final WfOperationRepository operationRepository;
    private final WfVariableSchemaRepository variableSchemaRepository;
    private final WfOperationIndexRepository operationIndexRepository;

    private final RoutingService routingService;
    private final AssignmentService assignmentService;
    private final SodService sodService;
    private final SnapshotService snapshotService;
    private final IndexService indexService;
    private final BusinessGatewayService businessGatewayService;
    private final PermissionService permissionService;
    private final JsonPathExtractor jsonPathExtractor;
    private final ObjectMapper objectMapper;

    private final RuntimeService runtimeService;
    private final TaskService taskService;

    /**
     * Get current task info for a workflow operation.
     */
    @Transactional(readOnly = true)
    public TaskResponse getCurrentTask(String operationKey, String businessKey, UserContext userContext) {
        WfDefinition def = definitionRepository.findByOperationKeyAndActiveTrue(operationKey)
                .orElseThrow(() -> new IllegalArgumentException("No active workflow definition for: " + operationKey));

        Optional<WfOperation> opOpt = operationRepository.findByWfDefinition_OperationKeyAndBusinessKey(operationKey, businessKey);

        if (opOpt.isEmpty()) {
            // Operation not started yet, return first node info
            List<WfNode> nodes = nodeRepository.findByWfDefinition_WfDefIdOrderByNodeIdAsc(def.getWfDefId());
            if (nodes.isEmpty()) {
                throw new IllegalStateException("No nodes defined for workflow: " + operationKey);
            }
            WfNode firstNode = nodes.get(0);
            List<WfDecision> decisions = decisionRepository.findByNode_NodeId(firstNode.getNodeId());
            List<DecisionInfo> decisionInfos = decisions.stream()
                    .map(d -> DecisionInfo.builder()
                            .tag(d.getTag())
                            .label(d.getLabel())
                            .requiresComment(d.getRequiresComment())
                            .behavior(d.getBehavior().name())
                            .build())
                    .collect(Collectors.toList());

            Set<Long> candidates = assignmentService.getCandidates(def.getWfDefId(), firstNode.getNodeKey(), Map.of());

            return TaskResponse.builder()
                    .currentNodeKey(firstNode.getNodeKey())
                    .nodeLabel(firstNode.getLabel())
                    .claimEnabled(firstNode.getClaimEnabled())
                    .candidates(candidates.stream().map(String::valueOf).collect(Collectors.toList()))
                    .decisions(decisionInfos)
                    .build();
        }

        WfOperation operation = opOpt.get();
        String currentNodeKey = operation.getCurrentNodeKey();
        WfNode currentNode = nodeRepository.findByWfDefinition_WfDefIdAndNodeKey(def.getWfDefId(), currentNodeKey)
                .orElseThrow(() -> new IllegalStateException("Current node not found: " + currentNodeKey));

        List<WfDecision> decisions = decisionRepository.findByNode_NodeId(currentNode.getNodeId());
        List<DecisionInfo> decisionInfos = decisions.stream()
                .map(d -> DecisionInfo.builder()
                        .tag(d.getTag())
                        .label(d.getLabel())
                        .requiresComment(d.getRequiresComment())
                        .behavior(d.getBehavior().name())
                        .build())
                .collect(Collectors.toList());

        Set<Long> candidates = assignmentService.getCandidates(def.getWfDefId(), currentNodeKey, Map.of());

        // Get Flowable task
        String assignee = null;
        String flowableTaskId = operation.getLastTaskId();
        if (flowableTaskId != null) {
            try {
                Task task = taskService.createTaskQuery().taskId(flowableTaskId).singleResult();
                if (task != null) {
                    assignee = task.getAssignee();
                }
            } catch (Exception e) {
                log.debug("Flowable task not found: {}", flowableTaskId);
            }
        }

        return TaskResponse.builder()
                .taskId(flowableTaskId)
                .currentNodeKey(currentNodeKey)
                .nodeLabel(currentNode.getLabel())
                .claimEnabled(currentNode.getClaimEnabled())
                .assignee(assignee)
                .candidates(candidates.stream().map(String::valueOf).collect(Collectors.toList()))
                .decisions(decisionInfos)
                .build();
    }

    /**
     * Execute a decision on a workflow operation.
     */
    @Transactional
    public DecisionResponse decide(String operationKey, String businessKey, String decisionTag,
                                    DecisionRequest request, UserContext userContext) {

        // 1. Load definition
        WfDefinition def = definitionRepository.findByOperationKeyAndActiveTrue(operationKey)
                .orElseThrow(() -> new IllegalArgumentException("No active workflow definition for: " + operationKey));

        log.info("WfDefinition loaded: baseUrl={}, endpointTemplate={}, respBkPath={}, payloadBkField={}",
                def.getBaseUrl(), def.getEndpointTemplate(),
                def.getResponseBusinessKeyPath(), def.getPayloadBusinessKeyField());

        // 2. Load or create operation
        //    IBANSYS pattern: if payload contains the businessKey field (e.g. refOperation),
        //    use it to find the existing operation (UPDATE). Otherwise, it's a new operation (INSERT).
        WfOperation operation = operationRepository.findByWfDefinition_OperationKeyAndBusinessKey(operationKey, businessKey)
                .orElse(null);

        // If not found and businessKey is temporary, try to resolve real businessKey from payload
        if (operation == null && businessKey.startsWith("TEMP-")) {
            String payloadBkField = def.getPayloadBusinessKeyField();
            if (payloadBkField != null && !payloadBkField.isBlank() && request.getPayload() != null) {
                Object bkValue = request.getPayload().get(payloadBkField);
                if (bkValue != null) {
                    String realBk = String.valueOf(bkValue);
                    if (!realBk.isBlank() && !"null".equals(realBk)) {
                        WfOperation existing = operationRepository
                                .findByWfDefinition_OperationKeyAndBusinessKey(operationKey, realBk)
                                .orElse(null);
                        if (existing != null) {
                            operation = existing;
                            businessKey = realBk;
                            log.info("Resolved existing operation from payload field '{}': businessKey='{}'",
                                    payloadBkField, realBk);
                        }
                    }
                }
            }
        }

        String currentNodeKey;
        if (operation == null) {
            // Create new operation + start Flowable process (INSERT — no refOperation in payload)
            List<WfNode> nodes = nodeRepository.findByWfDefinition_WfDefIdOrderByNodeIdAsc(def.getWfDefId());
            if (nodes.isEmpty()) {
                throw new IllegalStateException("No nodes defined");
            }
            WfNode firstNode = nodes.get(0);
            currentNodeKey = firstNode.getNodeKey();

            // Start Flowable process
            Map<String, Object> processVars = new HashMap<>();
            processVars.put("operationKey", operationKey);
            processVars.put("businessKey", businessKey);
            processVars.put("currentNodeKey", currentNodeKey);

            ProcessInstance processInstance = runtimeService.startProcessInstanceByKey(
                    "generic-workflow", businessKey, processVars);

            operation = WfOperation.builder()
                    .wfDefinition(def)
                    .businessKey(businessKey)
                    .status(OperationStatus.RUNNING)
                    .currentNodeKey(currentNodeKey)
                    .initiatorUserId(userContext.getUserId())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .processInstanceId(processInstance.getId())
                    .build();
            operation = operationRepository.save(operation);

            // Get Flowable task
            Task flowableTask = taskService.createTaskQuery()
                    .processInstanceId(processInstance.getId())
                    .singleResult();
            if (flowableTask != null) {
                operation.setLastTaskId(flowableTask.getId());
                operationRepository.save(operation);
            }
        } else {
            currentNodeKey = operation.getCurrentNodeKey();
        }

        // 3. Verify node + decision exist
        WfNode currentNode = nodeRepository.findByWfDefinition_WfDefIdAndNodeKey(def.getWfDefId(), currentNodeKey)
                .orElseThrow(() -> new IllegalStateException("Node not found: " + currentNodeKey));

        WfDecision decision = decisionRepository.findByNode_NodeIdAndTag(currentNode.getNodeId(), decisionTag)
                .orElseThrow(() -> new IllegalArgumentException("Decision not found: " + decisionTag));

        // 4. Check assignment/permission
        boolean canAct = assignmentService.canUserAct(userContext.getUserId(), def.getWfDefId(), currentNodeKey, Map.of());
        if (!canAct) {
            boolean hasPerm = permissionService.hasPermission(userContext.getUserId(), operationKey, userContext.getOrgNodeId());
            if (!hasPerm) {
                throw new SecurityException("User not authorized to act on this task");
            }
        }

        // 5. Check comment required
        if (Boolean.TRUE.equals(decision.getRequiresComment()) &&
            (request.getComment() == null || request.getComment().isBlank())) {
            throw new IllegalArgumentException("Comment is required for this decision");
        }

        // 6. Extract variables
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(request.getPayload() != null ? request.getPayload() : Map.of());
        } catch (Exception e) {
            payloadJson = "{}";
        }

        List<WfVariableSchema> varSchemas = variableSchemaRepository.findByWfDefinition_WfDefId(def.getWfDefId());
        Map<String, String> pathMappings = new HashMap<>();
        for (WfVariableSchema vs : varSchemas) {
            pathMappings.put(vs.getVarName(), vs.getJsonPath());
        }
        Map<String, Object> variables = jsonPathExtractor.extract(payloadJson, pathMappings);
        variables.put("userId", userContext.getUserId());
        variables.put("orgNodeId", userContext.getOrgNodeId());

        // 7. SoD check
        if (decision.getSodMode() != SodMode.SKIP) {
            SodCheckResult sodResult = sodService.check(operation, currentNodeKey, userContext, variables);
            if ("BLOCK".equals(sodResult.getResult())) {
                throw new SecurityException("SoD BLOCK: " + sodResult.getWarnings().stream()
                        .map(WarningInfo::getMessage).collect(Collectors.joining("; ")));
            }
            if ("WARN".equals(sodResult.getResult())) {
                if (request.getJustification() == null || request.getJustification().isBlank()) {
                    return DecisionResponse.builder()
                            .result("WARN_REQUIRED")
                            .warnings(sodResult.getWarnings())
                            .requiresJustification(true)
                            .build();
                }
            }
        }

        // 8. Update index
        indexService.updateIndex(operation, variables);

        // 9. Routing
        RouteResult routeResult = routingService.resolve(
                def.getWfDefId(), currentNodeKey, decisionTag,
                variables, request.getManualTargetNodeKey());

        if (routeResult.isManualRequired()) {
            return DecisionResponse.builder()
                    .result("MANUAL_TARGET_REQUIRED")
                    .manualTargets(routeResult.getManualTargets())
                    .build();
        }

        // 10. Snapshot
        String sodResultStr = "OK";
        snapshotService.recordSnapshot(operation, operation.getLastTaskId(), currentNodeKey,
                decisionTag, userContext, payloadJson, request.getJustification(), sodResultStr);

        // 11. Determine metier finalize (passed to downstream MS)
        //     FinalizePolicy on the node can override the transition rule value.
        boolean shouldMetierFinalize = routeResult.isMetierFinalize();
        
        // ═══════════════════════════════════════════════════════════════════════════
        // WORKFLOW RUNTIME SERVICE - FINALIZE POLICY APPLICATION
        // ═══════════════════════════════════════════════════════════════════════════
        log.info("═══════════════════════════════════════════════════════════");
        log.info("WORKFLOW RUNTIME - FINALIZE DETERMINATION");
        log.info("═══════════════════════════════════════════════════════════");
        log.info("From RoutingService:");
        log.info("  routeResult.metierFinalize: {}", routeResult.isMetierFinalize());
        log.info("  routeResult.wfFinalize: {}", routeResult.isWfFinalize());
        log.info("Current Node FinalizePolicy: {}", currentNode.getFinalizePolicy());
        log.info("Initial shouldMetierFinalize: {}", shouldMetierFinalize);
        
        if (currentNode.getFinalizePolicy() == FinalizePolicy.ALWAYS) {
            log.info("FinalizePolicy is ALWAYS → overriding metierFinalize to TRUE");
            shouldMetierFinalize = true;
        } else if (currentNode.getFinalizePolicy() == FinalizePolicy.NEVER) {
            log.info("FinalizePolicy is NEVER → overriding metierFinalize to FALSE");
            shouldMetierFinalize = false;
        } else {
            log.info("FinalizePolicy is BY_DECISION → using value from transition rule");
        }

        // Workflow finalize: if false, the operation will be closed as REJECTED after the downstream call.
        boolean shouldWfFinalize = routeResult.isWfFinalize();

        log.info("FINAL VALUES:");
        log.info("  shouldMetierFinalize (passed to business service): {}", shouldMetierFinalize);
        log.info("  shouldWfFinalize (workflow continuation): {}", shouldWfFinalize);
        log.info("═══════════════════════════════════════════════════════════");

        // 12. Call business service
        log.info("Before downstream call: businessKey='{}', respBkPath='{}', payloadBkField='{}'",
                operation.getBusinessKey(), def.getResponseBusinessKeyPath(), def.getPayloadBusinessKeyField());
        try {
            String responseBody = businessGatewayService.callBusinessService(
                    operation, def, operation.getLastTaskId(), currentNodeKey,
                    decisionTag, shouldMetierFinalize, request.getPayload(), userContext);
            log.info("After downstream call: businessKey='{}' (response={})",
                    operation.getBusinessKey(),
                    responseBody != null ? responseBody.substring(0, Math.min(responseBody.length(), 200)) : "null");
        } catch (tn.smi.workflow.exception.BusinessKeyConflictException bkEx) {
            log.warn("BusinessKey conflict detected for operation {}: {}", operation.getWfOpId(), bkEx.getMessage());
            return DecisionResponse.builder()
                    .result("ERROR")
                    .errorMessage("BusinessKey conflict: " + bkEx.getMessage())
                    .state(OperationState.builder()
                            .status(operation.getStatus().name())
                            .currentNodeKey(currentNodeKey)
                            .businessKey(operation.getBusinessKey())
                            .build())
                    .build();
        } catch (Exception e) {
            if (!shouldMetierFinalize) {
                // Business layer rejected a non-finalizing call → close operation as REJECTED.
                log.warn("Downstream rejected draft call (metierFinalize=false) — closing operation as REJECTED: {}", e.getMessage());
                return closeAsRejected(operation, decisionTag, "Business layer rejected: " + e.getMessage());
            }
            // Finalizing call failed → cannot silently reject; stay on current task so an operator can retry.
            log.error("Business service finalization call failed, staying on current task", e);
            return DecisionResponse.builder()
                    .result("ERROR")
                    .errorMessage(e.getMessage())
                    .state(OperationState.builder()
                            .status(operation.getStatus().name())
                            .currentNodeKey(currentNodeKey)
                            .businessKey(operation.getBusinessKey())
                            .build())
                    .build();
        }

        // 12b. Workflow finalize check: if wfFinalize=false the workflow itself rejects the operation.
        if (!shouldWfFinalize) {
            log.info("wfFinalize=false — closing operation as REJECTED (businessKey='{}')", operation.getBusinessKey());
            return closeAsRejected(operation, decisionTag, null);
        }

        // After downstream call, businessKey may have been updated (e.g., refOperation from MS métier)
        // Save the potentially updated operation
        String resolvedBusinessKey = operation.getBusinessKey();
        log.info("Resolved businessKey for response: '{}'", resolvedBusinessKey);
        operationRepository.save(operation);

        // 13. Advance workflow
        if (routeResult.isEndProcess()) {
            operation.setStatus(OperationStatus.ENDED);
            operation.setCurrentNodeKey(null);
            operation.setLastDecisionTag(decisionTag);
            operation.setUpdatedAt(LocalDateTime.now());
            operationRepository.save(operation);

            // Complete Flowable task & end process
            completeFlowableTask(operation, decisionTag, true);

            return DecisionResponse.builder()
                    .result("OK")
                    .state(OperationState.builder()
                            .status("ENDED")
                            .currentNodeKey(null)
                            .businessKey(resolvedBusinessKey)
                            .build())
                    .build();
        }

        // STAY on same node — do NOT complete the Flowable task
        String nextNodeKey = routeResult.getTargetNodeKey();
        if (nextNodeKey != null && nextNodeKey.equals(currentNodeKey)) {
            operation.setLastDecisionTag(decisionTag);
            operation.setUpdatedAt(LocalDateTime.now());
            operationRepository.save(operation);

            return DecisionResponse.builder()
                    .result("OK")
                    .state(OperationState.builder()
                            .status("RUNNING")
                            .currentNodeKey(currentNodeKey)
                            .businessKey(resolvedBusinessKey)
                            .build())
                    .build();
        }

        // Move to next node
        operation.setCurrentNodeKey(nextNodeKey);
        operation.setLastDecisionTag(decisionTag);
        operation.setUpdatedAt(LocalDateTime.now());

        // Complete current Flowable task and get next
        completeFlowableTask(operation, decisionTag, false);

        // Get new Flowable task
        if (operation.getProcessInstanceId() != null) {
            Task nextTask = taskService.createTaskQuery()
                    .processInstanceId(operation.getProcessInstanceId())
                    .singleResult();
            if (nextTask != null) {
                operation.setLastTaskId(nextTask.getId());
                // Set node key as variable
                runtimeService.setVariable(operation.getProcessInstanceId(), "currentNodeKey", nextNodeKey);
            }
        }
        operationRepository.save(operation);

        // Build next info
        WfNode nextNode = nodeRepository.findByWfDefinition_WfDefIdAndNodeKey(def.getWfDefId(), nextNodeKey).orElse(null);
        List<DecisionInfo> nextDecisions = List.of();
        if (nextNode != null) {
            nextDecisions = decisionRepository.findByNode_NodeId(nextNode.getNodeId()).stream()
                    .map(d -> DecisionInfo.builder()
                            .tag(d.getTag())
                            .label(d.getLabel())
                            .requiresComment(d.getRequiresComment())
                            .behavior(d.getBehavior().name())
                            .build())
                    .collect(Collectors.toList());
        }

        return DecisionResponse.builder()
                .result("OK")
                .state(OperationState.builder()
                        .status("RUNNING")
                        .currentNodeKey(nextNodeKey)
                        .businessKey(resolvedBusinessKey)
                        .build())
                .next(NextInfo.builder()
                        .nodeKey(nextNodeKey)
                        .decisions(nextDecisions)
                        .build())
                .build();
    }

    /**
     * Claim a task for a user.
     */
    @Transactional
    public void claimTask(String taskId, Long userId) {
        taskService.claim(taskId, String.valueOf(userId));
    }

    /**
     * Unclaim a task.
     */
    @Transactional
    public void unclaimTask(String taskId) {
        taskService.unclaim(taskId);
    }

    /**
     * Close the operation as REJECTED:
     * - sets status = REJECTED, currentNodeKey = null
     * - terminates the Flowable process instance
     * - returns a REJECTED DecisionResponse
     */
    private DecisionResponse closeAsRejected(WfOperation operation, String decisionTag, String reason) {
        operation.setStatus(OperationStatus.REJECTED);
        operation.setCurrentNodeKey(null);
        operation.setLastDecisionTag(decisionTag);
        operation.setUpdatedAt(LocalDateTime.now());
        operationRepository.save(operation);

        completeFlowableTask(operation, decisionTag, true);

        return DecisionResponse.builder()
                .result("REJECTED")
                .errorMessage(reason)
                .state(OperationState.builder()
                        .status(OperationStatus.REJECTED.name())
                        .currentNodeKey(null)
                        .businessKey(operation.getBusinessKey())
                        .build())
                .build();
    }

    private void completeFlowableTask(WfOperation operation, String decisionTag, boolean endProcess) {
        String flowableTaskId = operation.getLastTaskId();
        if (flowableTaskId != null) {
            try {
                Map<String, Object> taskVars = new HashMap<>();
                taskVars.put("decisionTag", decisionTag);
                taskVars.put("endProcess", endProcess);
                taskVars.put("currentNodeKey", operation.getCurrentNodeKey());
                taskService.complete(flowableTaskId, taskVars);
            } catch (Exception e) {
                log.warn("Could not complete Flowable task {}: {}", flowableTaskId, e.getMessage());
            }
        }
    }
}
