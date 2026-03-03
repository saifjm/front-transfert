package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Informations sur le mouvement FV à effectuer.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MouvementFVDTO {

    /**
     * Code devise (ex: 788 pour TND)
     */
    @NotNull(message = "La devise est obligatoire")
    private Integer devise;

    /**
     * Montant en devises
     */
    @NotNull(message = "Le montant en devises est obligatoire")
    @Positive(message = "Le montant en devises doit être positif")
    private BigDecimal montantDvs;

    /**
     * Informations du bénéficiaire
     */
    @Valid
    @NotNull(message = "Le bénéficiaire est obligatoire")
    private BeneficiaireFVDTO beneficiaire;

    /**
     * Mode de paiement (BB, CH, TC, VR)
     */
    @NotNull(message = "Le mode de paiement est obligatoire")
    private String mode;

    /**
     * Code pays de destination
     */
    @NotNull(message = "Le pays est obligatoire")
    private Integer pays;

    /**
     * Type d'opération (FV pour Frais de Voyage)
     */
    private String type;

    /**
     * Montant du mouvement (en TND)
     */
    @NotNull(message = "Le montant est obligatoire")
    @Positive(message = "Le montant doit être positif")
    private BigDecimal montant;

    /**
     * Date de départ du voyage (format dd/MM/yyyy)
     */
    @JsonFormat(pattern = "dd/MM/yyyy")
    @NotNull(message = "La date de départ est obligatoire")
    private LocalDate dateDepart;

    /**
     * Date de retour du voyage (format dd/MM/yyyy)
     */
    @JsonFormat(pattern = "dd/MM/yyyy")
    @NotNull(message = "La date de retour est obligatoire")
    private LocalDate dateRetour;
}
