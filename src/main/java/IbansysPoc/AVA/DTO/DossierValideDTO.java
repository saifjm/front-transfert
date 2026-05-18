package IbansysPoc.AVA.DTO;

/**
 * DTO pour les dossiers valides avec nom du client.
 */
public class DossierValideDTO {
    private Short codeAgence;
    private Short typeDossierAva;
    private Integer numDossier;
    private java.time.LocalDate dateDossier;
    private String noPieceClient;
    private String nomClient;

    // Getters and Setters
    public Short getCodeAgence() {
        return codeAgence;
    }

    public void setCodeAgence(Short codeAgence) {
        this.codeAgence = codeAgence;
    }

    public Short getTypeDossierAva() {
        return typeDossierAva;
    }

    public void setTypeDossierAva(Short typeDossierAva) {
        this.typeDossierAva = typeDossierAva;
    }

    public Integer getNumDossier() {
        return numDossier;
    }

    public void setNumDossier(Integer numDossier) {
        this.numDossier = numDossier;
    }

    public java.time.LocalDate getDateDossier() {
        return dateDossier;
    }

    public void setDateDossier(java.time.LocalDate dateDossier) {
        this.dateDossier = dateDossier;
    }

    public String getNoPieceClient() {
        return noPieceClient;
    }

    public void setNoPieceClient(String noPieceClient) {
        this.noPieceClient = noPieceClient;
    }

    public String getNomClient() {
        return nomClient;
    }

    public void setNomClient(String nomClient) {
        this.nomClient = nomClient;
    }
}
