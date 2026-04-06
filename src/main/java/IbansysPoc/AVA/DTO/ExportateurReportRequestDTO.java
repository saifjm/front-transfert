package IbansysPoc.AVA.DTO;

import java.util.List;

import lombok.Data;

@Data
public class ExportateurReportRequestDTO {
    private String intermediaireAgree;
    private String codeIntermediaire;
    private String agence;
    private String codeAgence;
    private String typeAllocation;
    private String anneeDeFonctionnementDu;
    private String anneeDeFonctionnementAu;
    private String chiffreAffairesHT;
    
    private String titulaireAllocation;
    private String nomOuDenomination;
    private String codeIdentification;
    private String adresse;
    private String numeroDateDemandeF2;

    private List<ExportateurReportRowDTO> lignes;
}
