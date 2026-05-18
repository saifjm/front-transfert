package tn.smi.workflow.domain.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DecisionInfo {
    private String tag;
    private String label;
    private Boolean requiresComment;
    private String behavior;
}

