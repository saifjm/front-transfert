package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.OperationRCDTO;
import IbansysPoc.AVA.service.OperationRCService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Contrôleur REST pour les opérations Rétrocession (RC).
 *
 * Endpoints disponibles :
 * - POST   /api/operations-rc?finalize={true|false}     : Créer une opération RC (RAV ou RRV)
 * - PUT    /api/operations-rc/validate/{refOperation}    : Valider un brouillon RC
 * - GET    /api/operations-rc/{refOperation}             : Récupérer une opération RC
 *
 * Sous-types :
 * - RAV : Rétrocession AVA (annulation complète d'un FV, montant auto-récupéré)
 * - RRV : Remboursement Rétrocession Voyage (remboursement partiel, déclaration obligatoire)
 */
@Tag(name = "Operation Rétrocession", description = "Endpoints pour la gestion des opérations Rétrocession (RC) — RAV et RRV")
@RestController
@RequestMapping("/api/operations-rc")
@RequiredArgsConstructor
@Slf4j
public class OperationRCController {

    private final OperationRCService operationRCService;

    /**
     * Crée une nouvelle opération Rétrocession (RAV ou RRV).
     *
     * Le paramètre 'finalize' détermine le comportement :
     * - finalize=false (défaut) : Crée un brouillon (status I) sans impact sur le dossier
     * - finalize=true : Crée et applique immédiatement au dossier (status I → V → A/E)
     *
     * @param dto      DTO contenant toutes les informations de l'opération RC
     * @param finalize Si true, applique immédiatement. Si false, crée un brouillon
     * @return Response 201 Created avec refOperation, numDossier et status
     *
     * Exemple RAV (annulation complète, montant auto-récupéré) :
     * POST /api/operations-rc?finalize=true
     * {
     *   "dossier": {
     *     "numeroDossier": 6110227,
     *     "dateDossier": "15/02/2026",
     *     "typeDossier": 1
     *   },
     *   "mouvements": {
     *     "typeMouvement": "RAV",
     *     "refOperation": 740908
     *   }
     * }
     *
     * Exemple RRV (remboursement partiel, déclaration obligatoire) :
     * POST /api/operations-rc?finalize=true
     * {
     *   "dossier": {
     *     "numeroDossier": 22360542,
     *     "dateDossier": "02/01/2026",
     *     "typeDossier": 3
     *   },
     *   "mouvements": {
     *     "typeMouvement": "RRV",
     *     "numeroDeclaration": 22150,
     *     "dateDeclaration": "30/01/2026",
     *     "refOperation": 740068,
     *     "mntMvt": 2000.000
     *   },
     *   "documentsScannes": [
     *     {
     *       "ligne": 1,
     *       "nomImage": "DOC_2026001_003.jpg",
     *       "cheminFichier": "/documents/2026/01/passport_scan.pdf",
     *       "typeDocument": 1
     *     }
     *   ]
     * }
     */
    @PostMapping
    public ResponseEntity<OperationCreationResponseDTO> create(
            @Valid @RequestBody OperationRCDTO dto,
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {

        log.info("[OperationRCController] POST /api/operations-rc - type={}, finalize={}",
                dto.getMouvements().getTypeMouvement(), finalize);
        log.debug("[OperationRCController] DTO reçu : {}", dto);

        OperationCreationResponseDTO response = operationRCService.create(dto, finalize);

        log.info("[OperationRCController] Opération RC créée : refOperation={}, status={}",
                response.getRefOperation(), response.getStatus());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Valide et applique un mouvement RC existant (brouillon) au dossier.
     *
     * Le mouvement doit être en status I (brouillon).
     * Après validation, le status sera A (appliqué) ou E (erreur).
     *
     * @param refOperation Référence du mouvement à valider
     * @return Response 200 OK avec status final (A ou E)
     *
     * Exemple :
     * PUT /api/operations-rc/validate/740910
     */
    @PutMapping("/validate/{refOperation}")
    public ResponseEntity<OperationCreationResponseDTO> validate(
            @PathVariable Long refOperation) {

        log.info("[OperationRCController] PUT /api/operations-rc/validate/{}", refOperation);

        OperationCreationResponseDTO response = operationRCService.validate(refOperation);

        log.info("[OperationRCController] Validation terminée : refOperation={}, status={}",
                refOperation, response.getStatus());

        return ResponseEntity.ok(response);
    }

    /**
     * Récupère une opération RC par sa référence.
     *
     * @param refOperation Référence du mouvement
     * @return Response 200 OK avec le DTO de l'opération RC
     *
     * Exemple :
     * GET /api/operations-rc/740910
     */
    @GetMapping("/{refOperation}")
    public ResponseEntity<OperationRCDTO> getByRefOperation(
            @PathVariable Long refOperation) {

        log.info("[OperationRCController] GET /api/operations-rc/{}", refOperation);

        OperationRCDTO dto = operationRCService.getByRefOperation(refOperation);

        log.debug("[OperationRCController] Opération RC récupérée : {}", dto);

        return ResponseEntity.ok(dto);
    }
}

