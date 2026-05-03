package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import tn.smi.workflow.domain.enums.VarType;

@Entity
@Table(name = "WF_VARIABLE_SCHEMA", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfVariableSchema {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_VARIABLE_SCHEMA")
    @SequenceGenerator(name = "SEQ_WF_VARIABLE_SCHEMA", sequenceName = "SEQ_WF_VARIABLE_SCHEMA", schema = "MSWF", allocationSize = 1)
    @Column(name = "var_id")
    private Long varId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wf_def_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WfDefinition wfDefinition;

    @Column(name = "var_name", nullable = false)
    private String varName;

    @Column(name = "json_path", nullable = false)
    private String jsonPath;

    @Enumerated(EnumType.STRING)
    @Column(name = "var_type", nullable = false)
    private VarType varType;

    @Column(name = "indexed", nullable = false)
    private Boolean indexed;
}

