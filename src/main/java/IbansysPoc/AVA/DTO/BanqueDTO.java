package IbansysPoc.AVA.DTO;

/**
 * DTO pour les informations d'une banque récupérées depuis l'API externe (microservice REF).
 */
public class BanqueDTO {
    private Short codeBanque;
    private String libBanque;
    private String sigleBanque;

    // Getters and Setters
    public Short getCodeBanque() {
        return codeBanque;
    }

    public void setCodeBanque(Short codeBanque) {
        this.codeBanque = codeBanque;
    }

    public String getLibBanque() {
        return libBanque;
    }

    public void setLibBanque(String libBanque) {
        this.libBanque = libBanque;
    }

    public String getSigleBanque() {
        return sigleBanque;
    }

    public void setSigleBanque(String sigleBanque) {
        this.sigleBanque = sigleBanque;
    }
}
