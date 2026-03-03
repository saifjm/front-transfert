package IbansysPoc.AVA.DTO;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BeneficiaireDTO {
    private Integer numDossier;
    private LocalDate dateDossier;
    private Boolean typePieceBenef;
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
