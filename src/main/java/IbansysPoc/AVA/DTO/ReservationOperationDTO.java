package IbansysPoc.AVA.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO pour les opérations de réservation.
 * Les données seront insérées dans la table OPERATIONS_DELEGUEES_MVT.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationOperationDTO {



    @JsonProperty(required = false)
    private Long refOperation;
    private String reference;
    private Integer numDossier;
    private BigDecimal mntMvtAva;
    private String origine;

}

