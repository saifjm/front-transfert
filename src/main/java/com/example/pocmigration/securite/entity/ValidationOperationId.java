package com.example.pocmigration.securite.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

@Embeddable
public class ValidationOperationId implements Serializable {

    @Column(name = "CODE_PRODUIT_SERVICE", nullable = false)
    private Integer codeProduitService;

    @Column(name = "CODE_OPERATION", nullable = false)
    private Integer codeOperation;

    @Column(name = "NUM_DOSSIER", nullable = false, length = 20)
    private String numDossier;

    @Column(name = "DATE_DOSSIER", nullable = false)
    private LocalDate dateDossier;

    public ValidationOperationId() {
    }

    public ValidationOperationId(Integer codeProduitService, Integer codeOperation, String numDossier, LocalDate dateDossier) {
        this.codeProduitService = codeProduitService;
        this.codeOperation = codeOperation;
        this.numDossier = numDossier;
        this.dateDossier = dateDossier;
    }

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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ValidationOperationId that = (ValidationOperationId) o;
        return Objects.equals(codeProduitService, that.codeProduitService)
                && Objects.equals(codeOperation, that.codeOperation)
                && Objects.equals(numDossier, that.numDossier)
                && Objects.equals(dateDossier, that.dateDossier);
    }

    @Override
    public int hashCode() {
        return Objects.hash(codeProduitService, codeOperation, numDossier, dateDossier);
    }
}

