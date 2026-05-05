package tn.smi.workflow.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import tn.smi.workflow.domain.enums.OrgNodeType;

@Entity
@Table(name = "ORG_NODE", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrgNode {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_ORG_NODE")
    @SequenceGenerator(name = "SEQ_ORG_NODE", sequenceName = "SEQ_ORG_NODE", schema = "MSWF", allocationSize = 1)
    @Column(name = "org_node_id")
    private Long orgNodeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private OrgNodeType type;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "label")
    private String label;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "active", nullable = false)
    private Boolean active;
}
