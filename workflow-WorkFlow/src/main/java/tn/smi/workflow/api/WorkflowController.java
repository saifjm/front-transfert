package tn.smi.workflow.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.smi.workflow.domain.dto.DecisionRequest;
import tn.smi.workflow.domain.dto.DecisionResponse;
import tn.smi.workflow.domain.dto.TaskResponse;
import tn.smi.workflow.domain.dto.UserContext;
import tn.smi.workflow.service.WorkflowRuntimeService;

import java.util.UUID;

@RestController
@RequestMapping("/api/wf")
@RequiredArgsConstructor
@Tag(name = "Workflow", description = "Workflow runtime APIs — get current task & decide")
public class WorkflowController {

    private final WorkflowRuntimeService workflowRuntimeService;

    @GetMapping("/operations/{operationKey}/{businessKey}/task")
    @Operation(summary = "Get current task info for a workflow operation")
    public ResponseEntity<TaskResponse> getCurrentTask(
            @PathVariable String operationKey,
            @PathVariable String businessKey,
            @RequestHeader(value = "X-User-Id") Long userId,
            @RequestHeader(value = "X-Org-Node-Id", required = false) Long orgNodeId,
            @RequestHeader(value = "X-Role-Code", required = false) String roleCode) {

        UserContext userContext = UserContext.builder()
                .userId(userId)
                .orgNodeId(orgNodeId)
                .roleCode(roleCode)
                .build();

        TaskResponse response = workflowRuntimeService.getCurrentTask(operationKey, businessKey, userContext);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/operations/{operationKey}/decide/{decisionTag}")
    @Operation(summary = "Execute a decision (INSERT or UPDATE). If payload contains the businessKey field (e.g. refOperation) → UPDATE existing operation. If absent → INSERT new operation.")
    public ResponseEntity<DecisionResponse> decideNew(
            @PathVariable String operationKey,
            @PathVariable String decisionTag,
            @RequestBody DecisionRequest request,
            @RequestHeader(value = "X-User-Id") Long userId,
            @RequestHeader(value = "X-Org-Node-Id", required = false) Long orgNodeId,
            @RequestHeader(value = "X-Role-Code", required = false) String roleCode) {

        // Generate a temporary businessKey — the service layer will resolve
        // the real businessKey from the payload if present (e.g. refOperation for UPDATE)
        String tempBusinessKey = "TEMP-" + UUID.randomUUID().toString().substring(0, 8);

        UserContext userContext = UserContext.builder()
                .userId(userId)
                .orgNodeId(orgNodeId)
                .roleCode(roleCode)
                .build();

        DecisionResponse response = workflowRuntimeService.decide(
                operationKey, tempBusinessKey, decisionTag, request, userContext);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/operations/{operationKey}/{businessKey}/decide/{decisionTag}")
    @Operation(summary = "Execute a decision on an existing workflow operation")
    public ResponseEntity<DecisionResponse> decide(
            @PathVariable String operationKey,
            @PathVariable String businessKey,
            @PathVariable String decisionTag,
            @RequestBody DecisionRequest request,
            @RequestHeader(value = "X-User-Id") Long userId,
            @RequestHeader(value = "X-Org-Node-Id", required = false) Long orgNodeId,
            @RequestHeader(value = "X-Role-Code", required = false) String roleCode) {

        UserContext userContext = UserContext.builder()
                .userId(userId)
                .orgNodeId(orgNodeId)
                .roleCode(roleCode)
                .build();

        DecisionResponse response = workflowRuntimeService.decide(
                operationKey, businessKey, decisionTag, request, userContext);
        return ResponseEntity.ok(response);
    }
}

