package tn.smi.workflow.domain.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SodCheckResult {
    private String result; // OK, WARN, BLOCK
    private List<WarningInfo> warnings;
}

