package IbansysPoc.AVA.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Informations sur un document scanné (format minimal).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentScanneFVDTO {

    /**
     * Numéro de ligne du document
     */
    private Integer ligne;

    /**
     * Nom de l'image/fichier scanné
     */
    @NotBlank(message = "Le nom de l'image est obligatoire")
    private String nomImage;

    /**
     * Chemin du fichier sur le serveur
     */
    @NotBlank(message = "Le chemin du fichier est obligatoire")
    private String cheminFichier;

    /**
     * Type de document
     */
    @NotNull(message = "Le type de document est obligatoire")
    private Integer typeDocument;
}
