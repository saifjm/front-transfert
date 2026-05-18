package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.entity.AvaActivite;
import IbansysPoc.AVA.repository.AvaActiviteRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller REST pour accéder aux activités AVA.
 */
@RestController
@RequestMapping("/api/activites")
@Slf4j
@Tag(name = "Activités AVA", description = "API de référence pour les activités AVA")
public class AvaActiviteController {

    private final AvaActiviteRepository avaActiviteRepository;

    // Injection par constructeur explicite pour éviter les problèmes de résolution des constructeurs
    public AvaActiviteController(AvaActiviteRepository avaActiviteRepository) {
        this.avaActiviteRepository = avaActiviteRepository;
    }

    @Operation(summary = "Récupérer toutes les activités AVA", description = "Retourne la liste complète des activités AVA")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des activités retournée",
                    content = @Content(schema = @Schema(implementation = AvaActivite.class))),
            @ApiResponse(responseCode = "204", description = "Aucune activité trouvée")
    })
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<AvaActivite>> findAll() {
        log.info("GET /api/AVA/activites - récupération de toutes les activités");
        List<AvaActivite> activites = avaActiviteRepository.findAll();
        if (activites == null || activites.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activites);
    }
}
