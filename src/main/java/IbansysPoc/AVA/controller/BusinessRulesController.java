package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.InitiationOuvertureDTO;
import IbansysPoc.AVA.entity.TypeDossierAva;
import IbansysPoc.AVA.service.BusinessRulesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller REST pour les regles metier : calculs et controles de saisie.
 */
@RestController
@RequestMapping("/api/business-rules")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Règles Métier", description = "API pour les calculs et contrôles de saisie AVA")
public class BusinessRulesController {

    private static final String KEY_VALIDE = "valide";
    private static final String KEY_MESSAGE = "message";
    private static final String KEY_ALERTE = "alerte";

    private final BusinessRulesService businessRulesService;

    // ==================== CALCULS ====================

    @Operation(
            summary = "Calcul MVT AVA CR",
            description = "Calcule le montant MVT AVA CR en fonction du type de dossier, du montant autorisé et de la base de calcul"
    )
    @GetMapping("/calcul-mvt-ava-cr")
    public ResponseEntity<BigDecimal> calculMvtAvaCr(
            @Parameter(description = "Code type dossier AVA", required = true) @RequestParam Short codeTypeDosAva,
            @Parameter(description = "Montant autorisé") @RequestParam(required = false) BigDecimal autorise,
            @Parameter(description = "Base de calcul") @RequestParam(required = false) BigDecimal baseCalcul) {

        log.info("GET /calcul-mvt-ava-cr - codeTypeDosAva: {}, autorise: {}, baseCalcul: {}",
                codeTypeDosAva, autorise, baseCalcul);

        BigDecimal resultat = businessRulesService.calculMvtAvaCr(codeTypeDosAva, autorise, baseCalcul);
        return ResponseEntity.ok(resultat);
    }

    @Operation(
            summary = "Calcul du Solde",
            description = "Calcule le solde disponible à partir des différents montants (autorisé, avance, BCT, utilisé, réserve, blocage)"
    )
    @GetMapping("/calcul-solde")
    public ResponseEntity<BigDecimal> calculerSolde(
            @Parameter(description = "Montant autorisé") @RequestParam(required = false) BigDecimal mntAutorise,
            @Parameter(description = "Montant avance") @RequestParam(required = false) BigDecimal mntAvance,
            @Parameter(description = "Montant autorisé BCT") @RequestParam(required = false) BigDecimal mntAutoriseBct,
            @Parameter(description = "Montant utilisé") @RequestParam(required = false) BigDecimal mntUtilise,
            @Parameter(description = "Montant réserve") @RequestParam(required = false) BigDecimal mntReserve,
            @Parameter(description = "Montant blocage") @RequestParam(required = false) BigDecimal mntBlocage) {

        log.info("GET /calcul-solde - mntAutorise: {}, mntAvance: {}, mntAutoriseBct: {}, mntUtilise: {}, mntReserve: {}, mntBlocage: {}",
                mntAutorise, mntAvance, mntAutoriseBct, mntUtilise, mntReserve, mntBlocage);

        BigDecimal resultat = businessRulesService.calculerSolde(
                mntAutorise, mntAvance, mntAutoriseBct, mntUtilise, mntReserve, mntBlocage
        );
        return ResponseEntity.ok(resultat);
    }

    // ==================== CONTROLES DE SAISIE ====================

