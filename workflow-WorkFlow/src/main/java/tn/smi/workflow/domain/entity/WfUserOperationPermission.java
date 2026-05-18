package tn.smi.workflow.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "WF_USER_OPERATION_PERMISSION", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfUserOperationPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_USER_OP_PERM")
    @SequenceGenerator(name = "SEQ_WF_USER_OP_PERM", sequenceName = "SEQ_WF_USER_OP_PERM", schema = "MSWF", allocationSize = 1)
    @Column(name = "perm_id")
    private Long permId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "operation_key", nullable = false)
    private String operationKey;

    @Column(name = "org_node_id")
    private Long orgNodeId;

    @Column(name = "can_act", nullable = false)
    private Boolean canAct;

    @Column(name = "active", nullable = false)
    private Boolean active;
}

