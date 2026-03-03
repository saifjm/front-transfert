package IbansysPoc.AVA.DTO;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class AvaMarcheDTO {
    private Integer numDossier;
    private String numMarche;
    private Long montantMarche;
    private String refContrat;
    private LocalDate dateContrat;
    private String contractant;
    private LocalDate dateDossier;
    private Short codeAgenceAva;
    private String status;
    private LocalDate dateFin;
    private Short codeDevise;
    private Long mntDevise;
}
