package IbansysPoc.AVA.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * DTO pour les informations d'agence récupérées depuis l'API externe.
 */
@Getter
@Setter
public class AgenceDTO {
    private Integer codeBanque;
    private Integer codeAgenceBct;
    private Integer codeAgenceBna;
    private String libelleAgence;
    private String adresseAgence;
    private String numeroTel;
    private String email;
    private Integer codeZoneAgence;
}

