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
@Audited
@Table(name = "BENEFICIAIRES")
public class Beneficiaire {
    @EmbeddedId
    private BeneficiaireId id;

    @Column(name = "CODE_TYPE_DOS")
    private Short codeTypeDos;

    @Column(name = "CODE_AGENCE_AVA")
    private Long codeAgenceAva;

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

    // Relation ManyToOne vers OperationsDeleguee - Non auditée
    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NUM_DOSSIER", referencedColumnName = "NUM_DOSSIER", insertable = false, updatable = false)
    @JsonIgnore
    private OperationsDeleguee operationsDeleguee;

}