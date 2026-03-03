package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO pour les déclarations de Chiffre d'Affaires Fiscal HT.
 * Utilisé pour la communication avec le microservice GEN.
 */
@Getter
@Setter
@NoArgsConstructor
public class DeclarationCAFHTDTO {

    private Integer numDossier;

    private Integer typePieceClient;

    private String noPieceClient;

    private Short annee;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateDeclaration;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate datePresentation;

    private BigDecimal mntCaFiscal;

    private String etat;

    // Constructeur complet
    public DeclarationCAFHTDTO(Integer numDossier, Integer typePieceClient, String noPieceClient,
                                Short annee, LocalDate dateDeclaration, LocalDate datePresentation,
                                BigDecimal mntCaFiscal, String etat) {
        this.numDossier = numDossier;
        this.typePieceClient = typePieceClient;
        this.noPieceClient = noPieceClient;
        this.annee = annee;
        this.dateDeclaration = dateDeclaration;
        this.datePresentation = datePresentation;
        this.mntCaFiscal = mntCaFiscal;
        this.etat = etat;
    }
}

