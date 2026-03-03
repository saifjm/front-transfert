package IbansysPoc.AVA.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "AVA_ACTIVITE")
public class AvaActivite {
    @Id
    @Column(name = "CODE_ACTIVITE", columnDefinition = "unknown")
    private Integer codeActivite;

    @Column(name = "LIB_ACTIVITE", columnDefinition = "unknown")
    private String libActivite;

}