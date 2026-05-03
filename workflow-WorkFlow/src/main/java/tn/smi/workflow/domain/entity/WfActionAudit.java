package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import tn.smi.workflow.domain.enums.SodResult;

import java.time.LocalDateTime;

@Entity
@Table(name = "WF_ACTION_AUDIT", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfActionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_ACTION_AUDIT")
    @SequenceGenerator(name = "SEQ_WF_ACTION_AUDIT", sequenceName = "SEQ_WF_ACTION_AUDIT", schema = "MSWF", allocationSize = 1)
    @Column(name = "audit_id")
    private Long auditId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_op_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfOperation wfOperation;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "sod_result")
    private SodResult sodResult;

    @Column(name = "justification")
    private String justification;
}

