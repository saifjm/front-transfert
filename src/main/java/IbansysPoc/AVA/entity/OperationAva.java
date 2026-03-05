package IbansysPoc.AVA.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.envers.Audited;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Audited
@Table(name = "OPERATION_AVA")
public class OperationAva {

    @Id
    @Column(name = "NUM_ID")
    private Long numId;

    @Column(name = "CODE_BANQUE_PROVENANCE")
    private Integer codeBanqueProvenance;

    @Column(name = "CODE_DEVISE")
    private Integer codeDevise;

    @Column(name = "NUM_DOS_RAP")
    private Long numDosRap;

    @Column(name = "CODE_OPERATION")
    private Integer codeOperation;

    @Column(name = "CODE_TACHE")
    private Integer codeTache;

    @Column(name = "LIB_TACHE", length = 200)
    private String libTache;

    @Column(name = "DATE_DOS_RAP")
    private LocalDate dateDosRap;

    @Column(name = "CODE_PRODUIT_SERVICE")
    private Integer codeProduitService;

    @Column(name = "CODE_SERVICE")
    private Integer codeService;

    @Column(name = "CODE_TYPE_MVT_AVA", length = 3)
    private String codeTypeMvtAva;

    @Column(name = "TYPE_DOS_RAP", length = 3)
    private String typeDosRap;

    @Column(name = "DATE_OPERATION")
    private LocalDate dateOperation;

    @Column(name = "DATE_TRAITEMENT")
    private LocalDate dateTraitement;

    @Column(name = "FLAG_TRAITEMENT")
    private Integer flagTraitement;

    @Column(name = "MNT_MVT_DVS")
    private BigDecimal mntMvtDvs;

    @Column(name = "MNT_MVT_TND")
    private BigDecimal mntMvtTnd;

    @Column(name = "COURS_ACHAT", precision = 10, scale = 6)
    private BigDecimal coursAchat;

    @Column(name = "COURS_SPECIAL", precision = 10, scale = 6)
    private BigDecimal coursSpecial;

    @Column(name = "DATE_JOURNEE")
    private LocalDate dateJournee;

    @Column(name = "NO_COMPTE", length = 13)
    private String noCompte;

    @Column(name = "TYPE_PIECE_BENEF")
    private Integer typePieceBenef;

    @Column(name = "NO_PIECE_BENEF", length = 13)
    private String noPieceBenef;

    @Column(name = "NUM_DOSSIER_AVA")
    private Long numDossierAva;

    @Column(name = "REF_OPERATION")
    private Long refOperation;

    @Column(name = "SENS", length = 1)
    private String sens;

    @Column(name = "DATE_INSERTION")
    private LocalDateTime dateInsertion;

}