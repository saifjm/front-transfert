package tn.smi.workflow.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "WF_DEFINITION", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WfDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_WF_DEFINITION")
    @SequenceGenerator(name = "SEQ_WF_DEFINITION", sequenceName = "SEQ_WF_DEFINITION", schema = "MSWF", allocationSize = 1)
    @Column(name = "wf_def_id")
    private Long wfDefId;

    @Column(name = "operation_key", nullable = false, unique = true)
    private String operationKey;

    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "active", nullable = false)
    private Boolean active;

    @Column(name = "label")
    private String label;

    @Column(name = "description")
    private String description;

    /**
     * Base URL of the downstream business microservice.
     * Example: http://localhost:8080
     */
    @Column(name = "base_url")
    private String baseUrl;

    /**
     * Endpoint template for the downstream call.
     * Placeholders: {businessKey}, {finalize}
     * Example: /api/operations-deleguees-mvt/initialisation?finalize={finalize}
     */
    @Column(name = "endpoint_template")
    private String endpointTemplate;

    /**
     * HTTP method for the downstream call (POST, PUT). Default: POST
     */
    @Column(name = "http_method")
    private String httpMethod;

    /**
     * JSONPath to extract the real business key from the downstream response.
     * Example: $.refOperation
     * Used to update the WF operation's businessKey after the first call.
     */
    @Column(name = "resp_bk_path")
    private String responseBusinessKeyPath;

    /**
     * Field name to inject the businessKey into the payload for subsequent calls.
     * Example: refOperation
     * If set, MS-WF will add this field to the payload before calling downstream.
     */
    @Column(name = "payload_bk_field")
    private String payloadBusinessKeyField;
}
