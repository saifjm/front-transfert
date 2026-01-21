package com.example.securiteservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "OPERATION", schema = "SECURITE")
public class Operation {

    @EmbeddedId
    private OperationId id;

    @Column(name = "LIBELLE_OPERATION")
    private String libelleOperation;

    @Column(name = "ABREVIATION")
    private String abbreviation;

    @Column(name = "SOUS_MENU")
    private String sousMenu;

    @Column(name = "PARAMETRER")
    private String parametrer;

    @Column(name = "CODE_OPR_AGENCE")
    private Integer codeOprAgence;

    @Column(name = "VISA_O_N")
    private String visaON;

    @Column(name = "MAX_VALID_MEME_EMP", precision = 20, scale = 3)
    private BigDecimal maxValidMemeEmp;

    @Column(name = "DECHARGE_O_N")
    private String dechargeON;

    @Column(name = "INITIE_CONTRAT")
    private String initieContrat;

    @Column(name = "CLOTURE_CONTRAT")
    private String clotureContrat;

    @Column(name = "DOSSIER_NEW_O_N")
    private String dossierNewON;

    @Column(name = "CENTRE_IMPUTATION")
    private String centreImputation;

    @Column(name = "CENTRE_IMPUTATION_FIXE")
    private Integer centreImputationFixe;

    @Column(name = "TCE_RGL_O_N")
    private String tceRglON;

    @Column(name = "PARENT")
    private Long parent;

    @Column(name = "NOM_FORM")
    private String nomForm;

    @Column(name = "ORDREE")
    private Integer ordree;

    public OperationId getId() {
        return id;
    }

    public void setId(OperationId id) {
        this.id = id;
    }

    public String getLibelleOperation() {
        return libelleOperation;
    }

    public void setLibelleOperation(String libelleOperation) {
        this.libelleOperation = libelleOperation;
    }

    public String getAbbreviation() {
        return abbreviation;
    }

    public void setAbbreviation(String abbreviation) {
        this.abbreviation = abbreviation;
    }

    public String getSousMenu() {
        return sousMenu;
    }

    public void setSousMenu(String sousMenu) {
        this.sousMenu = sousMenu;
    }

    public String getParametrer() {
        return parametrer;
    }

    public void setParametrer(String parametrer) {
        this.parametrer = parametrer;
    }

    public Integer getCodeOprAgence() {
        return codeOprAgence;
    }

    public void setCodeOprAgence(Integer codeOprAgence) {
        this.codeOprAgence = codeOprAgence;
    }

    public String getVisaON() {
        return visaON;
    }

    public void setVisaON(String visaON) {
        this.visaON = visaON;
    }

    public BigDecimal getMaxValidMemeEmp() {
        return maxValidMemeEmp;
    }

    public void setMaxValidMemeEmp(BigDecimal maxValidMemeEmp) {
        this.maxValidMemeEmp = maxValidMemeEmp;
    }

    public String getDechargeON() {
        return dechargeON;
    }

    public void setDechargeON(String dechargeON) {
        this.dechargeON = dechargeON;
    }

    public String getInitieContrat() {
        return initieContrat;
    }

    public void setInitieContrat(String initieContrat) {
        this.initieContrat = initieContrat;
    }

    public String getClotureContrat() {
        return clotureContrat;
    }

    public void setClotureContrat(String clotureContrat) {
        this.clotureContrat = clotureContrat;
    }

    public String getDossierNewON() {
        return dossierNewON;
    }

    public void setDossierNewON(String dossierNewON) {
        this.dossierNewON = dossierNewON;
    }

    public String getCentreImputation() {
        return centreImputation;
    }

    public void setCentreImputation(String centreImputation) {
        this.centreImputation = centreImputation;
    }

    public Integer getCentreImputationFixe() {
        return centreImputationFixe;
    }

    public void setCentreImputationFixe(Integer centreImputationFixe) {
        this.centreImputationFixe = centreImputationFixe;
    }

    public String getTceRglON() {
        return tceRglON;
    }

    public void setTceRglON(String tceRglON) {
        this.tceRglON = tceRglON;
    }

    public Long getParent() {
        return parent;
    }

    public void setParent(Long parent) {
        this.parent = parent;
    }

    public String getNomForm() {
        return nomForm;
    }

    public void setNomForm(String nomForm) {
        this.nomForm = nomForm;
    }

    public Integer getOrdree() {
        return ordree;
    }

    public void setOrdree(Integer ordree) {
        this.ordree = ordree;
    }
}
