package tn.smi.workflow.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "WF_OPERATION_INDEX", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfOperationIndex {

    @Id
    @Column(name = "wf_op_id")
    private Long wfOpId;

    @OneToOne(fetch = FetchType.EAGER)
    @MapsId
    @JoinColumn(name = "wf_op_id")
    private WfOperation wfOperation;

    @Column(name = "idx_client_id")
    private String idxClientId;

    @Column(name = "idx_ref")
    private String idxRef;

    @Column(name = "idx_agence_id")
    private String idxAgenceId;

    @Column(name = "idx_amount_tnd")
    private Double idxAmountTnd;

    @Column(name = "idx1")
    private String idx1;

    @Column(name = "idx2")
    private String idx2;

    @Column(name = "idx3")
    private String idx3;

    @Column(name = "idx4")
    private String idx4;

    @Column(name = "idx5")
    private String idx5;

    @Column(name = "idx6")
    private String idx6;

    @Column(name = "idx7")
    private String idx7;

    @Column(name = "idx8")
    private String idx8;

    @Column(name = "idx9")
    private String idx9;

    @Column(name = "idx10")
    private String idx10;
}

