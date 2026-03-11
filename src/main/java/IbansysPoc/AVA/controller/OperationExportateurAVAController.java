package IbansysPoc.AVA.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import IbansysPoc.AVA.DTO.OperationExportateurAVADTO;
import IbansysPoc.AVA.service.OperationExportateurAVAService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/operation-exportateur-ava")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Opérations Exportateur AVA", description = "API pour la gestion des opérations exportateur AVA")
public class OperationExportateurAVAController {

    private final OperationExportateurAVAService operationExportateurAVAService;

    @Operation(
        summary = "Créer une opération de rapatriement AVA",
        description = "Crée une nouvelle opération exportateur AVA de type rapatriement avec validation des contraintes métier. " +
                      "Si Finalize=true : logique complète (OperationExportateurAVA + MVT avec status='A' + mise à jour OperationsDeleguee). " +
                      "Si Finalize=false : création du MVT uniquement, sans persister OperationExportateurAVA ni mettre à jour OperationsDeleguee."
    )
    @PostMapping("/rapatriement/{Finalize}")
    public ResponseEntity<OperationExportateurAVADTO> createRapatriement(
            @Parameter(description = "true = logique complète + MVT status 'A' ; false = MVT uniquement", required = true)
            @PathVariable("Finalize") boolean finalizeFlag,
            @Parameter(description = "DTO contenant les informations de l'opération exportateur AVA", required = true)
            @RequestBody OperationExportateurAVADTO dto) {
        log.info("POST /api/operation-exportateur-ava/rapatriement/{} - numDossierAva: {}", finalizeFlag, dto.getNumDossierAva());
        OperationExportateurAVADTO result = operationExportateurAVAService.createRapatriement(dto, finalizeFlag);
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }
}
