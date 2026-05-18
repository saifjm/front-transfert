package IbansysPoc.AVA.controller;

import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import IbansysPoc.AVA.DTO.ClotureDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.service.ClotureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/cloture")
@RequiredArgsConstructor
public class ClotureController {

    private final ClotureService clotureService;

    @PostMapping("/{numDossier}/{finalize}")
    public ResponseEntity<OuvertureDossierDTO> cloturerDossier(
            @PathVariable Integer numDossier,
            @PathVariable("finalize") boolean finalizeFlag,
            @RequestBody @Valid ClotureDTO dto,
            BindingResult bindingResult) {
            
        if (bindingResult.hasErrors()) {
            String errors = bindingResult.getFieldErrors().stream()
                    .map(err -> err.getField() + " : " + err.getDefaultMessage())
                    .collect(Collectors.joining(", "));
            throw new BusinessException("VALIDATION_ERROR", errors);
        }

        OuvertureDossierDTO response = clotureService.cloturerDossier(numDossier, dto, finalizeFlag);
        return ResponseEntity.ok(response);
    }
}
