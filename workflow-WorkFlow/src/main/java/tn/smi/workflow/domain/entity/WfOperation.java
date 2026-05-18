package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import tn.smi.workflow.domain.enums.OperationStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "WF_OPERATION", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_OPERATION")
    @SequenceGenerator(name = "SEQ_WF_OPERATION", sequenceName = "SEQ_WF_OPERATION", schema = "MSWF", allocationSize = 1)
    @Column(name = "wf_op_id")
    private Long wfOpId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_def_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfDefinition wfDefinition;

    @Column(name = "business_key", nullable = false, unique = true)
    private String businessKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OperationStatus status;

    @Column(name = "current_node_key")
    private String currentNodeKey;

    @Column(name = "initiator_user_id")
    private Long initiatorUserId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_task_id")
    private String lastTaskId;

    @Column(name = "last_decision_tag")
    private String lastDecisionTag;

    @Column(name = "process_instance_id")
    private String processInstanceId;
}
