package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "WF_ASSIGNMENT_RULE", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfAssignmentRule {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_ASSIGNMENT_RULE")
    @SequenceGenerator(name = "SEQ_WF_ASSIGNMENT_RULE", sequenceName = "SEQ_WF_ASSIGNMENT_RULE", schema = "MSWF", allocationSize = 1)
    @Column(name = "assign_rule_id")
    private Long assignRuleId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "node_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfNode node;

    @Column(name = "priority", nullable = false)
    private Integer priority;

    @Column(name = "condition_expr")
    private String conditionExpr;

    @Column(name = "candidate_role_code")
    private String candidateRoleCode;

    @Column(name = "candidate_user_id")
    private Long candidateUserId;
}

