package IbansysPoc.AVA.DTO;


import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * DTO pour les opérations déléguées MVT liées aux opérations AVA (rapatriement)
 */
@Getter
@Setter
public class ExportateurDTO {

    // Clé primaire composite
    private Long refOperation;
    private LocalDate dateOperation;

    // Informations de l'opération
    private Integer codeOrigine;
    private Short codeProduitService;
    private Integer codeOperation;

    // Informations du dossier
    private Short codeTypeDosAva;
    private Integer numDossier;
    private LocalDate dateDossier;
    private Short codeAgenceAva;

    // Informations du client
    private Integer typePieceClient;
    private String noPieceClient;
    private String numeroCompte;
    private String tel;

    // Activité
    private Integer codeActivite;
    private Integer codeSousActivite;

    // Informations fiscales
    private String declarationFiscale;
    private LocalDate dateUltDeclCaf;

    // Banque
    private Short codeBanqueProvenance;

    // Montants
    private BigDecimal mntAvance;
    private BigDecimal mntUtilise;
    private BigDecimal mntAutorise;
    private BigDecimal mntAutoriseBct;
    private BigDecimal mntReserve;
    private BigDecimal mntBlocage;
    private BigDecimal solde;
    private BigDecimal mntCa;
    private BigDecimal mntCaFiscal;
    private Long mntImportation;

    // Informations BCT
    private Integer numeroBct;
    private LocalDate dateBct;
    private LocalDate echeance;

    // Informations de suivi
    private Short annee;
    private Integer numMvtAva;
    private String etatDossier;
    private LocalDate dateEtat;
    private String motifEtat;
    private String status;
    private LocalDate dateValidation;

    // Informations du mouvement AVA
    private LocalDate dateMvtAva;
    private BigDecimal mntMvtAva;
}