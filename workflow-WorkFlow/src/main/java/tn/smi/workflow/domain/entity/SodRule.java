package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import tn.smi.workflow.domain.enums.Severity;
import tn.smi.workflow.domain.enums.SodRuleType;

@Entity
@Table(name = "SOD_RULE", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SodRule {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_SOD_RULE")
    @SequenceGenerator(name = "SEQ_SOD_RULE", sequenceName = "SEQ_SOD_RULE", schema = "MSWF", allocationSize = 1)
    @Column(name = "sod_rule_id")
    private Long sodRuleId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_def_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfDefinition wfDefinition;

    @Column(name = "operation_key")
    private String operationKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false)
    private SodRuleType ruleType;

    @Column(name = "node_a")
    private String nodeA;

    @Column(name = "node_b")
    private String nodeB;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    private Severity severity;

    @Column(name = "exception_expr")
    private String exceptionExpr;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled;
}
