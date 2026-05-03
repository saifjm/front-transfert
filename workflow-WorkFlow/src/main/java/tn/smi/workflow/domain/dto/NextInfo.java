package tn.smi.workflow.domain.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NextInfo {
    private String nodeKey;
    private List<DecisionInfo> decisions;
}

