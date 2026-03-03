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
@Table(name = "BENEFICIAIRES_MVT")
public class BeneficiairesMvt {
    @EmbeddedId
    private BeneficiairesMvtId id;

    @Column(name = "CODE_TYPE_DOS")
    private Short codeTypeDos;

    @Column(name = "CODE_AGENCE_AVA")
    private Short codeAgenceAva;

    @Column(name = "NOM_BENEF", length = 50)
    private String nomBenef;

    @Column(name = "ADRESSE_BENEF", length = 50)
    private String adresseBenef;

    @Column(name = "QUALITE", length = 30)
    private String qualite;

    @Column(name = "DATE_PIECE")
    private LocalDate datePiece;

    @Column(name = "ETAT", length = 2)
    private String etat;

    @Column(name = "DATE_CREATION")
    private LocalDate dateCreation;

    @Column(name = "DATE_SUPPRESSION")
    private LocalDate dateSuppression;

    // Relation ManyToOne vers OperationsDelegueesMvt - Non auditée
    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "REF_OPERATION", referencedColumnName = "REF_OPERATION", insertable = false, updatable = false),
            @JoinColumn(name = "DATE_OPERATION", referencedColumnName = "DATE_OPERATION", insertable = false, updatable = false)
    })
    @JsonBackReference("mvt-benefs")
    private OperationsDelegueesMvt operationsDelegueesMvt;

}