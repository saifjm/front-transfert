package tn.smi.workflow.domain.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OperationState {
    private String status;
    private String currentNodeKey;
    private String businessKey;
}

