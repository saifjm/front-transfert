package IbansysPoc.AVA.entity;


import com.fasterxml.jackson.annotation.JsonIgnore;
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
@Table(name = "OPERATIONS_DELEGUEES")
public class OperationsDeleguee {
    @Id
    @Column(name = "NUM_DOSSIER")
    private Integer numDossier;

    @Column(name = "CODE_TYPE_DOS_AVA")
    private Short codeTypeDosAva;

    @Column(name = "DATE_DOSSIER")
    private LocalDate dateDossier;

    @Column(name = "CODE_AGENCE_AVA")
    private Short codeAgenceAva;

    @Column(name = "TYPE_PIECE_CLIENT")
    private Short typePieceClient;

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

    @Column(name = "MNT_UTILISE", precision = 23, scale = 3)
    private BigDecimal mntUtilise;

    @Column(name = "MNT_AUTORISATION_BCT", precision = 23, scale = 3)
    private BigDecimal mntAutoriseBct;

    @Column(name = "MNT_BLOCAGE", precision = 23, scale = 3)
    private BigDecimal mntBlocage;

    @Column(name = "MNT_RESERVE", precision = 19, scale = 3)
    private BigDecimal mntReserve;

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

    @Column(name = "DERNIER_NUM_MVT_AVA")
    private Integer dernierNumMvtAva;

    @Column(name = "ETAT_DOSSIER", length = 1)
    private String etatDossier;

    @Column(name = "CODE_ETAT")
    private Short codeEtat;

    @Column(name = "DATE_ETAT")
    private LocalDate dateEtat;

    @Column(name = "MOTIF_ETAT", length = 100)
    private String motifEtat;


    // Relations with other entities - Non auditées pour éviter la récursivité

    @NotAudited
    @OneToMany(mappedBy = "operationsDeleguee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Beneficiaire> beneficiaires = new ArrayList<>();

    @NotAudited
    @OneToMany(mappedBy = "operationsDeleguee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Document> documents = new ArrayList<>();

    @NotAudited
    @OneToOne(mappedBy = "operationsDeleguee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private AvaMarche avaMarche;


}