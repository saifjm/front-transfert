package com.example.pocmigration.securite.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ValidationOperationRequest {
    private Integer codeProduitService;
    private Integer codeOperation;
    private String numDossier;
    private LocalDate dateDossier;
    private Integer matEmp;
    private LocalDate dateValidation;
    private Integer codeDevise;
    private BigDecimal montant;
    private Long refOperation;
    private LocalDate dateOperation;

    public Integer getCodeProduitService() {
        return codeProduitService;
    }

    public void setCodeProduitService(Integer codeProduitService) {
        this.codeProduitService = codeProduitService;
    }

    public Integer getCodeOperation() {
        return codeOperation;
    }

    public void setCodeOperation(Integer codeOperation) {
        this.codeOperation = codeOperation;
    }

    public String getNumDossier() {
        return numDossier;
    }

    public void setNumDossier(String numDossier) {
        this.numDossier = numDossier;
    }

    public LocalDate getDateDossier() {
        return dateDossier;
    }

    public void setDateDossier(LocalDate dateDossier) {
        this.dateDossier = dateDossier;
    }

    public Integer getMatEmp() {
        return matEmp;
    }

    public void setMatEmp(Integer matEmp) {
        this.matEmp = matEmp;
    }

    public LocalDate getDateValidation() {
        return dateValidation;
    }

    public void setDateValidation(LocalDate dateValidation) {
        this.dateValidation = dateValidation;
    }

    public Integer getCodeDevise() {
        return codeDevise;
    }

    public void setCodeDevise(Integer codeDevise) {
        this.codeDevise = codeDevise;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public void setMontant(BigDecimal montant) {
        this.montant = montant;
    }

    public Long getRefOperation() {
        return refOperation;
    }

    public void setRefOperation(Long refOperation) {
        this.refOperation = refOperation;
    }

    public LocalDate getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(LocalDate dateOperation) {
        this.dateOperation = dateOperation;
    }
}

