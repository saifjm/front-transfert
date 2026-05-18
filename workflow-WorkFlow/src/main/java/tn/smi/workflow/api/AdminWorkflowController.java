package tn.smi.workflow.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.smi.workflow.domain.dto.ForceAdvanceRequest;
import tn.smi.workflow.domain.entity.*;
import tn.smi.workflow.repo.*;
import tn.smi.workflow.service.AdminOperationService;

import java.util.List;

@RestController
@RequestMapping("/api/wf/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Workflow administration / paramétrage APIs")
public class AdminWorkflowController {

    private final AdminOperationService adminOperationService;
    private final WfOperationRepository operationRepository;
    private final WfDefinitionRepository definitionRepository;
    private final WfNodeRepository nodeRepository;
    private final WfDecisionRepository decisionRepository;
    private final WfTransitionRuleRepository transitionRuleRepository;
    private final WfVariableSchemaRepository variableSchemaRepository;
    private final WfIndexMappingRepository indexMappingRepository;
    private final WfSnapshotSchemaRepository snapshotSchemaRepository;
    private final WfAssignmentRuleRepository assignmentRuleRepository;
    private final SodRuleRepository sodRuleRepository;

    // ---- WF_DEFINITION CRUD ----

    @GetMapping("/definitions")
    @Operation(summary = "List all workflow definitions")
    public ResponseEntity<List<WfDefinition>> listDefinitions() {
        return ResponseEntity.ok(definitionRepository.findAll());
    }

