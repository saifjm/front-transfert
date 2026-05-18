package tn.smi.workflow.domain.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ForceAdvanceRequest {
    private String targetNodeKey;
    private String note;
}
