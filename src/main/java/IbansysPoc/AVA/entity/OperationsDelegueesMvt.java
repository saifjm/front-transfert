package IbansysPoc.AVA.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Audited
@Table(name = "OPERATIONS_DELEGUEES_MVT")
public class OperationsDelegueesMvt {
    @EmbeddedId
    private OperationsDelegueesMvtId id;

    @Column(name = "CODE_PRODUIT_SERVICE")
    private Short codeProduitService;

    @Column(name = "CODE_OPERATION")
    private Integer codeOperation;

    @Column(name = "CODE_TYPE_DOS_AVA")
    private Short codeTypeDosAva;

    @Column(name = "NUM_DOSSIER")
    private Integer numDossier;

    @Column(name = "DATE_DOSSIER")
    private LocalDate dateDossier;

    @Column(name = "CODE_AGENCE_AVA")
    private Short codeAgenceAva;

    @Column(name = "TYPE_PIECE_CLIENT")
    private Integer typePieceClient;

    @Column(name = "NO_PIECE_CLIENT", length = 13)
    private String noPieceClient;

    @Column(name = "NUMERO_COMPTE", length = 50)
    private String numeroCompte;

    @Column(name = "TEL", length = 15)
    private String tel;

    @Column(name = "CODE_ACTIVITE")
    private Integer codeActivite;

    @Column(name = "CODE_SOUS_ACTIVITE")
    private Integer codeSousActivite;

    @Column(name = "DECLARATION_FISCALE", length = 1)
    private String declarationFiscale;

    @Column(name = "DATE_ULT_DECL_CAF")
    private LocalDate dateUltDeclCaf;

    @Column(name = "CODE_BANQUE_PROVENANCE")
    private Integer codeBanqueProvenance;

    @Column(name = "MNT_AVANCE", precision = 19, scale = 3)
    private BigDecimal mntAvance;

    @Column(name = "MNT_MVT_AVA", precision = 23, scale = 3)
    private BigDecimal mntMvtAva;

    @Column(name = "MNT_UTILISE", precision = 19, scale = 3)
    private BigDecimal mntUtilise;

    @Column(name = "MNT_AUTORISE", precision = 19, scale = 3)
    private BigDecimal mntAutorise;


    @Column(name = "SOLDE", precision = 19, scale = 3)
    private BigDecimal solde;

    @Column(name = "MNT_CA", precision = 19, scale = 3)
    private BigDecimal mntCa;

    @Column(name = "MNT_CA_FISCAL", precision = 19, scale = 3)
    private BigDecimal mntCaFiscal;

    @Column(name = "MNT_IMPORTATION")
    private Long mntImportation;

    @Column(name = "NUMERO_BCT")
    private Integer numeroBct;

    @Column(name = "DATE_BCT")
    private LocalDate dateBct;

    @Column(name = "ECHEANCE")
    private LocalDate echeance;

    @Column(name = "ANNEE")
    private Short annee;

    @Column(name = "NUM_MVT_AVA")
    private Integer NumMvtAva;

    @Column(name = "ETAT_DOSSIER", length = 1)
    private String etatDossier;

    @Column(name = "CODE_ETAT")
    private Short codeEtat;

    @Column(name = "DATE_ETAT")
    private LocalDate dateEtat;

    @Column(name = "MOTIF_ETAT", length = 100)
    private String motifEtat;

    @Column(name = "STATUS", length = 1)
    private String status;

    @Column(name = "DATE_VALIDATION")
    private LocalDate dateValidation;

    @Column(name = "MNT_AUTORISATION_BCT", precision = 23, scale = 3)
    private BigDecimal mntAutoriseBct;

    @Column(name = "MNT_BLOCAGE", precision = 23, scale = 3)
    private BigDecimal mntBlocage;

    @Column(name = "ORIGINE")
    private String origine;

    @Column(name = "REFERENCE_RES")
    private String referenceRes;

    @Column(name = "REFERENCE_CLOTURE", length = 20)
    private String referenceCloture;

    @Column(name = "MNT_RESERVE", precision = 23, scale = 3)
    private BigDecimal mntReserve;

    // Relations OneToMany - Non auditées pour éviter la récursivité
    @NotAudited
    @OneToMany(mappedBy = "operationsDelegueesMvt", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference("mvt-benefs")
    private List<BeneficiairesMvt> beneficiairesMvtListe = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    @JoinColumn(name = "REFERENCE_RES", insertable = false, updatable = false)
    private Reservation reservation;


    @NotAudited
    @OneToMany(mappedBy = "operationsDelegueesMvt", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference("mvt-docs")
    private List<Document> documents = new ArrayList<>();

    @NotAudited
    @OneToOne(mappedBy = "operationsDelegueesMvt", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference("mvt-marche")
    private AvaMarcheMvt avaMarcheMvt;

}