package com.example.securiteservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class OperationId implements Serializable {

    @Column(name = "CODE_PRODUIT_SERVICE", nullable = false)
    private Integer codeProduitService;

    @Column(name = "CODE_OPERATION", nullable = false)
    private Integer codeOperation;

    public OperationId() {
    }

    public OperationId(Integer codeProduitService, Integer codeOperation) {
        this.codeProduitService = codeProduitService;
        this.codeOperation = codeOperation;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OperationId that = (OperationId) o;
        return Objects.equals(codeProduitService, that.codeProduitService) && Objects.equals(codeOperation, that.codeOperation);
    }

    @Override
    public int hashCode() {
        return Objects.hash(codeProduitService, codeOperation);
    }
}
