package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Informations minimales sur le dossier pour une opération Rétrocession.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DossierRCDTO {

    @NotNull(message = "Le numéro de dossier est obligatoire")
    private Integer numeroDossier;

    @JsonFormat(pattern = "dd/MM/yyyy")
    @NotNull(message = "La date du dossier est obligatoire")
    private LocalDate dateDossier;

    @NotNull(message = "Le type de dossier est obligatoire")
    private Integer typeDossier;

    /** Code agence AVA (optionnel, utilisé pour le contrôle de doublon RAV) */
    private Short codeAgenceAva;
}

