package tn.smi.workflow.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "USER_ROLE_SCOPE", schema = "MSWF")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserRoleScope {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SEQ_USER_ROLE_SCOPE")
    @SequenceGenerator(name = "SEQ_USER_ROLE_SCOPE", sequenceName = "SEQ_USER_ROLE_SCOPE", schema = "MSWF", allocationSize = 1)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Role role;

    @Column(name = "org_node_id")
    private Long orgNodeId;

    @Column(name = "active", nullable = false)
    private Boolean active;
}
