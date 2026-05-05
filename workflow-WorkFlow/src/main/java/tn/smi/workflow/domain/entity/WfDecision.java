package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import tn.smi.workflow.domain.enums.DecisionBehavior;
import tn.smi.workflow.domain.enums.SodMode;

@Entity
@Table(name = "WF_DECISION", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_DECISION")
    @SequenceGenerator(name = "SEQ_WF_DECISION", sequenceName = "SEQ_WF_DECISION", schema = "MSWF", allocationSize = 1)
    @Column(name = "decision_id")
    private Long decisionId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "node_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfNode node;

    @Column(name = "tag", nullable = false)
    private String tag;

    @Column(name = "label")
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "behavior", nullable = false)
    private DecisionBehavior behavior;

    @Column(name = "requires_comment", nullable = false)
    private Boolean requiresComment;

    @Enumerated(EnumType.STRING)
    @Column(name = "sod_mode", nullable = false)
    private SodMode sodMode;
}

