package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.OperationCreationResponseDTO;
import IbansysPoc.AVA.DTO.ReservationOperationDTO;
import IbansysPoc.AVA.service.ReservationOperationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST pour la gestion des opérations de réservation.
 * Les données sont stockées dans la table OPERATIONS_DELEGUEES_MVT.
 */
@RestController
@RequestMapping("/api/reservation-operations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Reservation Operations", description = "API pour la gestion des opérations de réservation AVA")
public class ReservationOperationController {

    private final ReservationOperationService service;

    @Operation(
            summary = "Créer une nouvelle opération de réservation",
            description = "Crée une nouvelle opération de réservation dans OPERATIONS_DELEGUEES_MVT. "
                    + "Si finalize=true : valide le MVT (I→V), applique au dossier (lock pessimiste), et marque A ou E. "
                    + "Si finalize=false (défaut) : le MVT reste en status I (brouillon)."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Opération créée avec succès",
                    content = @Content(schema = @Schema(implementation = OperationCreationResponseDTO.class))),
            @ApiResponse(responseCode = "400", description = "Requête invalide"),
            @ApiResponse(responseCode = "422", description = "Erreur métier")
    })
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<OperationCreationResponseDTO> create(
            @Valid @RequestBody ReservationOperationDTO dto,
            @Parameter(description = "Si true, enchaîne validation + application au dossier dans la même requête")
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {
        log.info("POST /api/reservation-operations?finalize={}", finalize);
        OperationCreationResponseDTO resp = service.create(dto, finalize);
        return ResponseEntity.ok(resp);    }

    @Operation(
            summary = "Créer une opération d'annulation de réservation",
            description = "Crée une nouvelle opération d'annulation de réservation dans OPERATIONS_DELEGUEES_MVT. "
                    + "Si finalize=true : valide le MVT (I→V), applique au dossier (lock pessimiste), et marque A ou E. "
                    + "Si finalize=false (défaut) : le MVT reste en status I (brouillon)."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Opération d'annulation créée avec succès",
                    content = @Content(schema = @Schema(implementation = OperationCreationResponseDTO.class))),
            @ApiResponse(responseCode = "400", description = "Requête invalide"),
            @ApiResponse(responseCode = "404", description = "Dossier non trouvé"),
            @ApiResponse(responseCode = "422", description = "Erreur métier")
    })
    @PostMapping(value = "/annulation", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<OperationCreationResponseDTO> createOprAnnulation(
            @Valid @RequestBody ReservationOperationDTO dto,
            @Parameter(description = "Si true, enchaîne validation + application au dossier dans la même requête")
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {
        log.info("POST /api/reservation-operations/annulation?finalize={}", finalize);
        OperationCreationResponseDTO resp = service.createAnnulation(dto, finalize);
        return ResponseEntity.ok(resp);
    }


    // ------------------------------------------------------------------------
    // ✅ NEW - API UNIQUE de validation (269 ou 231) par referenceRes
    // ------------------------------------------------------------------------

    @Operation(
            summary = "Valider et traiter une opération (269 ou 231) par referenceRes",
            description = """
                    Sélectionne une opération OPERATIONS_DELEGUEES_MVT à traiter selon :
                    - referenceRes
                    - codeProduitService = 108
                    - codeOperation IN (269, 231)
                    - status != 'V'
                    Si une opération est trouvée : passage status='V' puis exécution du process complet
                    (création/MAJ RESERVATION + impact DOSSIER + recalcul SOLDE).
                    Si aucune opération n'est éligible => 204 No Content.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Opération validée et traitée",
                    content = @Content(schema = @Schema(implementation = ReservationOperationDTO.class))),
            @ApiResponse(responseCode = "204", description = "Aucune opération à traiter"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PutMapping(value = "/validate/{referenceRes}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ReservationOperationDTO> validateAndProcessByReferenceRes(
            @Parameter(description = "ReferenceRes (commune à la réservation et à l'annulation)") @PathVariable String referenceRes) {

        log.info("PUT /api/reservation-operations/validate/{} - Validation + traitement", referenceRes);

        ReservationOperationDTO result = service.validateAndProcessByReferenceRes(referenceRes);

        if (result == null) {
            return ResponseEntity.noContent().build(); // 204
        }
        return ResponseEntity.ok(result); // 200
    }
}
