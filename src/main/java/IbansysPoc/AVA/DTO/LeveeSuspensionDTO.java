package IbansysPoc.AVA.DTO;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LeveeSuspensionDTO {
   @NotNull(message = "Le numéro de dossier est obligatoire")
    private Long numDossier;
    
    @NotNull(message = "Le motif d'état est obligatoire")
    private String motifEtat;
    
    // Champs conditionnels - requis seulement si codeEtat avant levée était 1 (DEPASSEMENT DU MONTANT AUTORISE)
    private String numBct;
    private LocalDate dateBct;
}