package tn.smi.workflow.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.smi.workflow.domain.dto.TaskListItem;
import tn.smi.workflow.domain.entity.WfOperationIndex;
import tn.smi.workflow.repo.WfOperationIndexRepository;
import tn.smi.workflow.service.WorkflowRuntimeService;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/wf/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Task management APIs")
public class TaskController {

    private final WorkflowRuntimeService workflowRuntimeService;
    private final WfOperationIndexRepository operationIndexRepository;

    @PostMapping("/{taskId}/claim")
    @Operation(summary = "Claim a task")
    public ResponseEntity<Map<String, String>> claimTask(
            @PathVariable String taskId,
            @RequestHeader(value = "X-User-Id") Long userId) {
        workflowRuntimeService.claimTask(taskId, userId);
        return ResponseEntity.ok(Map.of("status", "claimed"));
    }

    @PostMapping("/{taskId}/unclaim")
    @Operation(summary = "Unclaim a task")
    public ResponseEntity<Map<String, String>> unclaimTask(@PathVariable String taskId) {
        workflowRuntimeService.unclaimTask(taskId);
        return ResponseEntity.ok(Map.of("status", "unclaimed"));
    }

    @GetMapping
    @Operation(summary = "List tasks with filters (paginated)")
    public ResponseEntity<Page<TaskListItem>> listTasks(
            @RequestParam(required = false) String operationKey,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String ref,
            @RequestParam(required = false) String agenceId,
            Pageable pageable) {

        Page<WfOperationIndex> indexPage = operationIndexRepository.findByFilters(
                clientId, ref, agenceId, operationKey, pageable);

        Page<TaskListItem> result = indexPage.map(idx -> {
            var op = idx.getWfOperation();
            return TaskListItem.builder()
                    .businessKey(op.getBusinessKey())
                    .operationKey(op.getWfDefinition().getOperationKey())
                    .currentNodeKey(op.getCurrentNodeKey())
                    .createdAt(op.getCreatedAt())
                    .idxClientId(idx.getIdxClientId())
                    .idxRef(idx.getIdxRef())
                    .idxAgenceId(idx.getIdxAgenceId())
                    .idxAmountTnd(idx.getIdxAmountTnd())
                    .taskId(op.getLastTaskId())
                    .build();
        });

        return ResponseEntity.ok(result);
    }
}

