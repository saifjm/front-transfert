package IbansysPoc.AVA.DTO;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class AvaMarcheMvtDTO {
    private String numMarche;
    private Short codeProduitService;
    private Integer codeOperation;
    private Integer refOperation;
    private LocalDate dateOperation;
    private Long montantMarche;
    private String refContrat;
    private LocalDate dateContrat;
    private String contractant;
    private Integer numDossier;
    private LocalDate dateDossier;
    private Short codeAgenceAva;
    private String status;
    private LocalDate dateFin;
    private Short codeDevise;
    private Long mntDevise;
}
