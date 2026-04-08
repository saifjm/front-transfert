package IbansysPoc.AVA.controller;

import java.util.Base64;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;

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
    public ResponseEntity<?> createRapatriement(
            @Parameter(description = "true = logique complÃ¨te + MVT status 'A' ; false = MVT uniquement", required = true)
            @PathVariable("Finalize") boolean finalizeFlag,
            @Parameter(description = "DTO contenant les informations de l'opÃ©ration exportateur AVA", required = true)
            @RequestBody OperationExportateurAVADTO dto) {
        
        log.info("POST /api/operation-exportateur-ava/rapatriement/{} - numDossierAva: {}", finalizeFlag, dto.getNumDossierAva());       
        OperationExportateurAVADTO result = operationExportateurAVAService.createRapatriement(dto, finalizeFlag);

        // Si le PDF a ete genere en Base64, on le decode et on le retourne en tant que vrai fichier binaire
        if (result.getPdfBase64() != null && !result.getPdfBase64().isEmpty()) {
            byte[] pdfBytes = Base64.getDecoder().decode(result.getPdfBase64());
            
            // On enleve le base64 enorme pour eviter de surcharger les headers
            result.setPdfBase64(null);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "rapatriement_" + dto.getNumDossierAva() + ".pdf");
            
            // Optionnel : on met de toute facon le JSON restant (sans le PDF Base64 dedans)
            // dans un custom Header appele "X-Operation-Data" pour pouvoir lire les status etc
            try {
                String jsonData = new ObjectMapper().writeValueAsString(result);
                headers.add("X-Operation-Data", jsonData);
            } catch (Exception e) {
                log.error("Impossible de serialiser le resultat dans le header", e);
            }
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.CREATED);
        }

        // Si pas de PDF (ex: echec generation file ou Finalize=false), on renvoie toujours le JSON standard
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }
}
