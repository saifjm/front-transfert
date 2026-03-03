package IbansysPoc.AVA.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Audited
@Table(name = "AVA_MARCHE_MVT")
public class AvaMarcheMvt {
    @EmbeddedId
    private AvaMarcheMvtId id;

    @Column(name = "MONTANT_MARCHE")
    private Long montantMarche;

    @Column(name = "REF_CONTRAT", length = 50)
    private String refContrat;

    @Column(name = "DATE_CONTRAT")
    private LocalDate dateContrat;

    @Column(name = "CONTRACTANT", length = 50)
    private String contractant;

    @Column(name = "NUM_DOSSIER")
    private Integer numDossier;

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

    // Relation ManyToOne vers OperationsDelegueesMvt - Non auditée
    @NotAudited
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "REF_OPERATION", referencedColumnName = "REF_OPERATION", insertable = false, updatable = false),
            @JoinColumn(name = "DATE_OPERATION", referencedColumnName = "DATE_OPERATION", insertable = false, updatable = false)
    })
    @JsonBackReference("mvt-marche")
    private OperationsDelegueesMvt operationsDelegueesMvt;

}