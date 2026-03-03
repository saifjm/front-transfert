package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BeneficiaireMvtDTO {
    private Short codeProduitService;
    private Integer codeOperation;

    @JsonProperty(required = false)
    private Long refOperation;  // Alimenté automatiquement depuis OperationsDelegueesMvt

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateOperation;  // Alimenté automatiquement depuis OperationsDelegueesMvt

    private Integer numDossier;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateDossier;  // SYSDATE - Alimenté automatiquement

    private Boolean typePieceBenef;
    private String noPieceBenef;

    @JsonProperty(required = false)
    private Short codeTypeDos;  // Alimenté automatiquement depuis OperationsDelegueesMvt.codeTypeDosAva

    @JsonProperty(required = false)
    private Short codeAgenceAva;  // Alimenté automatiquement depuis OperationsDelegueesMvt.codeAgenceAva

    private String nomBenef;
    private String adresseBenef;
    private String qualite;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate datePiece;

    private String etat;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateCreation;  // SYSDATE - Alimenté automatiquement

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateSuppression;
}
