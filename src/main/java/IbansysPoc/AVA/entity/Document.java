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
@Table(name = "DOCUMENTS")
public class Document {
    @Id
    @Column(name = "NUM_LIGNE", nullable = false)
    private Long numLigne;


    @Column(name = "CODE_PRODUIT_SERVICE", nullable = false)
    private Short codeProduitService;

    @Column(name = "CODE_OPERATION", nullable = false)
    private Integer codeOperation;

    @Column(name = "REF_OPERATION", nullable = false)
    private Long refOperation;

    @Column(name = "DATE_OPERATION")
    private LocalDate dateOperation;

    @Column(name = "TYPE_DOCUMENT")
    private Long typeDocument;

    @Column(name = "NUM_DOSSIER")
    private Integer numDossier;

    @Column(name = "DATE_DOSSIER")
    private LocalDate dateDossier;

    @Column(name = "REFERENCE_FICHIER_JOINT", length = 45)
    private String referenceFichierJoint;

    @Column(name = "EXTENTION", length = 5)
    private String extention;

    @Column(name = "PATH_ANNEE", length = 4)
    private String pathAnnee;

    @Column(name = "PATH_MOIS", length = 2)
    private String pathMois;

    // Relation ManyToOne vers OperationsDeleguee - Non auditée
    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NUM_DOSSIER", referencedColumnName = "NUM_DOSSIER", insertable = false, updatable = false)
    @JsonBackReference
    private OperationsDeleguee operationsDeleguee;

    // Relation ManyToOne vers OperationsDelegueesMvt - Non auditée
    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "REF_OPERATION", referencedColumnName = "REF_OPERATION", insertable = false, updatable = false),
            @JoinColumn(name = "DATE_OPERATION", referencedColumnName = "DATE_OPERATION", insertable = false, updatable = false)
    })
    @JsonBackReference("mvt-docs")
    private OperationsDelegueesMvt operationsDelegueesMvt;


}