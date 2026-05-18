package com.example.pocmigration.securite.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "VALIDATION_OPERATION", schema = "SECURITE")
public class ValidationOperation {

    @EmbeddedId
    private ValidationOperationId id;

    @Column(name = "MAT_EMP", nullable = false)
    private Integer matEmp;

    @Column(name = "DATE_VALIDATION", nullable = false)
    private LocalDate dateValidation;

    @Column(name = "CODE_DEVISE")
    private Integer codeDevise;

    @Column(name = "MONTANT", precision = 15, scale = 3)
    private BigDecimal montant;

    @Column(name = "REF_OPERATION")
    private Long refOperation;

    @Column(name = "DATE_OPERATION")
    private LocalDate dateOperation;

    public ValidationOperationId getId() {
        return id;
    }

    public void setId(ValidationOperationId id) {
        this.id = id;
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

