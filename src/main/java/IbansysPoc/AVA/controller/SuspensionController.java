package IbansysPoc.AVA.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.DTO.SuspensionDTO;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/suspension")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Suspension", description = "API pour la suspension des dossiers AVA")
public class SuspensionController {

    private final OperationsDelegueeService operationsDelegueeService;

    @Operation(
        summary = "Suspension d'un dossier",
        description = "Suspend un dossier validé en changeant son état à 'B' (Bloqué) et en créant un mouvement correspondant"
    )
    @PostMapping("/{Finalize}")
    public ResponseEntity<OuvertureDossierDTO> suspensionDossier(
            @Parameter(description = "true = logique complète + MVT status='A', false = MVT seul", required = true)
            @PathVariable("Finalize") boolean finalizeFlag,
            @Parameter(description = "DTO contenant les informations de suspension (numDossier, codeEtat, motifEtat)", required = true)
            @RequestBody @Valid SuspensionDTO dto) {
        log.info("POST /api/suspension/{} - numDossier: {}", finalizeFlag, dto.getNumDossier());
        OuvertureDossierDTO result = operationsDelegueeService.suspensionDossier(dto, finalizeFlag);
        return ResponseEntity.ok(result);
    }
}
