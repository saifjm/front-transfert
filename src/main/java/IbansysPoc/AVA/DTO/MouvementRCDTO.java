package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Informations sur le mouvement Rétrocession.
 *
 * - RAV : Rétrocession AVA (annulation complète, montant auto-récupéré depuis le MVT original)
 * - RRV : Remboursement Rétrocession Voyage (partiel, montant fourni, déclaration obligatoire)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MouvementRCDTO {

    /** Type de mouvement : "RAV" ou "RRV" (obligatoire) */
    @NotBlank(message = "Le type de mouvement est obligatoire (RAV ou RRV)")
    private String typeMouvement;

    /** Référence de l'opération FV ORIGINALE à rétrograder (obligatoire) */
    @NotNull(message = "La référence de l'opération originale est obligatoire")
    private Long refOperation;

    /** Montant : NULL pour RAV (auto-récupéré), obligatoire pour RRV (doit être <= montant original) */
    private BigDecimal mntMvt;

    /** Numéro de déclaration (obligatoire uniquement pour RRV) */
    private String numeroDeclaration;

    /** Date de déclaration (obligatoire uniquement pour RRV, doit être >= date du MVT original) */
    @JsonFormat(pattern = "dd/MM/yyyy")
    private LocalDate dateDeclaration;
}

