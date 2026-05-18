package IbansysPoc.AVA.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "AVA_MARCHE")
@Audited
public class AvaMarche {
    @Id
    @Column(name = "NUM_DOSSIER")
    private Integer numDossier;

    @Column(name = "NUM_MARCHE", length = 50)
    private String numMarche;

    @Column(name = "MONTANT_MARCHE")
    private Long montantMarche;

    @Column(name = "REF_CONTRAT", length = 50)
    private String refContrat;

    @Column(name = "DATE_CONTRAT")
    private LocalDate dateContrat;

    @Column(name = "CONTRACTANT", length = 50)
    private String contractant;

    @Column(name = "DATE_DOSSIER")
    private LocalDate dateDossier;

    @Column(name = "CODE_AGENCE_AVA")
    private Short codeAgenceAva;

    @Column(name = "STATUS", length = 1)
    private String status;

    @Column(name = "DATE_FIN")
    private LocalDate dateFin;

    @Column(name = "CODE_DEVISE")
    private Short codeDevise;

    @Column(name = "MNT_DEVISE")
    private Long mntDevise;

    // Relation ManyToOne vers OperationsDeleguee - Non auditée
    @NotAudited
    @OneToOne (fetch = FetchType.LAZY)
    @JoinColumn(name = "NUM_DOSSIER", referencedColumnName = "NUM_DOSSIER", insertable = false, updatable = false)
    @JsonIgnore
    private OperationsDeleguee operationsDeleguee;


}