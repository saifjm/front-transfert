package tn.smi.workflow.domain.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserContext {
    private Long userId;
    private Long orgNodeId;
    private String roleCode;
    private String username;
}
