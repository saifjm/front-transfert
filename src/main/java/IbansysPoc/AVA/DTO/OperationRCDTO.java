package IbansysPoc.AVA.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO principal pour les opérations Rétrocession (RC).
 *
 * Deux sous-types :
 * - RAV : Rétrocession AVA (annulation complète d'un FV)
 * - RRV : Remboursement Rétrocession Voyage (remboursement partiel)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OperationRCDTO {

    /** Référence de l'opération RC existante (optionnel, pour finalize d'un brouillon) */
    private Long refOperationRC;

    /** Informations dossier (obligatoire) */
    @Valid
    @NotNull(message = "Les informations du dossier sont obligatoires")
    private DossierRCDTO dossier;

    /** Informations mouvement RC (obligatoire) */
    @Valid
    @NotNull(message = "Les informations du mouvement sont obligatoires")
    private MouvementRCDTO mouvements;

    /** Documents scannés (optionnel pour RAV, obligatoire pour RRV) */
    @Valid
    private List<DocumentScanneRCDTO> documentsScannes;
}

