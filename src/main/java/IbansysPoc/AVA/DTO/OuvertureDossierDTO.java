package IbansysPoc.AVA.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@JsonPropertyOrder({
        "numDossier",
        "typeDossierAva",
        "dateDossier",
        "codeAgence",
        "typePieceClient",
        "noPieceClient",
        "numeroCompte",
        "tel",
        "codeActivite",
        "codeSousActivite",
        "declarationFiscale",
        "dateUltDeclCaf",
        "codeBanqueProvenance",
        "mntAvance",
        "mntUtilise",
        "mntAutorise",
        "mntAutoriseBct",
        "mntReserve",
        "mntBlocage",
        "solde",
        "mntCa",
        "mntCaFiscal",
        "mntImportation",
        "numeroBct",
        "dateBct",
        "echeance",
        "annee",
        "dernierNumMvtAva",
        "etatDossier",
        "codeEtat",
        "dateEtat",
        "motifEtat",
        // relations
        "beneficiaires",
        "documents",
        "avaMarche"
})
public class OuvertureDossierDTO {
    // Clé primaire
    @JsonProperty("numDossier")
    private Integer numDossier;

    // Informations dossier
    @JsonProperty("typeDossierAva")
    private Short codeTypeDosAva;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty("dateDossier")
    private LocalDate dateDossier;
    @JsonProperty("codeAgence")
    private Short codeAgenceAva;

    // Informations client
    private Integer typePieceClient;
    private String noPieceClient;

    // Informations bancaires
    private String numeroCompte;
    private String tel;

    // Activité
    private Integer codeActivite;
    private Integer codeSousActivite;
    private String declarationFiscale;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateUltDeclCaf;

    // Montants rapatriés (ajoutés pour correspondre à InitiationOuvertureDTO)
    private Integer codeBanqueProvenance;

    // Montants financiers
    private BigDecimal mntAvance;
    private BigDecimal mntUtilise;
    private BigDecimal mntAutorise;
    private BigDecimal mntAutoriseBct;
    private BigDecimal mntReserve;
    private BigDecimal mntBlocage;
    private BigDecimal solde;
    private BigDecimal mntCa;
    private BigDecimal mntCaFiscal;
    private Long mntImportation;

    // Autorisation BCT (ajoutés pour correspondre à InitiationOuvertureDTO)
    private Integer numeroBct;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateBct;

    // Autres informations
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate echeance;
    private Short annee;
    private Integer dernierNumMvtAva;

    // État
    private String etatDossier;
    private Short codeEtat;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateEtat;
    private String motifEtat;

    // Flag de confirmation pour les alertes (INPUT seulement) — ne pas renvoyer dans la réponse
    @JsonIgnore
    private Boolean confirmationImportation = false;

    // Relations - ordre volontaire : beneficiaires -> documents -> avaMarche
    private List<BeneficiaireDTO> beneficiaires = new ArrayList<>();
    private List<DocumentDTO> documents = new ArrayList<>();

    private AvaMarcheDTO avaMarche;
}
