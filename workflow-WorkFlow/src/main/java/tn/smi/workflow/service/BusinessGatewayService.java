package tn.smi.workflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tn.smi.workflow.domain.dto.UserContext;
import tn.smi.workflow.domain.entity.WfDefinition;
import tn.smi.workflow.domain.entity.WfDownstreamCall;
import tn.smi.workflow.domain.entity.WfOperation;
import tn.smi.workflow.domain.enums.CallStatus;
import tn.smi.workflow.repo.WfDownstreamCallRepository;
import tn.smi.workflow.repo.WfOperationRepository;
import tn.smi.workflow.util.IdempotencyKeyFactory;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusinessGatewayService {

    private final WebClient.Builder webClientBuilder;
    private final WfDownstreamCallRepository downstreamCallRepository;
    private final IdempotencyKeyFactory idempotencyKeyFactory;
    private final ObjectMapper objectMapper;
    private final WfOperationRepository operationRepository;

    /**
     * Call the downstream business MS with applyAction.
     *
     * @param operation    the WF operation
     * @param taskId       current Flowable task ID
     * @param nodeKey      current node key
     * @param decisionTag  the decision taken
     * @param finalize     whether to finalize
     * @param payload      the payload to forward
     * @param userContext  the user context
     * @return response body as string
     */
    public String callBusinessService(WfOperation operation, WfDefinition wfDefinition, String taskId, String nodeKey,
                                       String decisionTag, boolean finalize,
                                       Map<String, Object> payload, UserContext userContext) {

        String operationKey = wfDefinition.getOperationKey();
        String businessKey = operation.getBusinessKey();
        String baseUrl = wfDefinition.getBaseUrl();
        String endpointTemplate = wfDefinition.getEndpointTemplate();

        // Validate downstream config
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new IllegalStateException(
                    "baseUrl is not configured on WfDefinition for operationKey=" + operationKey
                    + ". Update it via PUT /api/wf/admin/definitions/{id} with baseUrl e.g. http://localhost:8080");
        }

        // Build the endpoint from the definition's template
        String endpoint;
        if (endpointTemplate != null && !endpointTemplate.isBlank()) {
            // Start with the template
            endpoint = endpointTemplate;
            log.info("Original endpoint template: {}", endpoint);
            
            // Replace custom placeholders from payload FIRST (e.g., {numDossier}, {refOperation}, etc.)
            if (payload != null) {
                for (Map.Entry<String, Object> entry : payload.entrySet()) {
                    String placeholder = "{" + entry.getKey() + "}";
                    if (endpoint.contains(placeholder)) {
                        String value = entry.getValue() != null ? String.valueOf(entry.getValue()) : "";
                        endpoint = endpoint.replace(placeholder, value);
                        log.info("Replaced placeholder '{}' with value '{}'", placeholder, value);
                    }
                }
            }

            // Then replace standard placeholders
            endpoint = endpoint
                    .replace("{businessKey}", businessKey)
                    .replace("{finalize}", String.valueOf(finalize));
            log.info("Final endpoint after replacements: {}", endpoint);
        } else {
            throw new IllegalStateException(
                    "endpointTemplate is not configured on WfDefinition for operationKey=" + operationKey
                    + ". Update it via PUT /api/wf/admin/definitions/{id} with endpointTemplate e.g. /api/xxx/initialisation?finalize={finalize}");
        }

        String fullUrl = baseUrl + endpoint;
        log.info("Downstream call: {} {}", "POST", fullUrl);
        log.info("Auth context: authToken={}, sessionId={}, clientIp={}",
                userContext.getAuthToken() != null ? "PRESENT(" + userContext.getAuthToken().length() + "chars)" : "NULL",
                userContext.getSessionId() != null ? userContext.getSessionId() : "NULL",
                userContext.getClientIp() != null ? userContext.getClientIp() : "NULL");

        String idempotencyKey = idempotencyKeyFactory.generate(
                operation.getWfOpId(), taskId, decisionTag, businessKey);

        // Record intention
        WfDownstreamCall call = WfDownstreamCall.builder()
                .wfOperation(operation)
                .taskId(taskId)
                .finalize(finalize)
                .idempotencyKey(idempotencyKey)
                .endpoint(fullUrl)
                .status(CallStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        try {
            // Inject businessKey into payload if configured (e.g., refOperation for updates)
            Map<String, Object> finalPayload = payload != null ? new HashMap<>(payload) : new HashMap<>();
            String payloadBkField = wfDefinition.getPayloadBusinessKeyField();
            if (payloadBkField != null && !payloadBkField.isBlank()) {
                String currentBk = operation.getBusinessKey();
                // If this operation still uses a TEMP businessKey (first call), remove any client-supplied field
                if (currentBk != null && currentBk.startsWith("TEMP-")) {
                    if (finalPayload.containsKey(payloadBkField)) {
                        log.debug("Removing client-supplied payload businessKey field '{}' on first call (TEMP BK)", payloadBkField);
                        finalPayload.remove(payloadBkField);
                    }
                } else {
                    // Only inject if businessKey is a real value (not the temp key from first call)
                    if (currentBk != null && !currentBk.startsWith("TEMP-")) {
                        finalPayload.put(payloadBkField, parseLong(currentBk));
                    }
                }
            }

            // Send the business payload directly (as the MS métier expects it)
            String requestBody = objectMapper.writeValueAsString(finalPayload);
            call.setRequestSummary(requestBody);
            downstreamCallRepository.save(call);

            String httpMethod = wfDefinition.getHttpMethod();
            if (httpMethod == null || httpMethod.isBlank()) {
                httpMethod = "POST";
            }

            log.info("HTTP Method: {}", httpMethod);
            log.info("Full URL to call: {}", fullUrl);

            // Make HTTP call - use fresh WebClient and URI object to avoid Spring URI template expansion issues
            WebClient dedicated = WebClient.builder().build();
            java.net.URI uri = java.net.URI.create(fullUrl);

            WebClient.RequestBodySpec requestSpec = dedicated
                    .method(org.springframework.http.HttpMethod.valueOf(httpMethod.toUpperCase()))
                    .uri(uri)
                    .header("Content-Type", "application/json")
                    .header("Idempotency-Key", idempotencyKey)
                    .header("X-WF-Operation-Id", String.valueOf(operation.getWfOpId()))
                    .header("X-WF-Node-Key", nodeKey)
                    .header("X-WF-Decision-Tag", decisionTag)
                    .header("X-User-Id", String.valueOf(userContext.getUserId()));

            if (userContext.getOrgNodeId() != null) {
                requestSpec = requestSpec.header("X-Org-Node-Id", String.valueOf(userContext.getOrgNodeId()));
            }
            if (userContext.getRoleCode() != null) {
                requestSpec = requestSpec.header("X-Role-Code", userContext.getRoleCode());
            }
            if (userContext.getAuthToken() != null && !userContext.getAuthToken().isBlank()) {
                requestSpec = requestSpec.header("Authorization", userContext.getAuthToken());
            }
            if (userContext.getSessionId() != null && !userContext.getSessionId().isBlank()) {
                requestSpec = requestSpec.header("X-Session-Id", userContext.getSessionId());
            }
            if (userContext.getClientIp() != null && !userContext.getClientIp().isBlank()) {
                requestSpec = requestSpec.header("X-Forwarded-For", userContext.getClientIp());
            }

            String responseBody = requestSpec
                    .bodyValue(requestBody)
                    .exchangeToMono(resp -> {
                        if (resp.statusCode().isError()) {
                            return resp.bodyToMono(String.class)
                                    .defaultIfEmpty("")
                                    .flatMap(errBody -> {
                                        log.error("Downstream {} error {}: body={}",
                                                fullUrl, resp.statusCode().value(), errBody);
                                        return reactor.core.publisher.Mono.error(
                                                new org.springframework.web.reactive.function.client.WebClientResponseException(
                                                        resp.statusCode().value(),
                                                        resp.statusCode().toString(),
                                                        null, errBody.getBytes(), null));
                                    });
                        }
                        return resp.bodyToMono(String.class);
                    })
                    .block();

            call.setStatus(CallStatus.SUCCESS);
            call.setResponseStatus(200);
            call.setResponseBody(responseBody);
            downstreamCallRepository.save(call);

            // Extract real businessKey from response if configured
            String respBkPath = wfDefinition.getResponseBusinessKeyPath();
            log.info("responseBusinessKeyPath config = '{}', responseBody = '{}'", respBkPath,
                    responseBody != null ? responseBody.substring(0, Math.min(responseBody.length(), 200)) : "null");
            if (respBkPath != null && !respBkPath.isBlank() && responseBody != null) {
                try {
                    Object extractedKey = JsonPath.read(responseBody, respBkPath);
                    if (extractedKey != null) {
                        String newBusinessKey = String.valueOf(extractedKey);
                        String oldBusinessKey = operation.getBusinessKey();

                        // Check for existing operation with same businessKey to avoid unique constraint violation
                        Optional<WfOperation> existing = operationRepository.findByBusinessKey(newBusinessKey);
                        if (existing.isPresent() && !existing.get().getWfOpId().equals(operation.getWfOpId())) {
                            log.warn("Detected existing WfOperation (wfOpId={}) using businessKey='{}'. Cannot reassign businessKey on wfOpId={}.",
                                    existing.get().getWfOpId(), newBusinessKey, operation.getWfOpId());
                            throw new tn.smi.workflow.exception.BusinessKeyConflictException(
                                    "BusinessKey '" + newBusinessKey + "' already exists for wfOpId=" + existing.get().getWfOpId());
                        }

                        if (!newBusinessKey.equals(oldBusinessKey)) {
                            log.info("Updating businessKey from '{}' to '{}' (extracted from response via {})",
                                    oldBusinessKey, newBusinessKey, respBkPath);
                            operation.setBusinessKey(newBusinessKey);
                            // Note: operation is saved by the caller (WorkflowRuntimeService)
                        }
                    }
                } catch (PathNotFoundException e) {
                    log.debug("responseBusinessKeyPath '{}' not found in response", respBkPath);
                } catch (Exception e) {
                    log.warn("Error extracting businessKey from response: {}", e.getMessage());
                    throw e;
                }
            }

            return responseBody;
        } catch (Exception e) {
            log.error("Error calling business service at {}: {}", fullUrl, e.getMessage(), e);
            call.setStatus(CallStatus.FAILED);
            call.setError(e.getMessage());
            downstreamCallRepository.save(call);
            throw new RuntimeException("Business service call failed: " + e.getMessage(), e);
        }
    }

    /**
     * Try to parse as Long (for numeric refOperation), fallback to String.
     */
    private Object parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return value;
        }
    }
}
