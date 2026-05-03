package tn.smi.workflow.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
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

    /** Resolve the original client IP from proxy headers, falling back to the TCP remote address. */
    private static String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank() && !"unknown".equalsIgnoreCase(xff)) {
            return xff.split(",")[0].trim();
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank() && !"unknown".equalsIgnoreCase(xri)) {
            return xri;
        }
        return request.getRemoteAddr();
    }

    @GetMapping("/operations/{operationKey}/{businessKey}/task")
    @Operation(summary = "Get current task info for a workflow operation")
    public ResponseEntity<TaskResponse> getCurrentTask(
            @PathVariable String operationKey,
            @PathVariable String businessKey,
            HttpServletRequest httpRequest,
            @RequestHeader(value = "X-User-Id") Long userId,
            @RequestHeader(value = "X-Org-Node-Id", required = false) Long orgNodeId,
            @RequestHeader(value = "X-Role-Code", required = false) String roleCode,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId) {

        UserContext userContext = UserContext.builder()
                .userId(userId)
                .orgNodeId(orgNodeId)
                .roleCode(roleCode)
                .authToken(authorization)
                .sessionId(sessionId)
                .clientIp(resolveClientIp(httpRequest))
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
            HttpServletRequest httpRequest,
            @RequestHeader(value = "X-User-Id") Long userId,
            @RequestHeader(value = "X-Org-Node-Id", required = false) Long orgNodeId,
            @RequestHeader(value = "X-Role-Code", required = false) String roleCode,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId) {

        String tempBusinessKey = "TEMP-" + UUID.randomUUID().toString().substring(0, 8);

        UserContext userContext = UserContext.builder()
                .userId(userId)
                .orgNodeId(orgNodeId)
                .roleCode(roleCode)
                .authToken(authorization)
                .sessionId(sessionId)
                .clientIp(resolveClientIp(httpRequest))
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
            HttpServletRequest httpRequest,
            @RequestHeader(value = "X-User-Id") Long userId,
            @RequestHeader(value = "X-Org-Node-Id", required = false) Long orgNodeId,
            @RequestHeader(value = "X-Role-Code", required = false) String roleCode,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId) {

        UserContext userContext = UserContext.builder()
                .userId(userId)
                .orgNodeId(orgNodeId)
                .roleCode(roleCode)
                .authToken(authorization)
                .sessionId(sessionId)
                .clientIp(resolveClientIp(httpRequest))
                .build();

        DecisionResponse response = workflowRuntimeService.decide(
                operationKey, businessKey, decisionTag, request, userContext);
        return ResponseEntity.ok(response);
    }
}
