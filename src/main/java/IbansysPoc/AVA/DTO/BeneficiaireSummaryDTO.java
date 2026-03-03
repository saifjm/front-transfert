package IbansysPoc.AVA.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour le résumé d'un bénéficiaire.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BeneficiaireSummaryDTO {
    private String adresseBenef;
    private String noPieceBenef;
    private String nomBenef;
    private String qualite;
    private Integer typePieceBenef; // Integer code as requested
}
