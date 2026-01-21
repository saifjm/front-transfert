package com.example.securiteservice.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;

@Entity
@Table(name = "EMPLOYE_AGENCE")
@Immutable
public class EmployeAgence {

    @EmbeddedId
    private EmployeAgenceId id;

    @Lob
    @Column(name = "NUMERO_CAISSE")
    private String numeroCaisse;

    public EmployeAgenceId getId() {
        return id;
    }

    public void setId(EmployeAgenceId id) {
        this.id = id;
    }

    public String getNumeroCaisse() {
        return numeroCaisse;
    }

    public void setNumeroCaisse(String numeroCaisse) {
        this.numeroCaisse = numeroCaisse;
    }

    // accesseurs pratiques si tu veux garder getMatEmp() / getCodeAgence()

    public Long getMatEmp() {
        return id != null ? id.getMatEmp() : null;
    }

    public Short getCodeAgence() {
        return id != null ? id.getCodeAgence() : null;
    }
}
