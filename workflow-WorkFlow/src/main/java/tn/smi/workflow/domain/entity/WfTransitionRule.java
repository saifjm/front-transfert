package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "WF_TRANSITION_RULE", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfTransitionRule {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_TRANSITION_RULE")
    @SequenceGenerator(name = "SEQ_WF_TRANSITION_RULE", sequenceName = "SEQ_WF_TRANSITION_RULE", schema = "MSWF", allocationSize = 1)
    @Column(name = "rule_id")
    private Long ruleId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "decision_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfDecision decision;

    @Column(name = "priority", nullable = false)
    private Integer priority;

    @Column(name = "condition_expr")
    private String conditionExpr;

    @Column(name = "target_node_key")
    private String targetNodeKey;

    /**
     * Whether the downstream business MS should finalize the operation (create the folder).
     * true  → MS métier creates/finalizes the dossier (status A)
     * false → MS métier saves a draft only (status I)
     */
    @Column(name = "finalize", nullable = false)
    private Boolean metierFinalize;

    /**
     * Whether the workflow itself considers this transition a successful continuation.
     * true  (default) → workflow continues normally (move to next node or end successfully)
     * false → workflow closes the operation as REJECTED immediately after the downstream call
     */
    @Column(name = "wf_finalize", nullable = false)
    private Boolean wfFinalize;

    @Column(name = "manual_choice_group")
    private String manualChoiceGroup;

    @Column(name = "service_action")
    private String serviceAction;
}

