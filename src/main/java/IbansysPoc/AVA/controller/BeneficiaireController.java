package IbansysPoc.AVA.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import IbansysPoc.AVA.DTO.BeneficiaireDTO;
import IbansysPoc.AVA.service.BeneficiaireService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller REST pour la gestion des bénéficiaires.
 * Expose les endpoints pour créer et modifier les bénéficiaires associés aux opérations déléguées.
 */
@RestController
@RequestMapping("/api/beneficiaires")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Bénéficiaires", description = "API pour la gestion des bénéficiaires des opérations déléguées AVA")
public class BeneficiaireController {

    private final BeneficiaireService beneficiaireService;

    // ==================== CREATE / UPDATE ====================

    @Operation(
        summary = "Créer ou mettre à jour un bénéficiaire",
        description = "Crée un nouveau bénéficiaire ou met à jour un bénéficiaire existant pour une opération déléguée. " +
                      "Si Finalize=true : le bénéficiaire est créé/mis à jour ET un mouvement (MVT) est créé avec status='A'. " +
                      "Si Finalize=false : seul le mouvement (MVT) est créé dans la base, sans affecter la table bénéficiaire. " +
                      "Un mouvement est automatiquement créé dans OPERATIONS_DELEGUEES_MVT dans les deux cas. " +
                      "Les valeurs par défaut sont appliquées : codeAgenceAva = 1, dateCreation = sysdate."
    )
    @PostMapping("/{Finalize}")
    public ResponseEntity<BeneficiaireDTO> createOrUpdateBeneficiaire(
            @Parameter(description = "true = créer/mettre à jour bénéficiaire + MVT avec status 'A' ; false = créer MVT uniquement", required = true)
            @PathVariable("Finalize") boolean finalizeFlag,
            @Parameter(description = "DTO contenant les informations du bénéficiaire", required = true)
            @RequestBody BeneficiaireDTO dto) {
        log.info("POST /api/beneficiaires/{} - numDossier: {}, noPieceBenef: {}", 
                 finalizeFlag, dto.getNumDossier(), dto.getNoPieceBenef());
        
        BeneficiaireDTO result = beneficiaireService.createOrUpdateBeneficiaire(dto, finalizeFlag);
        
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }

    // ==================== GET BY NUM DOSSIER ====================

    @Operation(
        summary = "Récupérer les bénéficiaires d'un dossier",
        description = "Retourne la liste de tous les bénéficiaires associés à un numéro de dossier donné."
    )
    @GetMapping("/{numDossier}")
    public ResponseEntity<List<BeneficiaireDTO>> getBeneficiairesByNumDossier(
            @Parameter(description = "Numéro du dossier", required = true)
            @PathVariable Integer numDossier) {
        log.info("GET /api/beneficiaires/{} - Récupération des bénéficiaires", numDossier);
        
        List<BeneficiaireDTO> result = beneficiaireService.getBeneficiairesByNumDossier(numDossier);
        
        return ResponseEntity.ok(result);
    }
}