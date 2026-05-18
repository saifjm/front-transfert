package IbansysPoc.AVA.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import IbansysPoc.AVA.DTO.LeveeSuspensionDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/levee-suspension")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Levée de Suspension", description = "API pour la levée de suspension des dossiers AVA")
public class LeveeSuspensionController {

    private final OperationsDelegueeService operationsDelegueeService;

    @Operation(
        summary = "Levée de suspension d'un dossier",
        description = "Lève la suspension d'un dossier bloqué en changeant son état à 'V' (Validé) et en créant un mouvement correspondant"
    )
    @PostMapping("/{Finalize}")
    public ResponseEntity<OuvertureDossierDTO> leveeSuspensionDossier(
            @Parameter(description = "true = logique complète + MVT status='A', false = MVT seul", required = true)
            @PathVariable("Finalize") boolean finalizeFlag,
            @Parameter(description = "DTO contenant le numéro de dossier pour la levée de suspension", required = true)
            @RequestBody @Valid LeveeSuspensionDTO dto) {
        log.info("POST /api/levee-suspension/{} - numDossier: {}", finalizeFlag, dto.getNumDossier());
        OuvertureDossierDTO result = operationsDelegueeService.leveeSuspensionDossier(dto, finalizeFlag);
        return ResponseEntity.ok(result);
    }
}
