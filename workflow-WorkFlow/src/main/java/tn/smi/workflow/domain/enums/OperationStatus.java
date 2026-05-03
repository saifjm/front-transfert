package tn.smi.workflow.domain.enums;

public enum OperationStatus {
    RUNNING,
    ENDED,
    SUSPENDED,
    /** Operation was explicitly rejected (workflow or business layer). No folder created. */
    REJECTED
}

