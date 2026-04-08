package IbansysPoc.AVA.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OperationExportateurAVADTO {

    private Long numId;
    private Integer codeBanqueProvenance;
    private Integer codeDevise;
    private Long numDosRap;
    private Integer codeOperation;
    private Integer codeTache;
    private String libTache;
    private LocalDate dateDosRap;
    private Integer codeProduitService;
    private Integer codeService;
    private String codeTypeMvtAva;
    private String typeDosRap;
    private LocalDate dateOperation;
    private LocalDate dateTraitement;
    private Integer flagTraitement;
    private BigDecimal mntMvtDvs;
    private BigDecimal mntMvtTnd;
    private BigDecimal coursAchat;
    private BigDecimal coursSpecial;
    private LocalDate dateJournee;
    private String numeroCompte;
    private Integer typePieceBenef;
    private String noPieceBenef;
    private Long numDossierAva;
    private BigDecimal mntRap;
    private String pdfBase64;
}
