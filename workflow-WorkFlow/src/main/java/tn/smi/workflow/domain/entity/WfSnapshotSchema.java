package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "WF_SNAPSHOT_SCHEMA", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfSnapshotSchema {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_SNAPSHOT_SCHEMA")
    @SequenceGenerator(name = "SEQ_WF_SNAPSHOT_SCHEMA", sequenceName = "SEQ_WF_SNAPSHOT_SCHEMA", schema = "MSWF", allocationSize = 1)
    @Column(name = "snap_schema_id")
    private Long snapSchemaId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_def_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfDefinition wfDefinition;

    @Column(name = "field_name", nullable = false)
    private String fieldName;

    @Column(name = "json_path", nullable = false)
    private String jsonPath;

    @Column(name = "field_type", nullable = false)
    private String fieldType;
}

