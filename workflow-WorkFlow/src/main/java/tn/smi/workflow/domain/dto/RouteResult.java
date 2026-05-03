package tn.smi.workflow.domain.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RouteResult {
    private String targetNodeKey; // null if END

    /** Passed to the downstream MS métier — true = create/finalize folder, false = save draft */
    private boolean metierFinalize;

    /**
     * Workflow-level finalization.
     * true  (default) → workflow continues normally
     * false → workflow closes the operation as REJECTED after the downstream call
     */
    @Builder.Default
    private boolean wfFinalize = true;

    private String serviceAction;
    private boolean manualRequired;
    private java.util.List<ManualTarget> manualTargets;
    private boolean endProcess;
}