    @Operation(
            summary = "Contrôle Agence AVA",
            description = "Vérifie l'existence de l'agence via l'API externe REF et attribue le codeAgenceAva dans le DTO"
    )
    @PostMapping("/controle/agence-ava")
    public ResponseEntity<Map<String, Object>> controlerAgenceAVA(
            @Parameter(description = "Numéro de compte (20 caractères)", required = true) @RequestParam String numeroCompte,
            @RequestBody InitiationOuvertureDTO dto) {

        log.info("POST /controle/agence-ava - numeroCompte: {}", numeroCompte);

        String resultat = businessRulesService.controlerAgenceAVA(numeroCompte, dto);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put(KEY_MESSAGE, resultat);
        response.put("codeAgenceAva", dto.getCodeAgenceAva());
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Type Dossier AVA",
            description = "Vérifie l'existence et la validité du type de dossier AVA"
    )
    @GetMapping("/controle/type-dossier/{codeTypeDosAva}")
    public ResponseEntity<Map<String, Object>> controlerTypeDossier(
            @Parameter(description = "Code type dossier AVA", required = true) @PathVariable Integer codeTypeDosAva) {

        log.info("GET /controle/type-dossier/{}", codeTypeDosAva);

        TypeDossierAva typeDossier = businessRulesService.controlerTypeDossier(codeTypeDosAva);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put("typeDossier", typeDossier);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Pièce Client / Matricule fiscal",
            description = "Vérifie l'existence du client via API externe et valide le format du matricule fiscal"
    )
    @GetMapping("/controle/piece-client")
    public ResponseEntity<Map<String, Object>> controlerPieceClientmatfisc(
            @Parameter(description = "Type de pièce client", required = true) @RequestParam Integer typePieceClient,
            @Parameter(description = "Numéro de pièce client / Matricule fiscal", required = true) @RequestParam String numeroPieceClient) {

        log.info("GET /controle/piece-client - typePieceClient: {}, numeroPieceClient: {}",
                typePieceClient, numeroPieceClient);

        String resultat = businessRulesService.controlerPieceClientmatfisc(typePieceClient, numeroPieceClient);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put(KEY_MESSAGE, resultat);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Compatibilité Type Dossier",
            description = "Vérifie l'existence de dossiers incompatibles pour le client selon le type de dossier demandé"
    )
    @GetMapping("/controle/compatibilite-type-dossier")
    public ResponseEntity<Map<String, Object>> controlerCompatibiliteTypeDossier(
            @Parameter(description = "Numéro de pièce client / Matricule fiscal", required = true) @RequestParam String noPieceClient,
            @Parameter(description = "Code type dossier AVA", required = true) @RequestParam Short codeTypeDosAva) {

        log.info("GET /controle/compatibilite-type-dossier - noPieceClient: {}, codeTypeDosAva: {}",
                noPieceClient, codeTypeDosAva);

        businessRulesService.controlerCompatibiliteTypeDossier(noPieceClient, codeTypeDosAva);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put(KEY_MESSAGE, "OK");
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Numéro de Compte (RIB)",
            description = "Valide le numéro de compte bancaire (RIB 20 chiffres) avec calcul de la clé de contrôle"
    )
    @GetMapping("/controle/numero-compte")
    public ResponseEntity<Map<String, Object>> controlerNumeroCompte(
            @Parameter(description = "Type de pièce client") @RequestParam(required = false) Integer typePieceClient,
            @Parameter(description = "Numéro de pièce client") @RequestParam(required = false) String numeroPieceClient,
            @Parameter(description = "Numéro de compte complet (20 caractères)", required = true) @RequestParam String numeroCompte) {

        log.info("GET /controle/numero-compte - typePieceClient: {}, numeroPieceClient: {}, numeroCompte: {}",
                typePieceClient, numeroPieceClient, numeroCompte);

        String resultat = businessRulesService.controlerNumeroCompte(typePieceClient, numeroPieceClient, numeroCompte);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put(KEY_MESSAGE, resultat);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Validation Activité / Type Dossier AVA",
            description = "Valide le code activité selon le type de dossier AVA"
    )
    @GetMapping("/validate/activite-type-dossier")
    public ResponseEntity<Map<String, Object>> validateActiviteTypeDossier(
            @Parameter(description = "Code type dossier AVA (1-5)", required = true) @RequestParam Integer codeTypeDosAva,
            @Parameter(description = "Code activité", required = true) @RequestParam Integer codeActivite) {

        log.info("GET /validate/activite-type-dossier - codeTypeDosAva: {}, codeActivite: {}",
                codeTypeDosAva, codeActivite);

        Boolean resultat = businessRulesService.validateActiviteTypeDossier(codeTypeDosAva, codeActivite);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, resultat);
        response.put(KEY_MESSAGE, "OK");
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Matricule Fiscal",
            description = "Valide le format du matricule fiscal tunisien (8 caractères avec clé de contrôle)"
    )
    @GetMapping("/controle/matricule-fiscal")
    public ResponseEntity<Map<String, Object>> controlerMatriculeFiscal(
            @Parameter(description = "Numéro de pièce client / Matricule fiscal", required = true)
            @RequestParam String noPieceClient) {

        log.info("GET /controle/matricule-fiscal - noPieceClient: {}", noPieceClient);

        String resultat = businessRulesService.controlerMatriculeFiscal(noPieceClient);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put(KEY_MESSAGE, resultat);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Code Activité secondaire",
            description = "Vérifie l'existence du code activité via l'API externe secteur d'activité"
    )
    @GetMapping("/controle/code-activite")
    public ResponseEntity<Map<String, Object>> controlerCodeActivite(
            @Parameter(description = "Code activité", required = true) @RequestParam Integer codeActivite,
            @Parameter(description = "Type dossier AVA", required = true) @RequestParam Short codeTypeDosAva) {

        log.info("GET /controle/code-activite - codeActivite: {}, codeTypeDosAva: {}",
                codeActivite, codeTypeDosAva);

        boolean resultat = businessRulesService.controlerCodeActiviteetSecondaire(codeActivite, Integer.valueOf(codeTypeDosAva));

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, resultat);
        response.put(KEY_MESSAGE, resultat ? "Code activité valide." : "Code activité invalide.");
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Autorisation BCT",
            description = "Vérifie la cohérence entre le numéro et la date d'autorisation BCT (les deux doivent être renseignés ou aucun)"
    )
    @GetMapping("/controle/autorisation-bct")
    public ResponseEntity<Map<String, Object>> controlerAutorisationBct(
            @Parameter(description = "Numéro autorisation BCT") @RequestParam(required = false) Integer numeroBct,
            @Parameter(description = "Date autorisation BCT (format: yyyy-MM-dd)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateBct) {

        log.info("GET /controle/autorisation-bct - numeroBct: {}, dateBct: {}", numeroBct, dateBct);

        String resultat = businessRulesService.controlerAutorisationBct(numeroBct, dateBct);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put(KEY_MESSAGE, resultat);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Montant Importation",
            description = "Vérifie le seuil minimum d'importation (200 000) pour activité 24 et type dossier 3. Lance une BusinessException si non conforme sans autorisation BCT, retourne une alerte si autorisation BCT présente"
    )
    @GetMapping("/controle/montant-importation")
    public ResponseEntity<Map<String, Object>> controlerMontantImportation(
            @Parameter(description = "Montant total importation") @RequestParam(required = false) Long mntImportation,
            @Parameter(description = "Code activité") @RequestParam(required = false) Integer codeActivite,
            @Parameter(description = "Code type dossier AVA") @RequestParam(required = false) Short codeTypeDosAva,
            @Parameter(description = "Numéro autorisation BCT") @RequestParam(required = false) Integer numeroBct) {

        log.info("GET /controle/montant-importation - mntImportation: {}, codeActivite: {}, codeTypeDosAva: {}, numeroBct: {}",
                mntImportation, codeActivite, codeTypeDosAva, numeroBct);

        String resultat = businessRulesService.controlerMontantImportation(mntImportation, codeActivite, codeTypeDosAva, numeroBct);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put(KEY_ALERTE, resultat != null && resultat.startsWith("ALERTE:"));
        response.put(KEY_MESSAGE, resultat);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Validation Montants Rapatriés (Complet)",
            description = "Valide les montants rapatriés: si l'un des paramètres est non null, alors TOUS les autres doivent être non null. Vérifie également l'existence de la banque de provenance via API externe."
    )
    @GetMapping("/validate/montants-rapatries")
    public ResponseEntity<Map<String, Object>> controlerMontantsRapatries(
            @Parameter(description = "Code banque de provenance") @RequestParam(required = false) Integer codeBanqueProvenance,
            @Parameter(description = "Montant autorisé") @RequestParam(required = false) BigDecimal mntAutorise,
            @Parameter(description = "Montant avance") @RequestParam(required = false) BigDecimal mntAvance,
            @Parameter(description = "Montant autorisation BCT") @RequestParam(required = false) BigDecimal mntAutorisationBct,
            @Parameter(description = "Montant utilisé") @RequestParam(required = false) BigDecimal mntUtilise) {

        log.info("GET /validate/montants-rapatries - codeBanqueProvenance: {}, mntAutorise: {}, mntAvance: {}, mntAutorisationBct: {}, mntUtilise: {}",
                codeBanqueProvenance, mntAutorise, mntAvance, mntAutorisationBct, mntUtilise);

        Boolean resultat = businessRulesService.controlerMontantsRapatries(
                codeBanqueProvenance, mntAutorise, mntAvance, mntAutorisationBct, mntUtilise
        );

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, resultat);
        response.put(KEY_MESSAGE, "OK");
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Déclaration Fiscale",
            description = "Vérifie l'état de la déclaration fiscale via API externe (années N-1 et N-2) et le CA fiscal minimum pour type 3 et activité 23"
    )
    @GetMapping("/controle/declaration-fiscale")
    public ResponseEntity<Map<String, Object>> controlerDeclarationFiscale(
            @Parameter(description = "Numéro de pièce client / Matricule fiscal", required = true) @RequestParam String noPieceClient,
            @Parameter(description = "Code activité") @RequestParam(required = false) Integer codeActivite,
            @Parameter(description = "Code type dossier AVA", required = true) @RequestParam Short codeTypeDosAva,
            @Parameter(description = "Numéro autorisation BCT") @RequestParam(required = false) Integer numeroBct,
            @Parameter(description = "Type de pièce client") @RequestParam(required = false) Integer typePieceClient) {

        log.info("GET /controle/declaration-fiscale - noPieceClient: {}, codeActivite: {}, codeTypeDosAva: {}, numeroBct: {}, typePieceClient: {}",
                noPieceClient, codeActivite, codeTypeDosAva, numeroBct, typePieceClient);

        String resultat = businessRulesService.controlerDeclarationFiscale(
                noPieceClient, codeActivite, codeTypeDosAva, numeroBct, typePieceClient
        );

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, true);
        response.put(KEY_ALERTE, resultat != null && resultat.startsWith("ALERTE:"));
        response.put(KEY_MESSAGE, resultat);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Contrôle Code Produit/Service et Opération",
            description = "Vérifie l'existence de la combinaison (codeProduitService, codeOperation) via l'API externe"
    )
    @GetMapping("/controle/produit-operation")
    public ResponseEntity<Map<String, Object>> controlerCodeProduitServiceEtOperation(
            @Parameter(description = "Code produit/service", required = true) @RequestParam Integer codeProduitService,
            @Parameter(description = "Code opération", required = true) @RequestParam Integer codeOperation) {

        log.info("GET /controle/produit-operation - codeProduitService: {}, codeOperation: {}",
                codeProduitService, codeOperation);

        boolean resultat = businessRulesService.ControleCodeProduitServiceetoperation(codeProduitService, codeOperation);

        Map<String, Object> response = new HashMap<>();
        response.put(KEY_VALIDE, resultat);
        response.put(KEY_MESSAGE, resultat ? "OK" : "Combinaison produit/opération invalide.");
        return ResponseEntity.ok(response);
    }
}
