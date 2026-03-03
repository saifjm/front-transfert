package IbansysPoc.AVA.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * DTO principal pour les opérations Frais de Voyage (FV).
 * Version minimale : seules les informations essentielles sont envoyées.
 * Les autres données (solde, avance, RIB, etc.) sont récupérées depuis OPERATIONS_DELEGUEES.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OperationFVDTO {

    /**
     * Référence de l'opération existante (optionnel).
     * Si fourni avec finalize=true, valide ce MVT existant au lieu d'en créer un nouveau.
     */
    private Long refOperation;

    /**
     * Informations minimales sur le dossier (numeroDossier obligatoire)
     */
    @Valid
    @NotNull(message = "Les informations du dossier sont obligatoires")
    private DossierFVDTO dossier;

    /**
     * Informations sur le mouvement à effectuer (montant, bénéficiaire, pays, mode)
     */
    @Valid
    @NotNull(message = "Les informations du mouvement sont obligatoires")
    private MouvementFVDTO mouvement;

    /**
     * Documents scannés (optionnel)
     */
    @Valid
    private List<DocumentScanneFVDTO> documentsScannes;
}

