package tn.smi.workflow.domain.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TaskResponse {
    private String taskId;
    private String currentNodeKey;
    private String nodeLabel;
    private Boolean claimEnabled;
    private String assignee;
    private List<String> candidates;
    private List<DecisionInfo> decisions;
}

