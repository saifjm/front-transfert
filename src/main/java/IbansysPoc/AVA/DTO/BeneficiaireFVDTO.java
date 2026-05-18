package IbansysPoc.AVA.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Informations du bénéficiaire (format minimal avec 'code' et 'numero').
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BeneficiaireFVDTO {

    /**
     * Code du bénéficiaire (type de pièce : 1=CIN, 2=Passeport, etc.)
     */
    @NotNull(message = "Le code du bénéficiaire est obligatoire")
    private Integer code;

    /**
     * Numéro de pièce du bénéficiaire
     */
    @NotBlank(message = "Le numéro de pièce du bénéficiaire est obligatoire")
    private String numero;

    /**
     * Nom et prénom du bénéficiaire (optionnel, sera enrichi depuis la base)
     */
    private String nomPrenom;
}
