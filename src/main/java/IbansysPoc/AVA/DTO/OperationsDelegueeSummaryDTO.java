package IbansysPoc.AVA.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO pour le résumé d'une opération déléguée.
 */
public class OperationsDelegueeSummaryDTO {
    private Short codeTypeDosAva;
    private Integer numDossier;
    private LocalDate dateDossier;
    private Short codeAgenceAva;
    private Short typePieceClient;
    private String noPieceClient;
    private BigDecimal mntAvance;
    private BigDecimal mntUtilise;
    private BigDecimal mntAutorise;
    private BigDecimal solde;
    private LocalDate echeance;
    private BigDecimal mntAutorisationBct;
    private BigDecimal mntReserve;
    private BigDecimal mntBlocage;
    private java.util.List<BeneficiaireSummaryDTO> beneficiaires;

    // Getters and Setters
    public java.util.List<BeneficiaireSummaryDTO> getBeneficiaires() {
        return beneficiaires;
    }

    public void setBeneficiaires(java.util.List<BeneficiaireSummaryDTO> beneficiaires) {
        this.beneficiaires = beneficiaires;
    }

    public Short getCodeTypeDosAva() {
        return codeTypeDosAva;
    }

    public void setCodeTypeDosAva(Short codeTypeDosAva) {
        this.codeTypeDosAva = codeTypeDosAva;
    }

    public Integer getNumDossier() {
        return numDossier;
    }

    public void setNumDossier(Integer numDossier) {
        this.numDossier = numDossier;
    }

    public LocalDate getDateDossier() {
        return dateDossier;
    }

    public void setDateDossier(LocalDate dateDossier) {
        this.dateDossier = dateDossier;
    }

    public Short getCodeAgenceAva() {
        return codeAgenceAva;
    }

    public void setCodeAgenceAva(Short codeAgenceAva) {
        this.codeAgenceAva = codeAgenceAva;
    }

    public Short getTypePieceClient() {
        return typePieceClient;
    }

    public void setTypePieceClient(Short typePieceClient) {
        this.typePieceClient = typePieceClient;
    }

    public String getNoPieceClient() {
        return noPieceClient;
    }

    public void setNoPieceClient(String noPieceClient) {
        this.noPieceClient = noPieceClient;
    }

    public BigDecimal getMntAvance() {
        return mntAvance;
    }

    public void setMntAvance(BigDecimal mntAvance) {
        this.mntAvance = mntAvance;
    }

    public BigDecimal getMntUtilise() {
        return mntUtilise;
    }

    public void setMntUtilise(BigDecimal mntUtilise) {
        this.mntUtilise = mntUtilise;
    }

    public BigDecimal getMntAutorise() {
        return mntAutorise;
    }

    public void setMntAutorise(BigDecimal mntAutorise) {
        this.mntAutorise = mntAutorise;
    }

    public BigDecimal getSolde() {
        return solde;
    }

    public void setSolde(BigDecimal solde) {
        this.solde = solde;
    }

    public LocalDate getEcheance() {
        return echeance;
    }

    public void setEcheance(LocalDate echeance) {
        this.echeance = echeance;
    }

    public BigDecimal getMntAutorisationBct() {
        return mntAutorisationBct;
    }

    public void setMntAutorisationBct(BigDecimal mntAutorisationBct) {
        this.mntAutorisationBct = mntAutorisationBct;
    }

    public BigDecimal getMntReserve() {
        return mntReserve;
    }

    public void setMntReserve(BigDecimal mntReserve) {
        this.mntReserve = mntReserve;
    }

    public BigDecimal getMntBlocage() {
        return mntBlocage;
    }

    public void setMntBlocage(BigDecimal mntBlocage) {
        this.mntBlocage = mntBlocage;
    }
}
