package tn.smi.workflow.domain.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DecisionRequest {

    private Map<String, Object> payload;

    private String comment;

    private String justification;

    private String manualTargetNodeKey;
}

