package IbansysPoc.AVA.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/**
 * DTO contenant les informations financières pour une opération FV.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MontantsFVDTO {

    /**
     * Solde disponible du dossier
     */
    @PositiveOrZero(message = "Le solde ne peut pas être négatif")
    private BigDecimal solde;

    /**
     * Montant de l'avance
     */
    @PositiveOrZero(message = "L'avance ne peut pas être négative")
    private BigDecimal avance;

    /**
     * Montant autorisé
     */
    @PositiveOrZero(message = "Le montant autorisé ne peut pas être négatif")
    private BigDecimal autorise;

    /**
     * Montant utilisé
     */
    @PositiveOrZero(message = "Le montant utilisé ne peut pas être négatif")
    private BigDecimal utilise;

    /**
     * Chiffre d'affaires fiscal HT
     */
    @PositiveOrZero(message = "Le CA fiscal HT ne peut pas être négatif")
    private BigDecimal caFiscalHT;

    /**
     * Code devise (référence externe)
     */
    @NotNull(message = "La devise est obligatoire")
    private Integer devise;
}

