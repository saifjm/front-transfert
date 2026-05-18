package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class OperationCreationResponseDTO {
    @JsonProperty("refOperation")
    private Long refOperation;

    @JsonProperty("numDossier")
    private Integer numDossier;

    /** Status final du MVT : I=initial, V=validé, A=appliqué, E=erreur application */
    @JsonProperty("status")
    private String status;

    /** Message informatif (alertes, erreur application, etc.) */
    @JsonProperty("message")
    private String message;

    public OperationCreationResponseDTO(Long refOperation, Integer numDossier) {
        this.refOperation = refOperation;
        this.numDossier = numDossier;
    }

    public OperationCreationResponseDTO(Long refOperation, Integer numDossier, String status, String message) {
        this.refOperation = refOperation;
        this.numDossier = numDossier;
        this.status = status;
        this.message = message;
    }
}

