package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import tn.smi.workflow.domain.enums.CallStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "WF_DOWNSTREAM_CALL", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfDownstreamCall {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_DOWNSTREAM_CALL")
    @SequenceGenerator(name = "SEQ_WF_DOWNSTREAM_CALL", sequenceName = "SEQ_WF_DOWNSTREAM_CALL", schema = "MSWF", allocationSize = 1)
    @Column(name = "call_id")
    private Long callId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_op_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfOperation wfOperation;

    @Column(name = "task_id")
    private String taskId;

    @Column(name = "finalize", nullable = false)
    private Boolean finalize;

    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;

    @Column(name = "endpoint")
    private String endpoint;

    @Column(name = "request_summary", columnDefinition = "CLOB")
    private String requestSummary;

    @Column(name = "response_status")
    private Integer responseStatus;

    @Column(name = "response_body", columnDefinition = "CLOB")
    private String responseBody;

    @Column(name = "error", columnDefinition = "CLOB")
    private String error;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CallStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
