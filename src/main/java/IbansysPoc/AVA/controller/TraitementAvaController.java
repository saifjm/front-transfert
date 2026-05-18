package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.TraitementAvaDTO;
import IbansysPoc.AVA.service.TraitementAvaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST pour le traitement AVA.
 * Équivalent de la procédure PL/SQL TRAITEMENT_AVA.
 */
@RestController
@RequestMapping("/api/traitement-ava")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Traitement AVA", description = "API pour le traitement des déclarations fiscales AVA")
public class TraitementAvaController {

    private final TraitementAvaService traitementAvaService;

    @Operation(
        summary = "Traiter une déclaration fiscale AVA",
        description = """
                Effectue le traitement AVA pour une déclaration fiscale.
                
                **Équivalent de la procédure PL/SQL TRAITEMENT_AVA**
                
                Paramètres d'entrée :
                - codeTypeDosAva : doit être 3
                - numDossier : numéro du dossier AVA
                - dateDossier : date du dossier
                - annee : année de la déclaration (N-1 ou N-2 avant le 15 juin)
                - mntCaFiscalHT : montant du CA fiscal HT
                """
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Traitement effectué avec succès"),
        @ApiResponse(responseCode = "400", description = "Erreur de validation ou règle métier")
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Paramètres de la déclaration fiscale",
        required = true,
        content = @Content(
            mediaType = MediaType.APPLICATION_JSON_VALUE,
            schema = @Schema(implementation = TraitementAvaDTO.class),
            examples = @ExampleObject(
                name = "Exemple de traitement",
                summary = "Traitement d'une déclaration fiscale",
                value = """
                    {
                        "codeTypeDosAva": 3,
                        "numDossier": 12345,
                        "dateDossier": "2025-01-15",
                        "annee": 2025,
                        "mntCaFiscalHT": 600000.00
                    }
                    """
            )
        )
    )
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> traiterDeclarationFiscale(@RequestBody TraitementAvaDTO dto) {
        log.info("POST /api/traitement-ava - numDossier: {}, annee: {}, mntCaFiscalHT: {}",
                dto.getNumDossier(), dto.getAnnee(), dto.getMntCaFiscalHT());

        traitementAvaService.traiterDeclarationFiscale(dto);

        return ResponseEntity.ok().build();
    }

}
