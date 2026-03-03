package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.OperationFVDTO;
import IbansysPoc.AVA.service.OperationFVService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Contrôleur REST pour les opérations Frais de Voyage (FV).
 *
 * Endpoints disponibles :
 * - POST   /api/operations-fv?finalize={true|false}  : Créer une opération FV
 * - PUT    /api/operations-fv/validate/{refOperation} : Valider un brouillon
 * - GET    /api/operations-fv/{refOperation}         : Récupérer une opération FV
 */
@Tag(name = "Operation Frais de Voyage", description = "Endpoints pour la gestion des opérations Frais de Voyage (FV)")
@RestController
@RequestMapping("/api/operations-fv")
@RequiredArgsConstructor
@Slf4j
public class OperationFVController {

    private final OperationFVService operationFVService;

    /**
     * Crée une nouvelle opération Frais de Voyage (FV).
     *
     * Le paramètre 'finalize' détermine le comportement :
     * - finalize=false (défaut) : Crée un brouillon (status I) sans impact sur le dossier
     * - finalize=true : Crée et applique immédiatement au dossier (status I → V → A/E)
     *
     * @param dto DTO contenant toutes les informations de l'opération FV
     * @param finalize Si true, applique immédiatement. Si false, crée un brouillon
     * @return Response 201 Created avec refOperation, numDossier et status
     *
     * Exemple de requête :
     * POST /api/operations-fv?finalize=true
     * {
     *   "dossier": {
     *     "numeroDossier": 123456,
     *     "dateDossier": "2026-03-03",
     *     "agence": 17,
     *     "compteRib": {
     *       "ribComplet": "12345678901234567890"
     *     }
     *   },
     *   "montants": {
     *     "solde": 50000.00,
     *     "avance": 10000.00,
     *     "devise": 788
     *   },
     *   "mouvement": {
     *     "montant": 5000.00,
     *     "mode": "BB",
     *     "pays": "FRA",
     *     "dateDepart": "2026-03-10",
     *     "dateRetour": "2026-03-20",
     *     "beneficiaire": {
     *       "typePiece": 1,
     *       "numeroPiece": "12345678"
     *     }
     *   }
     * }
     */
    @PostMapping
    public ResponseEntity<OperationCreationResponseDTO> create(
            @Valid @RequestBody OperationFVDTO dto,
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {

        log.info("[OperationFVController] POST /api/operations-fv - finalize={}", finalize);
        log.debug("[OperationFVController] DTO reçu : {}", dto);

        OperationCreationResponseDTO response = operationFVService.create(dto, finalize);

        log.info("[OperationFVController] Opération FV créée : refOperation={}, status={}",
                response.getRefOperation(), response.getStatus());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Valide et applique un mouvement FV existant (brouillon) au dossier.
     *
     * Le mouvement doit être en status I (brouillon).
     * Après validation, le status sera A (appliqué) ou E (erreur).
     *
     * @param refOperation Référence du mouvement à valider
     * @return Response 200 OK avec status final (A ou E)
     *
     * Exemple :
     * PUT /api/operations-fv/validate/12345
     */
    @PutMapping("/validate/{refOperation}")
    public ResponseEntity<OperationCreationResponseDTO> validate(
            @PathVariable Long refOperation) {

        log.info("[OperationFVController] PUT /api/operations-fv/validate/{}", refOperation);

        OperationCreationResponseDTO response = operationFVService.validate(refOperation);

        log.info("[OperationFVController] Validation terminée : refOperation={}, status={}",
                refOperation, response.getStatus());

        return ResponseEntity.ok(response);
    }

    /**
     * Récupère une opération FV par sa référence.
     *
     * @param refOperation Référence du mouvement
     * @return Response 200 OK avec le DTO complet de l'opération FV
     *
     * Exemple :
     * GET /api/operations-fv/12345
     */
    @GetMapping("/{refOperation}")
    public ResponseEntity<OperationFVDTO> getByRefOperation(
            @PathVariable Long refOperation) {

        log.info("[OperationFVController] GET /api/operations-fv/{}", refOperation);

        OperationFVDTO dto = operationFVService.getByRefOperation(refOperation);

        log.debug("[OperationFVController] Opération FV récupérée : {}", dto);

        return ResponseEntity.ok(dto);
    }
}
