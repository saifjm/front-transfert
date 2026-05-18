package IbansysPoc.AVA.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import IbansysPoc.AVA.DTO.DossierValideDTO;
import IbansysPoc.AVA.DTO.OperationsDelegueeSummaryDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller REST pour les operations deleguees.
 * Expose les endpoints pour la gestion des dossiers.
 */
@RestController
@RequestMapping("/api/operations-deleguees")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Opérations Déléguées - Dossiers", description = "API pour la gestion des dossiers d'opérations déléguées AVA")
public class OperationsDelegueeController {

    private final OperationsDelegueeService operationsDelegueeService;
//
//    // ==================== VALIDATION ====================
//
//    @Operation(
//        summary = "Validation d'un dossier",
//        description = "Crée et valide une opération déléguée avec toutes ses entités liées (bénéficiaires, documents, marchés)"
//    )
//    @PostMapping("/validation/{numDossier}")
//    public ResponseEntity<OuvertureDossierDTO> validationDossier(
//            @Parameter(description = "Numéro de dossier à valider", required = true)
//            @PathVariable Integer numDossier) {
//        log.info("POST /api/operations-deleguees/validation/{}", numDossier);
//        OuvertureDossierDTO result = operationsDelegueeService.ValidationDossier(numDossier);
//        return new ResponseEntity<>(result, HttpStatus.CREATED);
//    }
//
//    // ==================== CONSULTATION ====================
//
//    @Operation(
//        summary = "Lister toutes les opérations déléguées",
//        description = "Récupère la liste de toutes les opérations déléguées enregistrées"
//    )
//    @GetMapping
//    public ResponseEntity<List<OuvertureDossierDTO>> findAll() {
//        log.info("GET /api/operations-deleguees");
//        List<OuvertureDossierDTO> result = operationsDelegueeService.findAll();
//        return ResponseEntity.ok(result);
//    }
//
//    @Operation(
//        summary = "Rechercher un dossier par numéro",
//        description = "Récupère une opération déléguée par son numéro de dossier unique"
//    )
//    @GetMapping("/{numDossier}")
//    public ResponseEntity<OuvertureDossierDTO> findById(
//            @Parameter(description = "Numéro de dossier", required = true)
//            @PathVariable Integer numDossier) {
//        log.info("GET /api/operations-deleguees/{}", numDossier);
//        return operationsDelegueeService.findById(numDossier)
//                .map(ResponseEntity::ok)
//                .orElse(ResponseEntity.notFound().build());
//    }
//
//    @Operation(
//        summary = "Rechercher un dossier avec toutes ses relations",
//        description = "Récupère une opération déléguée avec toutes ses entités liées (bénéficiaires, documents, marchés)"
//    )
//    @GetMapping("/{numDossier}/with-relations")
//    public ResponseEntity<OuvertureDossierDTO> findByIdWithRelations(
//            @Parameter(description = "Numéro de dossier", required = true)
//            @PathVariable Integer numDossier) {
//        log.info("GET /api/operations-deleguees/{}/with-relations", numDossier);
//        return operationsDelegueeService.findByIdWithRelations(numDossier)
//                .map(ResponseEntity::ok)
//                .orElse(ResponseEntity.notFound().build());
//    }
//
//    // ==================== RECHERCHE PAR CRITERES ====================
//
//    @Operation(
//        summary = "Rechercher par code agence AVA",
//        description = "Récupère toutes les opérations déléguées d'une agence AVA spécifique"
//    )
//    @GetMapping("/by-agence/{codeAgenceAva}")
//    public ResponseEntity<List<OuvertureDossierDTO>> findByCodeAgenceAva(
//            @Parameter(description = "Code agence AVA", required = true)
//            @PathVariable Short codeAgenceAva) {
//        log.info("GET /api/operations-deleguees/by-agence/{}", codeAgenceAva);
//        List<OuvertureDossierDTO> result = operationsDelegueeService.findByCodeAgenceAva(codeAgenceAva);
//        return ResponseEntity.ok(result);
//    }
//
//    @Operation(
//        summary = "Rechercher par état du dossier",
//        description = "Récupère toutes les opérations déléguées selon leur état (ex: OUVERT, CLOTURE, EN_COURS)"
//    )
//    @GetMapping("/by-etat/{etatDossier}")
//    public ResponseEntity<List<OuvertureDossierDTO>> findByEtatDossier(
//            @Parameter(description = "État du dossier", required = true)
//            @PathVariable String etatDossier) {
//        log.info("GET /api/operations-deleguees/by-etat/{}", etatDossier);
//        List<OuvertureDossierDTO> result = operationsDelegueeService.findByEtatDossier(etatDossier);
//        return ResponseEntity.ok(result);
//    }
//
//    // ==================== MISE A JOUR ====================
//
//    @Operation(
//        summary = "Mettre à jour un dossier",
//        description = "Met à jour les informations d'une opération déléguée existante"
//    )
//    @PutMapping("/{numDossier}")
//    public ResponseEntity<OuvertureDossierDTO> update(
//            @Parameter(description = "Numéro de dossier à mettre à jour", required = true)
//            @PathVariable Integer numDossier,
//            @Parameter(description = "DTO contenant les nouvelles informations", required = true)
//            @RequestBody OuvertureDossierDTO dto) {
//        log.info("PUT /api/operations-deleguees/{}", numDossier);
//        OuvertureDossierDTO result = operationsDelegueeService.update(numDossier, dto);
//        return ResponseEntity.ok(result);
//    }
//
//    // ==================== VERIFICATION ====================
//
//    @Operation(
//        summary = "Vérifier l'existence d'un dossier",
//        description = "Vérifie si une opération déléguée existe pour un numéro de dossier donné"
//    )
//    @GetMapping("/{numDossier}/exists")
//    public ResponseEntity<Boolean> existsById(
//            @Parameter(description = "Numéro de dossier à vérifier", required = true)
//            @PathVariable Integer numDossier) {
//        log.info("GET /api/operations-deleguees/{}/exists", numDossier);
//        boolean exists = operationsDelegueeService.existsById(numDossier);
//        return ResponseEntity.ok(exists);
//    }

