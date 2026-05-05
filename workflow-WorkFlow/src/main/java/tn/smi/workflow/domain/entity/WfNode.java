package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import tn.smi.workflow.domain.enums.FinalizePolicy;
import tn.smi.workflow.domain.enums.NodeType;

@Entity
@Table(name = "WF_NODE", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfNode {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_NODE")
    @SequenceGenerator(name = "SEQ_WF_NODE", sequenceName = "SEQ_WF_NODE", schema = "MSWF", allocationSize = 1)
    @Column(name = "node_id")
    private Long nodeId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_def_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfDefinition wfDefinition;

    @Column(name = "node_key", nullable = false)
    private String nodeKey;

    @Column(name = "label")
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type", nullable = false)
    private NodeType nodeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "finalize_policy", nullable = false)
    private FinalizePolicy finalizePolicy;

    @Column(name = "claim_enabled", nullable = false)
    private Boolean claimEnabled;
}

