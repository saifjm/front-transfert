package IbansysPoc.AVA.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SuspensionDTO {
    @NotNull(message = "Le numéro de dossier est obligatoire")
    private Long numDossier;

    @NotNull(message = "Le code d'état est obligatoire")
    @Min(value = 1, message = "Le code d'état doit être entre 1 et 99")
    @Max(value = 99, message = "Le code d'état doit être entre 1 et 99")
    private Short codeEtat;

    // Motif obligatoire seulement si codeEtat = 99
    private String motifEtat;
}