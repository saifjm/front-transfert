package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "WF_OPERATION_SNAPSHOT", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfOperationSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_OP_SNAPSHOT")
    @SequenceGenerator(name = "SEQ_WF_OP_SNAPSHOT", sequenceName = "SEQ_WF_OP_SNAPSHOT", schema = "MSWF", allocationSize = 1)
    @Column(name = "snapshot_id")
    private Long snapshotId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_op_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfOperation wfOperation;

    @Column(name = "task_id")
    private String taskId;

    @Column(name = "node_key", nullable = false)
    private String nodeKey;

    @Column(name = "decision_tag")
    private String decisionTag;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "org_node_id")
    private Long orgNodeId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "snapshot_json", columnDefinition = "CLOB")
    private String snapshotJson;

    @Column(name = "warn_justification")
    private String warnJustification;
}

