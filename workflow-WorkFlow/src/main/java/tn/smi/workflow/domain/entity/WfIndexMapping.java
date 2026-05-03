package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "WF_INDEX_MAPPING", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfIndexMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_INDEX_MAPPING")
    @SequenceGenerator(name = "SEQ_WF_INDEX_MAPPING", sequenceName = "SEQ_WF_INDEX_MAPPING", schema = "MSWF", allocationSize = 1)
    @Column(name = "map_id")
    private Long mapId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_def_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfDefinition wfDefinition;

    @Column(name = "var_name", nullable = false)
    private String varName;

    @Column(name = "index_column", nullable = false)
    private String indexColumn;
}

