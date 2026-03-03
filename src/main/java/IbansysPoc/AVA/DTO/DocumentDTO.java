package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class DocumentDTO {
    @JsonProperty(required = false)
    private Long numLigne;  // Alimenté automatiquement (1, 2, 3, ...)

    private Short codeProduitService;
    private Integer codeOperation;

    @JsonProperty(required = false)
    private Long refOperation;  // Alimenté automatiquement depuis OperationsDelegueesMvt

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateOperation;  // Alimenté automatiquement depuis OperationsDelegueesMvt

    private Long typeDocument;

    @JsonProperty(required = false)
    private Integer numDossier;  // Alimenté automatiquement depuis OperationsDelegueesMvt

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @JsonProperty(required = false)
    private LocalDate dateDossier;  // Alimenté automatiquement depuis OperationsDelegueesMvt

    private String referenceFichierJoint;
    private String extention;

    @JsonProperty(required = false)
    private String pathAnnee;  // Alimenté automatiquement - Année extraite de SYSDATE (ex: "2026")

    @JsonProperty(required = false)
    private String pathMois;  // Alimenté automatiquement - Mois extrait de SYSDATE (ex: "01", "02", ...)
}