    @GetMapping("/definitions/by-key/{operationKey}")
    @Operation(summary = "Get definition by operationKey (diagnostic)")
    public ResponseEntity<java.util.Map<String, Object>> getDefinitionByKey(@PathVariable String operationKey) {
        WfDefinition def = definitionRepository.findByOperationKey(operationKey)
                .orElseThrow(() -> new IllegalArgumentException("Not found: " + operationKey));
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("wfDefId", def.getWfDefId());
        result.put("operationKey", def.getOperationKey());
        result.put("active", def.getActive());
        result.put("baseUrl", def.getBaseUrl());
        result.put("endpointTemplate", def.getEndpointTemplate());
        result.put("httpMethod", def.getHttpMethod());
        result.put("responseBusinessKeyPath", def.getResponseBusinessKeyPath());
        result.put("payloadBusinessKeyField", def.getPayloadBusinessKeyField());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/definitions")
    @Operation(summary = "Create a workflow definition")
    public ResponseEntity<WfDefinition> createDefinition(@RequestBody WfDefinition definition) {
        return ResponseEntity.ok(definitionRepository.save(definition));
    }

    @PutMapping("/definitions/{id}")
    @Operation(summary = "Update a workflow definition")
    public ResponseEntity<WfDefinition> updateDefinition(@PathVariable Long id, @RequestBody WfDefinition definition) {
        definition.setWfDefId(id);
        return ResponseEntity.ok(definitionRepository.save(definition));
    }

    @PatchMapping("/definitions/by-key/{operationKey}/downstream")
    @Operation(summary = "Update downstream config (baseUrl, endpointTemplate, httpMethod, etc.) by operationKey")
    public ResponseEntity<WfDefinition> updateDownstreamConfig(
            @PathVariable String operationKey,
            @RequestBody java.util.Map<String, String> config) {
        WfDefinition def = definitionRepository.findByOperationKey(operationKey)
                .orElseThrow(() -> new IllegalArgumentException("Definition not found: " + operationKey));
        if (config.containsKey("baseUrl")) def.setBaseUrl(config.get("baseUrl"));
        if (config.containsKey("endpointTemplate")) def.setEndpointTemplate(config.get("endpointTemplate"));
        if (config.containsKey("httpMethod")) def.setHttpMethod(config.get("httpMethod"));
        if (config.containsKey("responseBusinessKeyPath")) def.setResponseBusinessKeyPath(config.get("responseBusinessKeyPath"));
        if (config.containsKey("payloadBusinessKeyField")) def.setPayloadBusinessKeyField(config.get("payloadBusinessKeyField"));
        return ResponseEntity.ok(definitionRepository.save(def));
    }

    @DeleteMapping("/definitions/{id}")
    @Operation(summary = "Delete a workflow definition")
    public ResponseEntity<Void> deleteDefinition(@PathVariable Long id) {
        definitionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- WF_NODE CRUD ----

    @GetMapping("/nodes")
    @Operation(summary = "List all nodes")
    public ResponseEntity<List<WfNode>> listNodes(@RequestParam(required = false) Long wfDefId) {
        if (wfDefId != null) {
            return ResponseEntity.ok(nodeRepository.findByWfDefinition_WfDefId(wfDefId));
        }
        return ResponseEntity.ok(nodeRepository.findAll());
    }

    @PostMapping("/nodes")
    @Operation(summary = "Create a node")
    public ResponseEntity<WfNode> createNode(@RequestBody WfNode node) {
        return ResponseEntity.ok(nodeRepository.save(node));
    }

    @PutMapping("/nodes/{id}")
    @Operation(summary = "Update a node")
    public ResponseEntity<WfNode> updateNode(@PathVariable Long id, @RequestBody WfNode node) {
        node.setNodeId(id);
        return ResponseEntity.ok(nodeRepository.save(node));
    }

    @DeleteMapping("/nodes/{id}")
    @Operation(summary = "Delete a node")
    public ResponseEntity<Void> deleteNode(@PathVariable Long id) {
        nodeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- WF_DECISION CRUD ----

    @GetMapping("/decisions")
    @Operation(summary = "List decisions for a node")
    public ResponseEntity<List<WfDecision>> listDecisions(@RequestParam Long nodeId) {
        return ResponseEntity.ok(decisionRepository.findByNode_NodeId(nodeId));
    }

    @PostMapping("/decisions")
    @Operation(summary = "Create a decision")
    public ResponseEntity<WfDecision> createDecision(@RequestBody WfDecision decision) {
        return ResponseEntity.ok(decisionRepository.save(decision));
    }

    @DeleteMapping("/decisions/{id}")
    @Operation(summary = "Delete a decision")
    public ResponseEntity<Void> deleteDecision(@PathVariable Long id) {
        decisionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- WF_TRANSITION_RULE CRUD ----

    @GetMapping("/transition-rules")
    @Operation(summary = "List transition rules for a decision")
    public ResponseEntity<List<WfTransitionRule>> listTransitionRules(@RequestParam Long decisionId) {
        return ResponseEntity.ok(transitionRuleRepository.findByDecision_DecisionIdOrderByPriorityAsc(decisionId));
    }

    @PostMapping("/transition-rules")
    @Operation(summary = "Create a transition rule")
    public ResponseEntity<WfTransitionRule> createTransitionRule(@RequestBody WfTransitionRule rule) {
        return ResponseEntity.ok(transitionRuleRepository.save(rule));
    }

    @DeleteMapping("/transition-rules/{id}")
    @Operation(summary = "Delete a transition rule")
    public ResponseEntity<Void> deleteTransitionRule(@PathVariable Long id) {
        transitionRuleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- WF_VARIABLE_SCHEMA CRUD ----

    @GetMapping("/variable-schemas")
    @Operation(summary = "List variable schemas")
    public ResponseEntity<List<WfVariableSchema>> listVariableSchemas(@RequestParam Long wfDefId) {
        return ResponseEntity.ok(variableSchemaRepository.findByWfDefinition_WfDefId(wfDefId));
    }

    @PostMapping("/variable-schemas")
    @Operation(summary = "Create a variable schema")
    public ResponseEntity<WfVariableSchema> createVariableSchema(@RequestBody WfVariableSchema schema) {
        return ResponseEntity.ok(variableSchemaRepository.save(schema));
    }

    @DeleteMapping("/variable-schemas/{id}")
    @Operation(summary = "Delete a variable schema")
    public ResponseEntity<Void> deleteVariableSchema(@PathVariable Long id) {
        variableSchemaRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- WF_ASSIGNMENT_RULE CRUD ----

    @GetMapping("/assignment-rules")
    @Operation(summary = "List assignment rules for a node")
    public ResponseEntity<List<WfAssignmentRule>> listAssignmentRules(@RequestParam Long nodeId) {
        return ResponseEntity.ok(assignmentRuleRepository.findByNode_NodeIdOrderByPriorityAsc(nodeId));
    }

    @PostMapping("/assignment-rules")
    @Operation(summary = "Create an assignment rule")
    public ResponseEntity<WfAssignmentRule> createAssignmentRule(@RequestBody WfAssignmentRule rule) {
        return ResponseEntity.ok(assignmentRuleRepository.save(rule));
    }

    @DeleteMapping("/assignment-rules/{id}")
    @Operation(summary = "Delete an assignment rule")
    public ResponseEntity<Void> deleteAssignmentRule(@PathVariable Long id) {
        assignmentRuleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- SOD_RULE CRUD ----

    @GetMapping("/sod-rules")
    @Operation(summary = "List SoD rules")
    public ResponseEntity<List<SodRule>> listSodRules() {
        return ResponseEntity.ok(sodRuleRepository.findAll());
    }

    @PostMapping("/sod-rules")
    @Operation(summary = "Create a SoD rule")
    public ResponseEntity<SodRule> createSodRule(@RequestBody SodRule rule) {
        return ResponseEntity.ok(sodRuleRepository.save(rule));
    }

    @DeleteMapping("/sod-rules/{id}")
    @Operation(summary = "Delete a SoD rule")
    public ResponseEntity<Void> deleteSodRule(@PathVariable Long id) {
        sodRuleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- OPERATION INSPECTION & CONTROL ----

    @GetMapping("/operations")
    @Operation(summary = "Search operations — filter by wfDefId, businessKey or status")
    public ResponseEntity<List<WfOperation>> searchOperations(
            @RequestParam(required = false) Long wfDefId,
            @RequestParam(required = false) String businessKey,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminOperationService.searchOperations(wfDefId, businessKey, status));
    }

    @GetMapping("/operations/{id}")
    @Operation(summary = "Get a single operation by ID")
    public ResponseEntity<WfOperation> getOperation(@PathVariable Long id) {
        return ResponseEntity.ok(operationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Operation not found: " + id)));
    }

    @GetMapping("/operations/{id}/history")
    @Operation(summary = "Audit trail for an operation (newest first)")
    public ResponseEntity<List<WfActionAudit>> getOperationHistory(@PathVariable Long id) {
        return ResponseEntity.ok(adminOperationService.getHistory(id));
    }

    @PutMapping("/operations/{id}/suspend")
    @Operation(summary = "Suspend a running operation")
    public ResponseEntity<WfOperation> suspendOperation(@PathVariable Long id) {
        return ResponseEntity.ok(adminOperationService.suspend(id));
    }

    @PutMapping("/operations/{id}/resume")
    @Operation(summary = "Resume a suspended operation")
    public ResponseEntity<WfOperation> resumeOperation(@PathVariable Long id) {
        return ResponseEntity.ok(adminOperationService.resume(id));
    }

    @PostMapping("/operations/{id}/force-advance")
    @Operation(summary = "Admin override: jump the operation to a target node")
    public ResponseEntity<WfOperation> forceAdvance(
            @PathVariable Long id,
            @RequestBody ForceAdvanceRequest request,
            @RequestHeader(value = "X-User-Id", defaultValue = "0") Long adminUserId) {
        if (request.getTargetNodeKey() == null || request.getTargetNodeKey().isBlank()) {
            throw new IllegalArgumentException("targetNodeKey is required");
        }
        return ResponseEntity.ok(adminOperationService.forceAdvance(id, request.getTargetNodeKey(), request.getNote(), adminUserId));
    }
}
