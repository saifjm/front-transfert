package IbansysPoc.AVA.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * DTO pour le compte RIB (Relevé d'Identité Bancaire).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompteRibFVDTO {

    /**
     * Code banque (2 chiffres)
     */
    @Size(min = 2, max = 2, message = "Le code banque doit contenir exactement 2 chiffres")
    @Pattern(regexp = "\\d{2}", message = "Le code banque doit être numérique")
    private String codeBanque;

    /**
     * Code agence BCT (3 chiffres)
     */
    @Size(min = 3, max = 3, message = "Le code agence BCT doit contenir exactement 3 chiffres")
    @Pattern(regexp = "\\d{3}", message = "Le code agence BCT doit être numérique")
    private String codeAgenceBct;

    /**
     * Racine du compte (13 chiffres)
     */
    @Size(min = 13, max = 13, message = "La racine du compte doit contenir exactement 13 chiffres")
    @Pattern(regexp = "\\d{13}", message = "La racine du compte doit être numérique")
    private String racineCompte;

    /**
     * Clé RIB (2 chiffres)
     */
    @Size(min = 2, max = 2, message = "La clé RIB doit contenir exactement 2 chiffres")
    @Pattern(regexp = "\\d{2}", message = "La clé RIB doit être numérique")
    private String cleRib;

    /**
     * Retourne le RIB complet (20 chiffres).
     */
    public String getRibComplet() {
        if (codeBanque == null || codeAgenceBct == null || racineCompte == null || cleRib == null) {
            return null;
        }
        return codeBanque + codeAgenceBct + racineCompte + cleRib;
    }
}

