package com.example.securiteservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "PRODUIT_SERVICE", schema = "SECURITE")
public class ProduitService {

    @Id
    @Column(name = "CODE_PRODUIT_SERVICE", nullable = false)
    private Integer codeProduitService;

    @Column(name = "LIBELLE_PRODUIT_SERVICE")
    private String libelleProduitService;

    @Column(name = "PRODUIT_SERVICE")
    private String produitService;

    @Column(name = "TYPE_DOSSIER")
    private String typeDossier;

    @Column(name = "USER_SCHEMA")
    private String userSchema;

    @Column(name = "PASSWORD_SCHEMA")
    private String passwordSchema;

    @Column(name = "REPORT_SERVER")
    private String reportServer;

    @Column(name = "GROUP_PRODUIT")
    private String groupProduit;

    @Column(name = "LIB_GROUP")
    private String libGroup;

    @Column(name = "ORDRE_MENU")
    private Integer ordreMenu;

    public Integer getCodeProduitService() {
        return codeProduitService;
    }

    public void setCodeProduitService(Integer codeProduitService) {
        this.codeProduitService = codeProduitService;
    }

    public String getLibelleProduitService() {
        return libelleProduitService;
    }

    public void setLibelleProduitService(String libelleProduitService) {
        this.libelleProduitService = libelleProduitService;
    }

    public String getProduitService() {
        return produitService;
    }

    public void setProduitService(String produitService) {
        this.produitService = produitService;
    }

    public String getTypeDossier() {
        return typeDossier;
    }

    public void setTypeDossier(String typeDossier) {
        this.typeDossier = typeDossier;
    }

    public String getUserSchema() {
        return userSchema;
    }

    public void setUserSchema(String userSchema) {
        this.userSchema = userSchema;
    }

    public String getPasswordSchema() {
        return passwordSchema;
    }

    public void setPasswordSchema(String passwordSchema) {
        this.passwordSchema = passwordSchema;
    }

    public String getReportServer() {
        return reportServer;
    }

    public void setReportServer(String reportServer) {
        this.reportServer = reportServer;
    }

    public String getGroupProduit() {
        return groupProduit;
    }

    public void setGroupProduit(String groupProduit) {
        this.groupProduit = groupProduit;
    }

    public String getLibGroup() {
        return libGroup;
    }

    public void setLibGroup(String libGroup) {
        this.libGroup = libGroup;
    }

    public Integer getOrdreMenu() {
        return ordreMenu;
    }

    public void setOrdreMenu(Integer ordreMenu) {
        this.ordreMenu = ordreMenu;
    }
}
