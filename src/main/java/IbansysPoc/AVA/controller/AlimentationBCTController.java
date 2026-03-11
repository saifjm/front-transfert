package IbansysPoc.AVA.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import IbansysPoc.AVA.DTO.AutorisationBctDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/alimentation-bct")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Alimentation BCT", description = "API pour l'alimentation suite accord BCT des dossiers AVA")
public class AlimentationBCTController {

    private final OperationsDelegueeService operationsDelegueeService;

    @Operation(
        summary = "Alimentation suite accord BCT",
        description = "Met à jour les informations BCT d'un dossier validé et crée un mouvement correspondant"
    )
    @PostMapping("/{numDossier}/{Finalize}")
    public ResponseEntity<OuvertureDossierDTO> alimentationSuiteAccordBct(
            @Parameter(description = "Numéro du dossier à alimenter", required = true)
            @PathVariable Integer numDossier,
            @Parameter(description = "true = logique complète + MVT status='A', false = MVT seul", required = true)
            @PathVariable("Finalize") boolean finalizeFlag,
            @Parameter(description = "DTO contenant les informations BCT pour l'alimentation", required = true)
            @RequestBody @Valid AutorisationBctDTO dto) {
        log.info("POST /api/alimentation-bct/{}/{} - numeroBct: {}, dateBct: {}, typeBct: {}, mntMvtAva: {}",
                numDossier, finalizeFlag, dto.getNumeroBct(), dto.getDateBct(), dto.getTypeBct(), dto.getMntMvtAva());
        OuvertureDossierDTO result = operationsDelegueeService.alimentationSuiteAccordBct(numDossier, dto, finalizeFlag);
        return ResponseEntity.ok(result);
    }
}
