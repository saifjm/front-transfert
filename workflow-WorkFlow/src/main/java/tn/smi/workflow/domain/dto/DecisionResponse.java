package tn.smi.workflow.domain.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DecisionResponse {
    /**
     * Possible values:
     * OK                    — decision accepted, workflow advanced normally
     * REJECTED              — operation closed as rejected (wfFinalize=false, or business layer rejected a draft call)
     * WARN_REQUIRED         — SoD warning; justification must be re-submitted
     * MANUAL_TARGET_REQUIRED — routing requires a manual node selection
     * ERROR                 — unexpected failure (e.g. finalizing call to downstream failed)
     */
    private String result;
    private String errorMessage; // populated on ERROR
    private OperationState state;
    private NextInfo next;
    private List<WarningInfo> warnings;
    private Boolean requiresJustification;
    private List<ManualTarget> manualTargets;
}

