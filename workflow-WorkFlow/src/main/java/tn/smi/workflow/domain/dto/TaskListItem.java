package tn.smi.workflow.domain.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TaskListItem {
    private String businessKey;
    private String operationKey;
    private String currentNodeKey;
    private String nodeLabel;
    private LocalDateTime createdAt;
    private String idxClientId;
    private String idxRef;
    private String idxAgenceId;
    private Double idxAmountTnd;
    private String taskId;
}
