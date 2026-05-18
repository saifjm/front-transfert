package IbansysPoc.AVA.DTO;

/**
 * DTO pour les informations d'une personne récupérées depuis l'API externe.
 */
public class PersonneDTO {
    private String nom;
    private String prenom;
    private String adrRes1;
    private String adrRes2;
    private String adrRes3;

    // Getters and Setters
    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getAdrRes1() {
        return adrRes1;
    }

    public void setAdrRes1(String adrRes1) {
        this.adrRes1 = adrRes1;
    }

    public String getAdrRes2() {
        return adrRes2;
    }

    public void setAdrRes2(String adrRes2) {
        this.adrRes2 = adrRes2;
    }

    public String getAdrRes3() {
        return adrRes3;
    }

    public void setAdrRes3(String adrRes3) {
        this.adrRes3 = adrRes3;
    }
}
