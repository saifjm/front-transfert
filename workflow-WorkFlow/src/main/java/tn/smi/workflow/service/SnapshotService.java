package tn.smi.workflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.smi.workflow.domain.dto.UserContext;
import tn.smi.workflow.domain.entity.*;
import tn.smi.workflow.domain.enums.SodResult;
import tn.smi.workflow.repo.WfActionAuditRepository;
import tn.smi.workflow.repo.WfOperationSnapshotRepository;
import tn.smi.workflow.repo.WfSnapshotSchemaRepository;
import tn.smi.workflow.util.JsonPathExtractor;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SnapshotService {

    private final WfSnapshotSchemaRepository snapshotSchemaRepository;
    private final WfOperationSnapshotRepository snapshotRepository;
    private final WfActionAuditRepository actionAuditRepository;
    private final JsonPathExtractor jsonPathExtractor;
    private final ObjectMapper objectMapper;

    /**
     * Record a snapshot and audit entry for a workflow action.
     */
    public void recordSnapshot(WfOperation operation, String taskId, String nodeKey,
                                String decisionTag, UserContext userContext,
                                String payloadJson, String justification, String sodResult) {
        Long wfDefId = operation.getWfDefinition().getWfDefId();

        // Build snapshot JSON from schema
        List<WfSnapshotSchema> schemas = snapshotSchemaRepository.findByWfDefinition_WfDefId(wfDefId);
        Map<String, String> pathMappings = new HashMap<>();
        for (WfSnapshotSchema schema : schemas) {
            pathMappings.put(schema.getFieldName(), schema.getJsonPath());
        }

        Map<String, Object> snapshotData = jsonPathExtractor.extract(payloadJson, pathMappings);
        String snapshotJson;
        try {
            snapshotJson = objectMapper.writeValueAsString(snapshotData);
        } catch (Exception e) {
            snapshotJson = "{}";
        }

        // Save snapshot
        WfOperationSnapshot snapshot = WfOperationSnapshot.builder()
                .wfOperation(operation)
                .taskId(taskId)
                .nodeKey(nodeKey)
                .decisionTag(decisionTag)
                .userId(userContext.getUserId())
                .orgNodeId(userContext.getOrgNodeId())
                .createdAt(LocalDateTime.now())
                .snapshotJson(snapshotJson)
                .warnJustification(justification)
                .build();
        snapshotRepository.save(snapshot);

        // Save audit
        WfActionAudit audit = WfActionAudit.builder()
                .wfOperation(operation)
                .nodeKey(nodeKey)
                .decisionTag(decisionTag)
                .userId(userContext.getUserId())
                .orgNodeId(userContext.getOrgNodeId())
                .createdAt(LocalDateTime.now())
                .sodResult(sodResult != null ? SodResult.valueOf(sodResult) : SodResult.OK)
                .justification(justification)
                .build();
        actionAuditRepository.save(audit);
    }
}

