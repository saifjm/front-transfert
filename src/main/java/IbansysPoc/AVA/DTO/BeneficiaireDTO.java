package IbansysPoc.AVA.DTO;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BeneficiaireDTO {
    private Integer numDossier;
    private LocalDate dateDossier;
    private Integer typePieceBenef;
    private String noPieceBenef;
    private Short codeTypeDos;
    private Long codeAgenceAva;
    private String nomBenef;
    private String adresseBenef;
    private String qualite;
    private LocalDate datePiece;
    private String etat;
    private LocalDate dateCreation;
    private LocalDate dateSuppression;
}
