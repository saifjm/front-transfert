package tn.smi.workflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.smi.workflow.domain.entity.WfActionAudit;
import tn.smi.workflow.domain.entity.WfOperation;
import tn.smi.workflow.domain.enums.OperationStatus;
import tn.smi.workflow.repo.WfActionAuditRepository;
import tn.smi.workflow.repo.WfOperationRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminOperationService {

    private final WfOperationRepository operationRepository;
    private final WfActionAuditRepository auditRepository;
    private final RuntimeService runtimeService;
    private final TaskService taskService;

    /** Search operations with optional filters. */
    @Transactional(readOnly = true)
    public List<WfOperation> searchOperations(Long wfDefId, String businessKey, String status) {
        if (businessKey != null && !businessKey.isBlank()) {
            return operationRepository.findByBusinessKeyContainingIgnoreCaseOrderByCreatedAtDesc(businessKey.trim());
        }
        if (wfDefId != null && status != null && !status.isBlank()) {
            try {
                return operationRepository.findByWfDefinition_WfDefIdAndStatusOrderByCreatedAtDesc(
                        wfDefId, OperationStatus.valueOf(status.toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Unknown status filter: {}", status);
            }
        }
        if (wfDefId != null) {
            return operationRepository.findByWfDefinition_WfDefIdOrderByCreatedAtDesc(wfDefId);
        }
        return operationRepository.findAll();
    }

    /** Get audit history for an operation, newest first. */
    @Transactional(readOnly = true)
    public List<WfActionAudit> getHistory(Long opId) {
        return auditRepository.findByWfOperation_WfOpIdOrderByCreatedAtDesc(opId);
    }

    /** Suspend a running operation. */
    @Transactional
    public WfOperation suspend(Long opId) {
        WfOperation op = operationRepository.findById(opId)
                .orElseThrow(() -> new IllegalArgumentException("Operation not found: " + opId));
        op.setStatus(OperationStatus.SUSPENDED);
        op.setUpdatedAt(LocalDateTime.now());
        if (op.getProcessInstanceId() != null) {
            try {
                runtimeService.suspendProcessInstanceById(op.getProcessInstanceId());
            } catch (Exception e) {
                log.warn("Could not suspend Flowable process {}: {}", op.getProcessInstanceId(), e.getMessage());
            }
        }
        return operationRepository.save(op);
    }

    /** Resume a suspended operation. */
    @Transactional
    public WfOperation resume(Long opId) {
        WfOperation op = operationRepository.findById(opId)
                .orElseThrow(() -> new IllegalArgumentException("Operation not found: " + opId));
        op.setStatus(OperationStatus.RUNNING);
        op.setUpdatedAt(LocalDateTime.now());
        if (op.getProcessInstanceId() != null) {
            try {
                runtimeService.activateProcessInstanceById(op.getProcessInstanceId());
            } catch (Exception e) {
                log.warn("Could not activate Flowable process {}: {}", op.getProcessInstanceId(), e.getMessage());
            }
        }
        return operationRepository.save(op);
    }

    /**
     * Admin force-advance: jump the operation to a target node, bypassing normal decision routing.
     * Completes the current Flowable userTask with the target node key so the BPMN loop
     * naturally re-enters the userTask at the right state.
     */
    @Transactional
    public WfOperation forceAdvance(Long opId, String targetNodeKey, String note, Long adminUserId) {
        WfOperation op = operationRepository.findById(opId)
                .orElseThrow(() -> new IllegalArgumentException("Operation not found: " + opId));

        String prevNodeKey = op.getCurrentNodeKey();
        String lastTaskId  = op.getLastTaskId();

        // Complete current Flowable task with override variables so the BPMN loop moves to the target
        if (lastTaskId != null) {
            Map<String, Object> vars = new HashMap<>();
            vars.put("currentNodeKey", targetNodeKey);
            vars.put("endProcess", false);
            vars.put("decisionTag", "_ADMIN_FORCE_");
            try {
                taskService.complete(lastTaskId, vars);
                log.info("Admin force-advance: completed task {} for op {} → {}", lastTaskId, opId, targetNodeKey);
            } catch (Exception e) {
                log.warn("Could not complete Flowable task {} for force-advance: {}", lastTaskId, e.getMessage());
            }
        }

        // Fetch the new Flowable task created after the loop-back
        String newTaskId = null;
        if (op.getProcessInstanceId() != null) {
            try {
                Task newTask = taskService.createTaskQuery()
                        .processInstanceId(op.getProcessInstanceId())
                        .singleResult();
                if (newTask != null) {
                    newTaskId = newTask.getId();
                }
            } catch (Exception e) {
                log.warn("Could not fetch new Flowable task after force-advance: {}", e.getMessage());
            }
        }

        // Update operation state
        op.setCurrentNodeKey(targetNodeKey);
        op.setLastDecisionTag("_ADMIN_FORCE_");
        op.setStatus(OperationStatus.RUNNING);
        op.setUpdatedAt(LocalDateTime.now());
        if (newTaskId != null) op.setLastTaskId(newTaskId);
        op = operationRepository.save(op);

        // Audit record
        WfActionAudit audit = WfActionAudit.builder()
                .wfOperation(op)
                .nodeKey(prevNodeKey != null ? prevNodeKey : "UNKNOWN")
                .decisionTag("_ADMIN_FORCE_ → " + targetNodeKey)
                .userId(adminUserId)
                .createdAt(LocalDateTime.now())
                .justification(note)
                .build();
        auditRepository.save(audit);

        log.info("Admin force-advance complete: op={} {} → {}, adminUser={}", opId, prevNodeKey, targetNodeKey, adminUserId);
        return op;
    }
}
