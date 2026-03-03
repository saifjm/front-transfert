package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.DeclarationCAFHTDTO;
import IbansysPoc.AVA.service.ApiExterneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST pour les déclarations de Chiffre d'Affaires Fiscal HT.
 * Proxy vers le microservice GEN.
 */
@RestController
@RequestMapping("/api/declarations-caf-ht")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Déclarations CA Fiscal HT", description = "API pour la gestion des déclarations de Chiffre d'Affaires Fiscal HT (proxy vers microservice GEN)")
public class DeclarationCAFHTController {

    private final ApiExterneService apiExterneService;

    // ==================== CRÉATION / MISE À JOUR ====================

    @Operation(
        summary = "Créer ou mettre à jour une déclaration CA Fiscal HT",
        description = "Proxy vers le microservice GEN pour créer ou mettre à jour une déclaration de Chiffre d'Affaires Fiscal HT"
    )
    @PostMapping
    public ResponseEntity<DeclarationCAFHTDTO> save(
            @Parameter(description = "La déclaration CA Fiscal HT à sauvegarder", required = true)
            @RequestBody DeclarationCAFHTDTO declarationCAFHT) {
        log.info("POST /api/declarations-caf-ht - noPieceClient: {}, annee: {}, etat: {}",
                declarationCAFHT.getNoPieceClient(),
                declarationCAFHT.getAnnee(),
                declarationCAFHT.getEtat());

        DeclarationCAFHTDTO saved = apiExterneService.saveDeclarationCAFHT(declarationCAFHT);

        if (saved == null) {
            log.warn("Échec de la sauvegarde de la déclaration CA Fiscal HT");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ==================== CONSULTATION ====================

    @Operation(
        summary = "Récupérer une déclaration CA Fiscal HT",
        description = "Proxy vers le microservice GEN pour récupérer une déclaration de Chiffre d'Affaires Fiscal HT par numéro de pièce client et année"
    )
    @GetMapping("/{noPieceClient}/{annee}")
    public ResponseEntity<DeclarationCAFHTDTO> getDeclarationCAFHT(
            @Parameter(description = "Numéro de pièce du client", required = true)
            @PathVariable String noPieceClient,
            @Parameter(description = "Année de la déclaration", required = true)
            @PathVariable Short annee) {
        log.info("GET /api/declarations-caf-ht/{}/{}", noPieceClient, annee);

        DeclarationCAFHTDTO result = apiExterneService.getDeclarationCAFHT(noPieceClient, annee);

        if (result == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(result);
    }

}