    @Operation(
        summary = "Validation d'un dossier",
        description = "Crée et valide une opération déléguée avec toutes ses entités liées (bénéficiaires, documents, marchés)"
    )
    @PostMapping("/validation/{numDossier}")
    public ResponseEntity<OuvertureDossierDTO> validationDossier(
            @Parameter(description = "Numéro de dossier à valider", required = true)
            @PathVariable Integer numDossier) {
        log.info("POST /api/operations-deleguees/validation/{}", numDossier);
        OuvertureDossierDTO result = operationsDelegueeService.ValidationDossier(numDossier);
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }

    // ==================== CONSULTATION ====================

    @Operation(
        summary = "Lister toutes les opérations déléguées",
        description = "Récupère la liste de toutes les opérations déléguées enregistrées"
    )
    @GetMapping
    public ResponseEntity<List<OuvertureDossierDTO>> findAll() {
        log.info("GET /api/operations-deleguees");
        List<OuvertureDossierDTO> result = operationsDelegueeService.findAll();
        return ResponseEntity.ok(result);
    }

    @Operation(
        summary = "Rechercher un dossier par numéro",
        description = "Récupère une opération déléguée par son numéro de dossier unique"
    )
    @GetMapping("/{numDossier}")
    public ResponseEntity<OuvertureDossierDTO> findById(
            @Parameter(description = "Numéro de dossier", required = true)
            @PathVariable Integer numDossier) {
        log.info("GET /api/operations-deleguees/{}", numDossier);
        return operationsDelegueeService.findById(numDossier)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(
        summary = "Rechercher un dossier avec toutes ses relations",
        description = "Récupère une opération déléguée avec toutes ses entités liées (bénéficiaires, documents, marchés)"
    )
    @GetMapping("/{numDossier}/with-relations")
    public ResponseEntity<OuvertureDossierDTO> findByIdWithRelations(
            @Parameter(description = "Numéro de dossier", required = true)
            @PathVariable Integer numDossier) {
        log.info("GET /api/operations-deleguees/{}/with-relations", numDossier);
        return operationsDelegueeService.findByIdWithRelations(numDossier)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(
        summary = "Lister toutes les opérations déléguées avec leurs relations",
        description = "Récupère toutes les opérations déléguées et leurs entités liées (bénéficiaires, documents, marchés)"
    )
    @GetMapping("/with-relations")
    public ResponseEntity<List<OuvertureDossierDTO>> findAllWithRelations() {
        log.info("GET /api/operations-deleguees/with-relations");
        List<OuvertureDossierDTO> result = operationsDelegueeService.findAllWithRelations();
        return ResponseEntity.ok(result);
    }

    // ==================== RECHERCHE PAR CRITERES ====================

    @Operation(
        summary = "Rechercher par code agence AVA",
        description = "Récupère toutes les opérations déléguées d'une agence AVA spécifique"
    )
    @GetMapping("/by-agence/{codeAgenceAva}")
    public ResponseEntity<List<OuvertureDossierDTO>> findByCodeAgenceAva(
            @Parameter(description = "Code agence AVA", required = true)
            @PathVariable Short codeAgenceAva) {
        log.info("GET /api/operations-deleguees/by-agence/{}", codeAgenceAva);
        List<OuvertureDossierDTO> result = operationsDelegueeService.findByCodeAgenceAva(codeAgenceAva);
        return ResponseEntity.ok(result);
    }

    @Operation(
        summary = "Rechercher par état du dossier",
        description = "Récupère toutes les opérations déléguées selon leur état (ex: OUVERT, CLOTURE, EN_COURS)"
    )
    @GetMapping("/by-etat/{etatDossier}")
    public ResponseEntity<List<OuvertureDossierDTO>> findByEtatDossier(
            @Parameter(description = "État du dossier", required = true)
            @PathVariable String etatDossier) {
        log.info("GET /api/operations-deleguees/by-etat/{}", etatDossier);
        List<OuvertureDossierDTO> result = operationsDelegueeService.findByEtatDossier(etatDossier);
        return ResponseEntity.ok(result);
    }

    // ==================== MISE A JOUR ====================

    @Operation(
        summary = "Mettre à jour un dossier",
        description = "Met à jour les informations d'une opération déléguée existante"
    )
    @PutMapping("/{numDossier}")
    public ResponseEntity<OuvertureDossierDTO> update(
            @Parameter(description = "Numéro de dossier à mettre à jour", required = true)
            @PathVariable Integer numDossier,
            @Parameter(description = "DTO contenant les nouvelles informations", required = true)
            @RequestBody OuvertureDossierDTO dto) {
        log.info("PUT /api/operations-deleguees/{}", numDossier);
        OuvertureDossierDTO result = operationsDelegueeService.update(numDossier, dto);
        return ResponseEntity.ok(result);
    }

    // ==================== VERIFICATION ====================

    @Operation(
        summary = "Vérifier l'existence d'un dossier",
        description = "Vérifie si une opération déléguée existe pour un numéro de dossier donné"
    )
    @GetMapping("/{numDossier}/exists")
    public ResponseEntity<Boolean> existsById(
            @Parameter(description = "Numéro de dossier à vérifier", required = true)
            @PathVariable Integer numDossier) {
        log.info("GET /api/operations-deleguees/{}/exists", numDossier);
        boolean exists = operationsDelegueeService.existsById(numDossier);
        return ResponseEntity.ok(exists);
    }

    // ==================== DOSSIERS VALIDES AVEC NOM ====================

    @Operation(
        summary = "Récupérer les dossiers valides avec nom du client",
        description = "Récupère tous les dossiers valides (état 'V') avec les informations de base et le nom du client depuis l'API externe"
    )
    @GetMapping("/dossiers-valides-avec-nom")
    public ResponseEntity<List<DossierValideDTO>> findDossiersValidesAvecNom() {
        log.info("GET /api/operations-deleguees/dossiers-valides-avec-nom");
        List<DossierValideDTO> result = operationsDelegueeService.findDossiersValidesAvecNom();
        return ResponseEntity.ok(result);
    }

    // ==================== RECUPERATION DU RESUME D'UNE OPERATION DELEGUEE ====================

    @Operation(
        summary = "Récupérer le résumé d'une opération déléguée",
        description = "Récupère un résumé d'une opération déléguée par numéro de dossier avec les champs principaux"
    )
    @GetMapping("/{numDossier}/summary")
    public ResponseEntity<OperationsDelegueeSummaryDTO> findSummaryById(
            @Parameter(description = "Numéro de dossier", required = true)
            @PathVariable Integer numDossier) {
        log.info("GET /api/operations-deleguees/{}/summary", numDossier);
        return operationsDelegueeService.findSummaryById(numDossier)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(
        summary = "Récupérer le résumé d'une opération déléguée avec bénéficiaires",
        description = "Récupère un résumé d'une opération déléguée par numéro de dossier incluant la liste des bénéficiaires actifs"
    )
    @GetMapping("/{numDossier}/summarybenf")
    public ResponseEntity<OperationsDelegueeSummaryDTO> findSummaryWithBenefById(
            @Parameter(description = "Numéro de dossier", required = true)
            @PathVariable Integer numDossier) {
        log.info("GET /api/operations-deleguees/{}/summarybenf", numDossier);
        return operationsDelegueeService.findSummaryWithBenefById(numDossier)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(
        summary = "Rechercher les dossiers valides par matricule fiscal",
        description = "Récupère les dossiers dont le champ noPieceClient correspond au matricule fourni et dont l'état est 'V'"
    )
    @GetMapping("/by-matricule")
    public ResponseEntity<List<OperationsDeleguee>> findByMatriculeFiscaleValide(
            @Parameter(description = "Numéro de pièce client / Matricule fiscal", required = true)
            @RequestParam String noPieceClient) {
        log.info("GET /api/operations-deleguees/by-matricule - noPieceClient: {}", noPieceClient);
        List<OperationsDeleguee> result = operationsDelegueeService.findByMatriculeFiscaleValide(noPieceClient);
        return ResponseEntity.ok(result);
    }

    // ==================== API SIMPLE POUR LES SOLDES ====================

    @Operation(
        summary = "Récupérations des différents montants et soldes du dossier",
        description = "Retourne uniquement le solde disponible, le montant autorisé, l'avance, autorisé BCT, le montant utilisé et réservé"
    )
    @GetMapping("/{numDossier}/soldes")
    public ResponseEntity<java.util.Map<String, java.math.BigDecimal>> getDossierSoldes(
            @Parameter(description = "Numéro de dossier", required = true)
            @PathVariable Integer numDossier) {
        log.info("GET /api/operations-deleguees/{}/soldes", numDossier);
        
        return operationsDelegueeService.findById(numDossier).map(dossier -> {
            java.util.Map<String, java.math.BigDecimal> soldes = new java.util.HashMap<>();
            soldes.put("montantAutorise", dossier.getMntAutorise());
            soldes.put("montantAvance", dossier.getMntAvance());
            soldes.put("montantAutorisationBct", dossier.getMntAutoriseBct());
            soldes.put("montantUtilise", dossier.getMntUtilise());
            soldes.put("montantReserve", dossier.getMntReserve());
            soldes.put("soldeDisponible", dossier.getSolde());
            return ResponseEntity.ok(soldes);
        }).orElse(ResponseEntity.notFound().build());
    }

}
