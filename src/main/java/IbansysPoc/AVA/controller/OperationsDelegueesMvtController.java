package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.InitiationOuvertureDTO;
import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.service.OperationsDelegueesMvtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller REST pour les mouvements des operations deleguees.
 * Expose les endpoints pour la gestion des mouvements MVT.
 */
@RestController
@RequestMapping("/api/operations-deleguees-mvt")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Opérations Déléguées - Mouvements", description = "API pour la gestion des mouvements d'opérations déléguées AVA (initialisation, consultation, mise à jour)")
public class OperationsDelegueesMvtController {

    private final OperationsDelegueesMvtService operationsDelegueesMvtService;

    // ==================== INITIALISATION ====================

    @Operation(
        summary = "Initialisation d'une ouverture",
        description = "Crée un nouveau mouvement avec toutes ses entités liées (bénéficiaires, documents, marchés). "
                + "Si finalize=true : valide le MVT (I→V), projette le dossier, et marque le MVT appliqué (A) ou en erreur (E). "
                + "Si finalize=false (défaut) : le MVT reste en status I (brouillon)."
    )
    @PostMapping("/initialisation")
    public ResponseEntity<OperationCreationResponseDTO> initialisationOuverture(
            @Parameter(description = "DTO contenant les informations du mouvement à créer", required = true)
            @RequestBody InitiationOuvertureDTO dto,
            @Parameter(description = "Si true, enchaîne validation + application au dossier dans la même requête")
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {
        log.info("POST /api/operations-deleguees-mvt/initialisation?finalize={}", finalize);
        OperationCreationResponseDTO resp = operationsDelegueesMvtService.create(dto, finalize);
        return new ResponseEntity<>(resp, HttpStatus.CREATED);
    }

    // ==================== CREATION PAR NUM_DOSSIER ====================

    @Operation(
        summary = "Récupérer un MVT par numDossier et optionnellement finaliser",
        description = "Récupère le mouvement associé au numDossier. "
                + "Si finalize=true : valide le MVT (I→V), projette le dossier, et marque le MVT appliqué (A) ou en erreur (E). "
                + "Si finalize=false (défaut) : retourne simplement le MVT."
    )
    @PostMapping("/by-numdossier/{numDossier}")
    public ResponseEntity<OperationCreationResponseDTO> findByNumDossierAndFinalize(
            @Parameter(description = "Numéro de dossier", required = true)
            @PathVariable Integer numDossier,
            @Parameter(description = "Si true, enchaîne validation + application au dossier")
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {
        log.info("POST /api/operations-deleguees-mvt/by-numdossier/{}?finalize={}", numDossier, finalize);
        OperationCreationResponseDTO resp = operationsDelegueesMvtService.findByNumDossierAndFinalize(numDossier, finalize);
        return ResponseEntity.ok(resp);
    }

    // ==================== UPDATE + FINALIZE ====================

    @Operation(
        summary = "Mettre à jour un MVT et optionnellement finaliser",
        description = "Met à jour un mouvement existant identifié par refOperation + dateOperation. "
                + "Si finalize=true : après l'update, valide le MVT (I→V), projette le dossier, et marque A ou E. "
                + "Si finalize=false (défaut) : fait uniquement l'update."
    )
    @PutMapping("/{refOperation}/{dateOperation}")
    public ResponseEntity<OperationCreationResponseDTO> updateOperationWithFinalize(
            @Parameter(description = "Référence de l'opération", required = true)
            @PathVariable Long refOperation,
            @Parameter(description = "DTO contenant les nouvelles informations", required = true)
            @RequestBody InitiationOuvertureDTO dto,
            @Parameter(description = "Si true, enchaîne validation + application au dossier après l'update")
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {
        log.info("PUT /api/operations-deleguees-mvt/{}/{}?finalize={}", refOperation, finalize);
        OperationCreationResponseDTO resp = operationsDelegueesMvtService.updateOperationWithFinalize(
                refOperation, dto, finalize);
        return ResponseEntity.ok(resp);
    }

    // ==================== CONSULTATION ====================

//    @Operation(
//        summary = "Lister tous les mouvements",
//        description = "Récupère la liste de tous les mouvements d'opérations déléguées enregistrés"
//    )
//    @GetMapping
//    public ResponseEntity<List<InitiationOuvertureDTO>> findAll() {
//        log.info("GET /api/operations-deleguees-mvt");
//        List<InitiationOuvertureDTO> result = operationsDelegueesMvtService.findAll();
//        return ResponseEntity.ok(result);
//    }
//
//    @Operation(
//        summary = "Rechercher un mouvement par référence et date",
//        description = "Récupère un mouvement spécifique par sa référence d'opération et sa date d'opération"
//    )
//    @GetMapping("/{refOperation}/{dateOperation}")
//    public ResponseEntity<InitiationOuvertureDTO> findByRefOperationAndDateOperation(
//            @Parameter(description = "Référence de l'opération", required = true)
//            @PathVariable Long refOperation,
//            @Parameter(description = "Date de l'opération (format: yyyy-MM-dd)", required = true)
//            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateOperation) {
//        log.info("GET /api/operations-deleguees-mvt/{}/{}", refOperation, dateOperation);
//        return operationsDelegueesMvtService.findByRefOperationAndDateOperation(refOperation, dateOperation)
//                .map(ResponseEntity::ok)
//                .orElse(ResponseEntity.notFound().build());
//    }
//
//    @Operation(
//        summary = "Rechercher un mouvement avec toutes ses relations",
//        description = "Récupère un mouvement avec toutes ses entités liées (bénéficiaires, documents, marchés)"
//    )
//    @GetMapping("/{refOperation}/{dateOperation}/with-relations")
//    public ResponseEntity<InitiationOuvertureDTO> findByIdWithRelations(
//            @Parameter(description = "Référence de l'opération", required = true)
//            @PathVariable Long refOperation,
//            @Parameter(description = "Date de l'opération (format: yyyy-MM-dd)", required = true)
//            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateOperation) {
//        log.info("GET /api/operations-deleguees-mvt/{}/{}/with-relations", refOperation, dateOperation);
//        return operationsDelegueesMvtService.findByIdWithRelations(refOperation, dateOperation)
//                .map(ResponseEntity::ok)
//                .orElse(ResponseEntity.notFound().build());
//    }
//
//    // ==================== RECHERCHE PAR CRITERES ====================
//
//    @Operation(
//        summary = "Rechercher par référence d'opération",
//        description = "Récupère tous les mouvements pour une référence d'opération donnée"
//    )
//    @GetMapping("/by-ref-operation/{refOperation}")
//    public ResponseEntity<List<InitiationOuvertureDTO>> findByRefOperation(
//            @Parameter(description = "Référence de l'opération", required = true)
//            @PathVariable Long refOperation) {
//        log.info("GET /api/operations-deleguees-mvt/by-ref-operation/{}", refOperation);
//        List<InitiationOuvertureDTO> result = operationsDelegueesMvtService.findByRefOperation(refOperation);
//        return ResponseEntity.ok(result);
//    }
//
//    @Operation(
//        summary = "Rechercher par code agence AVA",
//        description = "Récupère tous les mouvements d'une agence AVA spécifique"
//    )
//    @GetMapping("/by-agence/{codeAgenceAva}")
//    public ResponseEntity<List<InitiationOuvertureDTO>> findByCodeAgenceAva(
//            @Parameter(description = "Code agence AVA", required = true)
//            @PathVariable Short codeAgenceAva) {
//        log.info("GET /api/operations-deleguees-mvt/by-agence/{}", codeAgenceAva);
//        List<InitiationOuvertureDTO> result = operationsDelegueesMvtService.findByCodeAgenceAva(codeAgenceAva);
//        return ResponseEntity.ok(result);
//    }
//
//    @Operation(
//        summary = "Rechercher par statut",
//        description = "Récupère tous les mouvements selon leur statut (ex: EN_COURS, VALIDE, REJETE)"
//    )
//    @GetMapping("/by-status/{status}")
//    public ResponseEntity<List<InitiationOuvertureDTO>> findByStatus(
//            @Parameter(description = "Statut du mouvement", required = true)
//            @PathVariable String status) {
//        log.info("GET /api/operations-deleguees-mvt/by-status/{}", status);
//        List<InitiationOuvertureDTO> result = operationsDelegueesMvtService.findByStatus(status);
//        return ResponseEntity.ok(result);
//    }
//
//    // ==================== MISE A JOUR ====================
//
//    @Operation(
//        summary = "Mettre à jour un mouvement",
//        description = "Met à jour les informations d'un mouvement d'opération déléguée existant"
//    )
//    @PutMapping("/{refOperation}/{dateOperation}")
//    public ResponseEntity<InitiationOuvertureDTO> updateOperation(
//            @Parameter(description = "Référence de l'opération", required = true)
//            @PathVariable Long refOperation,
//            @Parameter(description = "Date de l'opération (format: yyyy-MM-dd)", required = true)
//            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateOperation,
//            @Parameter(description = "DTO contenant les nouvelles informations", required = true)
//            @RequestBody InitiationOuvertureDTO dto) {
//        log.info("PUT /api/operations-deleguees-mvt/{}/{}", refOperation, dateOperation);
//        InitiationOuvertureDTO result = operationsDelegueesMvtService.updateoperation(refOperation, dateOperation, dto);
//        return ResponseEntity.ok(result);
//    }
//
//    // ==================== VERIFICATION ====================
//
//    @Operation(
//        summary = "Vérifier l'existence d'un mouvement",
//        description = "Vérifie si un mouvement existe pour une référence et date d'opération données"
//    )
//    @GetMapping("/{refOperation}/{dateOperation}/exists")
//    public ResponseEntity<Boolean> existsById(
//            @Parameter(description = "Référence de l'opération", required = true)
//            @PathVariable Long refOperation,
//            @Parameter(description = "Date de l'opération (format: yyyy-MM-dd)", required = true)
//            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateOperation) {
//        log.info("GET /api/operations-deleguees-mvt/{}/{}/exists", refOperation, dateOperation);
//        boolean exists = operationsDelegueesMvtService.existsById(refOperation, dateOperation);
//        return ResponseEntity.ok(exists);
//    }

    @Operation(
        summary = "Rechercher les mvts pour un numéro de dossier et une période (retour entités)",
        description = "Récupère tous les mouvements MVT (entités complètes avec relations) pour un numDossier donné entre dateDebut et dateFin (format yyyy-MM-dd)"
    )
    @GetMapping("/by-numdossier/{numDossier}")
    public ResponseEntity<List<OperationsDelegueesMvt>> findByNumDossierAndPeriod(
            @Parameter(description = "Numéro de dossier", required = true)
            @PathVariable Integer numDossier,
            @Parameter(description = "Date début (format yyyy-MM-dd)")
            @RequestParam(name = "start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @Parameter(description = "Date fin (format yyyy-MM-dd)")
            @RequestParam(name = "end") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end
    ) {
        log.info("GET /api/operations-deleguees-mvt/by-numdossier/{}?start={}&end={}", numDossier, start, end);
        List<OperationsDelegueesMvt> result = operationsDelegueesMvtService.findByNumDossierAndPeriod(numDossier, start, end);
        return ResponseEntity.ok(result);
    }
}
