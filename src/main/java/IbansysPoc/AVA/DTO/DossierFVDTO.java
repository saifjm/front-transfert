package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * Informations minimales sur le dossier.
 * Les autres informations (agence, RIB, solde, etc.) seront récupérées depuis OPERATIONS_DELEGUEES.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DossierFVDTO {

    /**
     * Numéro du dossier AVA (obligatoire)
     */
    @NotNull(message = "Le numéro de dossier est obligatoire")
    private Integer numeroDossier;

    /**
     * Date du dossier (format dd/MM/yyyy)
     */
    @JsonFormat(pattern = "dd/MM/yyyy")
    private LocalDate dateDossier;

    /**
     * Type de dossier AVA (1, 2, 3...) - optionnel
     */
    private Integer typeDossier;
}
