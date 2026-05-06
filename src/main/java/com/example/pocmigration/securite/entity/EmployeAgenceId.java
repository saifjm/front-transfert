package com.example.pocmigration.securite.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class EmployeAgenceId implements Serializable {

    @Column(name = "MAT_EMP")
    private Long matEmp;

    @Column(name = "CODE_AGENCE")
    private Short codeAgence;

    public EmployeAgenceId() {
    }

    public EmployeAgenceId(Long matEmp, Short codeAgence) {
        this.matEmp = matEmp;
        this.codeAgence = codeAgence;
    }

    public Long getMatEmp() {
        return matEmp;
    }

    public void setMatEmp(Long matEmp) {
        this.matEmp = matEmp;
    }

    public Short getCodeAgence() {
        return codeAgence;
    }

    public void setCodeAgence(Short codeAgence) {
        this.codeAgence = codeAgence;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EmployeAgenceId)) return false;
        EmployeAgenceId that = (EmployeAgenceId) o;
        return Objects.equals(matEmp, that.matEmp) &&
                Objects.equals(codeAgence, that.codeAgence);
    }

    @Override
    public int hashCode() {
        return Objects.hash(matEmp, codeAgence);
    }
}