package com.example.avagen.controller;

import com.example.avagen.entity.DeclarationFiscale;
import com.example.avagen.service.DeclarationFiscaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/declarations-fiscales")
@RequiredArgsConstructor
@Tag(name = "Déclarations fiscales", description = "API pour gérer les déclarations fiscales (CA fiscal HT) et récupérer leur état")
public class DeclarationFiscaleController {

    private final DeclarationFiscaleService declarationFiscaleService;

    @Operation(
        summary = "Récupérer état et montant CA fiscal (année N-1)",
        description = "Retourne l'état et le montant du CA fiscal HT pour l'année précédente (N-1) pour un client donné"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Déclaration trouvée - état et montant retournés",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(type = "object"))),
        @ApiResponse(responseCode = "404", description = "Déclaration non trouvée")
    })
    @GetMapping("/etat-ca-fiscal")
    public ResponseEntity<Map<String, Object>> getEtatAndMntCaFiscal(
            @RequestParam Integer typePieceClient,
            @RequestParam String noPieceClient) {

        return declarationFiscaleService.getDeclarationFiscaleForPreviousYear(typePieceClient, noPieceClient)
                .map(declaration -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("etat", declaration.getEtat());
                    response.put("mntCaFiscal", declaration.getMntCaFiscal());
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(
        summary = "Récupérer état et montant CA fiscal (année N-2)",
        description = "Retourne l'état et le montant du CA fiscal HT pour l'année N-2 pour un client donné"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Déclaration trouvée - état et montant retournés",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(type = "object"))),
        @ApiResponse(responseCode = "404", description = "Déclaration non trouvée")
    })
    @GetMapping("/etat-ca-fiscal-2")
    public ResponseEntity<Map<String, Object>> getEtatAndMntCaFiscal2(
            @RequestParam Integer typePieceClient,
            @RequestParam String noPieceClient) {

        return declarationFiscaleService.getDeclarationFiscaleForPreviousofthePreviousYear(typePieceClient, noPieceClient)
                .map(declaration -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("etat", declaration.getEtat());
                    response.put("mntCaFiscal", declaration.getMntCaFiscal());
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(
        summary = "Récupérer déclaration par client (année N-1)",
        description = "Retourne la déclaration fiscale complète pour l'année N-1 d'un client"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Déclaration trouvée",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = DeclarationFiscale.class))),
        @ApiResponse(responseCode = "404", description = "Déclaration non trouvée")
    })
    @GetMapping("/by-client")
    public ResponseEntity<DeclarationFiscale> getDeclarationByClient(
            @RequestParam Integer typePieceClient,
            @RequestParam String noPieceClient) {

        return declarationFiscaleService.getDeclarationFiscaleForPreviousYear(typePieceClient, noPieceClient)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crée ou met à jour une déclaration fiscale
     *
     * @param declarationFiscale la déclaration fiscale à sauvegarder
     * @return la déclaration fiscale sauvegardée
     */
    @Operation(
        summary = "Créer / Mettre à jour une déclaration fiscale",
        description = "Crée ou met à jour une déclaration fiscale (CA fiscal HT). Retourne la ressource créée."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Déclaration créée",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = DeclarationFiscale.class))),
        @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Objet DeclarationFiscale à créer ou mettre à jour",
        required = true,
        content = @Content(
            mediaType = MediaType.APPLICATION_JSON_VALUE,
            schema = @Schema(implementation = DeclarationFiscale.class),
            examples = @ExampleObject(
                name = "ExempleDeclarationFiscale",
                value = """
                    {
                        "noPieceClient": "12345678",
                        "typePieceClient": 1,
                        "annee": 2024,
                        "etat": "VALIDE",
                        "mntCaFiscal": 600000.00
                    }
                    """
            )
        )
    )
    @PostMapping(value = "/create_DeclarationFiscale", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<DeclarationFiscale> save(@Valid @RequestBody DeclarationFiscale declarationFiscale) {
        DeclarationFiscale saved = declarationFiscaleService.save(declarationFiscale);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
