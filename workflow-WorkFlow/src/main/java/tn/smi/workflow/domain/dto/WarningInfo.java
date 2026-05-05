package tn.smi.workflow.domain.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WarningInfo {
    private String ruleType;
    private String message;
}

