package IbansysPoc.AVA.DTO;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * DTO pour la reponse de l'API declarations-fiscales.
 */
@Getter
@Setter
public class DeclarationFiscaleDTO {
    private String etat;           // 'V' = Valide, autre = non valide
    private BigDecimal mntCaFiscal; // Montant chiffre d'affaire fiscal
    private Integer annee;          // Annee de la declaration
}

