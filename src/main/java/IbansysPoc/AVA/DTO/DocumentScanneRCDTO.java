package IbansysPoc.AVA.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Document scanné pour une opération Rétrocession.
 * Optionnel pour RAV, obligatoire pour RRV (déclaration de douane).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentScanneRCDTO {

    /** Numéro de ligne du document (doit être > 0) */
    @Positive(message = "Le numéro de ligne doit être positif")
    private Integer ligne;

    /** Nom de l'image/fichier scanné */
    @NotBlank(message = "Le nom de l'image est obligatoire")
    private String nomImage;

    /** Chemin du fichier sur le serveur (optionnel) */
    private String cheminFichier;

    /** Type de document */
    @NotNull(message = "Le type de document est obligatoire")
    private Integer typeDocument;
}

