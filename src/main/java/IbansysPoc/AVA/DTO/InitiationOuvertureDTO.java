package IbansysPoc.AVA.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@JsonPropertyOrder({
        "refOperation",
        "dateOperation",
        "codeProduitService",
        "codeOperation",
        "codeTypeDosAva",
        "numDossier",
        "dateDossier",
        "codeAgenceAva",
        "typePieceClient",
        "noPieceClient",
        "numeroCompte",
        "tel",
        "codeActivite",
        "codeSousActivite",
        "declarationFiscale",
        "dateUltDeclCaf",
        "mntReserve",
        "mntBlocage",
        "solde",
        "codeBanqueProvenance",
        "mntAvance",
        "mntUtilise",
        "mntAutorise",
        "mntAutoriseBct",
        "mntCa",
        "mntCaFiscal",
        "mntMvtAva",
        "mntImportation",
        "numeroBct",
        "dateBct",
        "echeance",
        "annee",
        "NumMvtAva",
        "etatDossier",
        "dateEtat",
        "motifEtat",
        "status",
        // relations
        "beneficiairesMvtListe",
        "documents",
        "avaMarcheMvt"
})
public class InitiationOuvertureDTO {
    // ==================== CHAMPS ALIMENTES AUTOMATIQUEMENT ====================
    @JsonProperty(required = false)
    private Long refOperation;  // Généré par séquence AVA_REF_OPR

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateOperation;  // SYSDATE

    private Short codeProduitService;
    private Integer codeOperation;
    private Short codeTypeDosAva;
    private Integer numDossier;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateDossier;  // SYSDATE

    private Short codeAgenceAva;
    private Integer typePieceClient;
    private String noPieceClient;
    @JsonProperty("numeroCompte")
    @JsonAlias({"compteClient", "compte", "accountNumber"})
    private String numeroCompte;
    private String tel;
    private Integer codeActivite;
    private Integer codeSousActivite;
    private String declarationFiscale;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateUltDeclCaf;

    private BigDecimal mntReserve;
    private BigDecimal mntBlocage;
    private BigDecimal solde;
    private Integer codeBanqueProvenance;
    private BigDecimal mntAvance;
    private BigDecimal mntUtilise;
    private BigDecimal mntAutorise;
    private BigDecimal mntAutoriseBct;
    private BigDecimal mntCa;
    private BigDecimal mntCaFiscal;
    private BigDecimal mntMvtAva;
    private Long mntImportation;
    private Integer numeroBct;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateBct;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate echeance;
    private LocalDate dateValidation;

    @JsonProperty(required = false)
    private Short annee;  // Année extraite de SYSDATE

    private Integer NumMvtAva;
    private String etatDossier;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateEtat;
    private String motifEtat;
    private String status;



    // Flag de confirmation pour les alertes
    private Boolean confirmationImportation = false;

    // Relations
    private List<BeneficiaireMvtDTO> beneficiairesMvtListe = new ArrayList<>();
    private List<DocumentDTO> documents = new ArrayList<>();
    private AvaMarcheMvtDTO avaMarcheMvt;

    // Nouveau champ imbriqué pour la banque de provenance (JSON attendu: "banqueProvenance": { ... })
    private BanqueProvenanceDTO banqueProvenance;

    // Getters / setters personnalisés pour garder compatibilité avec les champs plats existants
    public BanqueProvenanceDTO getBanqueProvenance() {
        if (banqueProvenance == null && (codeBanqueProvenance != null || mntAvance != null || mntUtilise != null || mntAutorise != null || mntAutoriseBct != null || solde != null)) {
            banqueProvenance = new BanqueProvenanceDTO(codeBanqueProvenance, mntAvance, mntUtilise, mntAutorise, mntAutoriseBct, solde,mntReserve,mntBlocage);
        }
        return banqueProvenance;
    }

    public void setBanqueProvenance(BanqueProvenanceDTO banqueProvenance) {
        this.banqueProvenance = banqueProvenance;
        if (banqueProvenance != null) {
            this.codeBanqueProvenance = banqueProvenance.getCodeBanqueProvenance();
            this.mntAvance = banqueProvenance.getMntAvance();
            this.mntUtilise = banqueProvenance.getMntUtilise();
            this.mntAutorise = banqueProvenance.getMntAutorise();
            this.mntAutoriseBct = banqueProvenance.getMntAutoriseBct();
            this.solde = banqueProvenance.getSolde();
        }
    }

}
