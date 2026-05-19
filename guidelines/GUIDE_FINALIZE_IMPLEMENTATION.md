# 📘 Guide Simplifié : Mécanisme "Finalize" dans AVA

> **Date** : 3 mars 2026  
> **Objectif** : Comprendre le pattern "finalize" et savoir comment l'implémenter dans de nouveaux services/contrôleurs

---

## 🎯 Qu'est-ce que le mécanisme "Finalize" ?

### Concept de base

Le système AVA utilise un **pattern en 2 phases** pour toutes les opérations :

1. **Phase 1 (Brouillon)** : Créer un **mouvement (MVT)** avec status `I` (Initial)
   - Valider les données
   - Sauvegarder le mouvement et ses relations
   - **Aucun impact** sur le dossier réel

2. **Phase 2 (Finalisation)** : Appliquer le mouvement au **dossier**
   - Marquer le mouvement comme `V` (Validé)
   - Projeter le mouvement sur le dossier (création ou mise à jour)
   - Si succès → status `A` (Appliqué)
   - Si échec → status `E` (Erreur)

### Pourquoi ce pattern ?

**Avantages** :
- ✅ **Séparation des responsabilités** : Création MVT ≠ Application au dossier
- ✅ **Traçabilité totale** : Tous les mouvements (même non appliqués) sont conservés
- ✅ **Flexibilité** : Possibilité de créer un brouillon et le valider plus tard
- ✅ **Récupération automatique** : Un scheduler retente les opérations en erreur (status `E`)
- ✅ **Cohérence garantie** : Lock pessimiste empêche les conflits concurrents

**Règle d'or** :  
> **On ne modifie JAMAIS le dossier directement. Le dossier est TOUJOURS mis à jour via un mouvement validé.**

---

## 📊 Les 4 statuts d'un mouvement (MVT)

| Status | Signification | Quand | Action suivante |
|--------|--------------|-------|-----------------|
| `I` | Initial (Brouillon) | Mouvement créé mais pas encore validé | Peut être validé manuellement ou via `finalize=true` |
| `V` | Validé | Validations métier passées, prêt à être appliqué | Sera appliqué au dossier (devient `A` ou `E`) |
| `A` | Appliqué (Final) | Mouvement projeté avec succès sur le dossier | **État final** — rien à faire |
| `E` | Erreur | L'application au dossier a échoué | **Retenté** automatiquement par le scheduler |

---

## 🔄 Les 2 modes d'utilisation

### Mode 1 : Création en 2 étapes (finalize=false)

```http
# Étape 1 : Créer un brouillon
POST /api/operations-deleguees-mvt/initialisation?finalize=false
→ Status MVT : I (brouillon)
→ Aucun impact sur le dossier

# Étape 2 : Valider le brouillon (plus tard)
PUT /api/operations-deleguees/validation/{numDossier}
→ Status MVT : V → A (appliqué au dossier)
```

**Cas d'usage** : Workflows avec validation humaine, brouillons modifiables

### Mode 2 : Création en 1 étape (finalize=true)

```http
POST /api/operations-deleguees-mvt/initialisation?finalize=true
→ Status MVT : I → V → A (tout en une transaction)
→ Dossier créé/mis à jour immédiatement
```

**Cas d'usage** : API publiques, intégrations automatiques, pas besoin de brouillon

---

## 🏗️ Architecture du pattern "Finalize"

### Structure des fichiers (exemple : OperationsDelegueesMvt)

```
controller/
└── OperationsDelegueesMvtController.java
      └── POST /initialisation?finalize={true|false}
           └── service.create(dto, finalize)

service/
├── OperationsDelegueesMvtService.java (interface)
└── impl/
    ├── OperationsDelegueesMvtServiceImpl.java
    │    ├── create(dto, finalize)           ← Point d'entrée
    │    │    ├── Phase 1: createMvt(dto)
    │    │    └── Phase 2 (si finalize=true): writeDossier(mvt)
    │    │
    │    ├── createMvt(dto)                  ← Crée MVT status=I + validations
    │    └── writeDossier(mvt)               ← V → applique → A/E
    │
    └── OperationsDelegueeServiceImpl.java
         └── applyForDossier(numDossier)     ← Applique TOUS les MVT V/E d'un dossier
              └── applyOne(refOperation)      ← Applique UN MVT (idempotent)
```

### Flux détaillé

```
┌─────────────────────────────────────────────────────────────────────┐
│ Controller : aucune logique métier                                  │
│   POST /initialisation?finalize=true                                │
│       └─ service.create(dto, finalize)                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Service : create(dto, finalize)                                     │
│                                                                      │
│   Phase 1 : createMvt(dto)                                          │
│       ├─ Générer refOperation (séquence Oracle)                     │
│       ├─ Générer numDossier (si absent)                             │
│       ├─ Positionner status = 'I'                                   │
│       ├─ Exécuter validations métier (BusinessRules)                │
│       ├─ Calculer solde (formule MVT)                               │
│       ├─ Sauvegarder MVT + relations (bénéficiaires, docs, marché) │
│       └─ Return mvt (status=I)                                      │
│                                                                      │
│   if (finalize == false)                                            │
│       └─ Return { refOperation, numDossier, status: "I" }           │
│                                                                      │
│   Phase 2 : writeDossier(mvt)                                       │
│       ├─ mvt.status = 'V'                                           │
│       ├─ mvt.dateValidation = now()                                 │
│       ├─ save(mvt)                                                  │
│       │                                                              │
│       ├─ dossierService.applyForDossier(numDossier)                 │
│       │    ├─ Lock dossier (PESSIMISTIC_WRITE)                      │
│       │    ├─ Récupérer tous MVT V/E triés par date                 │
│       │    └─ Pour chaque MVT → applyOne(refOperation)              │
│       │         ├─ Si déjà status=A → skip (idempotent)             │
│       │         ├─ Mapper MVT → Dossier                             │
│       │         ├─ Calculer solde (formule Dossier)                 │
│       │         ├─ Projeter relations (bénéf, docs, marché)         │
│       │         ├─ Si OK → status = 'A'                             │
│       │         └─ Si KO → status = 'E' (log erreur, continue)      │
│       │                                                              │
│       ├─ Reload mvt pour vérifier status final                      │
│       └─ Return { refOperation, numDossier, status: "A" ou "E" }    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Comment implémenter "Finalize" dans un nouveau service ?

### Étape 1 : Controller (aucune logique métier)

```java
@RestController
@RequestMapping("/api/mon-nouveau-service")
public class MonNouveauController {
    
    private final MonNouveauService service;
    
    @PostMapping
    public ResponseEntity<OperationCreationResponseDTO> create(
            @Valid @RequestBody MonNouveauDTO dto,
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {
        
        // ❌ PAS de logique ici
        OperationCreationResponseDTO response = service.create(dto, finalize);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

**Points clés** :
- ✅ Ajouter le paramètre `@RequestParam("finalize")` avec `defaultValue="false"`
- ✅ Déléguer directement au service sans logique
- ✅ Retourner HTTP 201 Created
- ✅ Utiliser `OperationCreationResponseDTO` (DTO partagé)

---

### Étape 2 : Service Interface

```java
public interface MonNouveauService {
    
    /**
     * Crée un mouvement.
     * Si finalize=false → status I (brouillon)
     * Si finalize=true → status I → V → A/E (application au dossier)
     */
    OperationCreationResponseDTO create(MonNouveauDTO dto, boolean finalize);
}
```

---

### Étape 3 : Service Implémentation (Pattern complet)

```java
@Service
@Slf4j
@Transactional
public class MonNouveauServiceImpl implements MonNouveauService {
    
    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeService dossierService;
    private final BusinessRulesService businessRulesService;
    
    // ═══════════════════════════════════════════════════════════
    // POINT D'ENTRÉE PRINCIPAL
    // ═══════════════════════════════════════════════════════════
    
    @Override
    public OperationCreationResponseDTO create(MonNouveauDTO dto, boolean finalize) {
        // PHASE 1 : Créer le mouvement (status I)
        OperationsDelegueesMvt mvt = createMvt(dto);
        
        // PHASE 2 : Si finalize=true, appliquer au dossier
        if (!finalize) {
            return new OperationCreationResponseDTO(
                mvt.getId().getRefOperation(),
                mvt.getNumDossier(),
                "I",  // status
                null  // message
            );
        }
        
        return writeDossier(mvt);
    }
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 1 : Créer le mouvement (status I)
    // ═══════════════════════════════════════════════════════════
    
    private OperationsDelegueesMvt createMvt(MonNouveauDTO dto) {
        LocalDate now = LocalDate.now();
        
        // 1. Générer refOperation (séquence Oracle)
        Long refOperation = mvtRepository.getNextRefOperation();
        
        // 2. Générer numDossier si absent (séquence + format MMYY)
        Integer numDossier = dto.getNumDossier();
        if (numDossier == null) {
            numDossier = generateNumDossier(now);
        }
        
        // 3. Construire l'entité
        OperationsDelegueesMvt entity = new OperationsDelegueesMvt();
        entity.setId(new OperationsDelegueesMvtId(refOperation, now));
        entity.setNumDossier(numDossier);
        entity.setDateDossier(now);
        entity.setStatus("I");  // ← BROUILLON
        entity.setCodeOperation(200);  // ← Code spécifique à votre opération
        entity.setCodeProduitService(108);
        // ... mapper les autres champs du DTO
        
        // 4. Exécuter les validations métier
        businessRulesService.validateAll(dto, entity);
        
        // 5. Calculer le solde (si applicable)
        BigDecimal solde = businessRulesService.calculerSolde(
            entity.getMntAutorise(),
            entity.getMntAvance(),
            entity.getMntAutoriseBct(),
            entity.getMntUtilise(),
            entity.getMntReserve(),
            entity.getMntBlocage()
        );
        entity.setSolde(solde);
        
        // 6. Sauvegarder
        OperationsDelegueesMvt saved = mvtRepository.save(entity);
        
        // 7. Sauvegarder les relations (bénéficiaires, documents, marché)
        saveBeneficiaires(dto, saved);
        saveDocuments(dto, saved);
        saveMarche(dto, saved);
        
        return saved;
    }
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 2 : Valider et appliquer au dossier
    // ═══════════════════════════════════════════════════════════
    
    private OperationCreationResponseDTO writeDossier(OperationsDelegueesMvt mvt) {
        LocalDate now = LocalDate.now();
        Long refOperation = mvt.getId().getRefOperation();
        Integer numDossier = mvt.getNumDossier();
        
        // 1. Marquer comme VALIDÉ
        mvt.setStatus("V");
        mvt.setDateValidation(now);
        mvtRepository.save(mvt);
        
        // 2. Appliquer TOUS les MVT V/E de ce dossier
        //    (lock pessimiste + idempotence + retry des erreurs)
        try {
            dossierService.applyForDossier(numDossier);
            
            // 3. Recharger le MVT pour vérifier le status final
            mvt = mvtRepository.findById(mvt.getId())
                    .orElseThrow(() -> new BusinessException("MVT_NOT_FOUND", "..."));
            
            // 4. Retourner le résultat
            if ("A".equals(mvt.getStatus())) {
                return new OperationCreationResponseDTO(
                    refOperation,
                    numDossier,
                    "A",
                    "Opération appliquée avec succès"
                );
            } else {
                return new OperationCreationResponseDTO(
                    refOperation,
                    numDossier,
                    "E",
                    "Erreur lors de l'application au dossier"
                );
            }
            
        } catch (Exception e) {
            log.error("[writeDossier] Erreur pour numDossier={}: {}", numDossier, e.getMessage());
            mvt.setStatus("E");
            mvtRepository.save(mvt);
            return new OperationCreationResponseDTO(
                refOperation,
                numDossier,
                "E",
                "Erreur: " + e.getMessage()
            );
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // MÉTHODES UTILITAIRES
    // ═══════════════════════════════════════════════════════════
    
    private Integer generateNumDossier(LocalDate now) {
        Long seq = numDossierSequence.getNextValue();
        String mmyy = now.format(DateTimeFormatter.ofPattern("MMyy"));
        return Integer.parseInt(seq + mmyy);
    }
    
    private void saveBeneficiaires(MonNouveauDTO dto, OperationsDelegueesMvt mvt) {
        // ... logique de sauvegarde des bénéficiaires liés au MVT
    }
    
    private void saveDocuments(MonNouveauDTO dto, OperationsDelegueesMvt mvt) {
        // ... logique de sauvegarde des documents liés au MVT
    }
    
    private void saveMarche(MonNouveauDTO dto, OperationsDelegueesMvt mvt) {
        // ... logique de sauvegarde du marché lié au MVT
    }
}
```

---

### Étape 4 : Service Dossier (applyForDossier + applyOne)

**Important** : Cette partie est **partagée** par tous les services. Elle existe déjà dans `OperationsDelegueeServiceImpl`.

```java
@Service
@Slf4j
@Transactional
public class OperationsDelegueeServiceImpl implements OperationsDelegueeService {
    
    private final OperationsDelegueeRepository dossierRepository;
    private final OperationsDelegueeMvtRepository mvtRepository;
    
    /**
     * Applique TOUS les MVT en status V ou E pour un dossier donné.
     * Lock pessimiste → sérialisation garantie.
     * Idempotent → les MVT déjà appliqués (A) sont ignorés.
     */
    @Override
    public void applyForDossier(Integer numDossier) {
        
        // 1. Lock le dossier (si existe)
        Optional<OperationsDeleguee> dossierOpt = dossierRepository.findByIdForUpdate(numDossier);
        
        // 2. Récupérer tous les MVT V/E triés par date chronologique
        List<OperationsDelegueesMvt> pendingMvts = mvtRepository
                .findByNumDossierAndStatusInOrderByDateOperation(
                    numDossier,
                    List.of("V", "E")
                );
        
        if (pendingMvts.isEmpty()) {
            log.info("[applyForDossier] Aucun MVT en attente pour numDossier={}", numDossier);
            return;
        }
        
        log.info("[applyForDossier] {} MVT(s) à appliquer pour numDossier={}", 
                 pendingMvts.size(), numDossier);
        
        // 3. Appliquer chaque MVT dans l'ordre
        for (OperationsDelegueesMvt mvt : pendingMvts) {
            try {
                applyOne(mvt.getId().getRefOperation());
            } catch (Exception e) {
                log.error("[applyForDossier] Erreur pour refOp={}: {}", 
                         mvt.getId().getRefOperation(), e.getMessage());
                // Continue avec les suivants (ne pas bloquer tout)
            }
        }
    }
    
    /**
     * Applique UN mouvement au dossier.
     * Idempotent : si déjà status=A, skip.
     */
    @Override
    public void applyOne(Long refOperation) {
        
        // 1. Charger le MVT
        OperationsDelegueesMvt mvt = mvtRepository.findByIdRefOperation(refOperation)
                .stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException("MVT_NOT_FOUND", "..."));
        
        // 2. IDEMPOTENCE : si déjà appliqué, skip
        if ("A".equals(mvt.getStatus())) {
            log.info("[applyOne] MVT refOp={} déjà appliqué, skip", refOperation);
            return;
        }
        
        Integer numDossier = mvt.getNumDossier();
        
        try {
            // 3. Charger ou créer le dossier
            OperationsDeleguee dossier = dossierRepository.findById(numDossier)
                    .orElse(new OperationsDeleguee());
            
            // 4. Mapper MVT → Dossier (selon codeOperation)
            applyMvtToDossier(mvt, dossier);
            
            // 5. Calculer le solde
            BigDecimal solde = businessRulesService.calculerSolde(
                dossier.getMntAutorise(),
                dossier.getMntAvance(),
                dossier.getMntAutoriseBct(),
                dossier.getMntUtilise(),
                dossier.getMntReserve(),
                dossier.getMntBlocage()
            );
            dossier.setSolde(solde);
            
            // 6. Sauvegarder le dossier
            dossierRepository.save(dossier);
            
            // 7. Projeter les relations (bénéficiaires, documents, marché)
            projectBeneficiaires(mvt, dossier);
            projectDocuments(mvt, dossier);
            projectMarche(mvt, dossier);
            
            // 8. Marquer le MVT comme APPLIQUÉ
            mvt.setStatus("A");
            mvt.setEtatDossier("V");  // Dossier validé
            mvtRepository.save(mvt);
            
            log.info("[applyOne] MVT refOp={} appliqué avec succès", refOperation);
            
        } catch (Exception e) {
            // 9. Marquer le MVT en ERREUR (sera retenté par le scheduler)
            log.error("[applyOne] Erreur pour refOp={}: {}", refOperation, e.getMessage());
            mvt.setStatus("E");
            mvtRepository.save(mvt);
            throw e;  // Propager l'erreur pour log dans applyForDossier
        }
    }
    
    /**
     * Applique le MVT au dossier selon le codeOperation.
     * IMPORTANT : Gérer cumul vs écrasement selon le type d'opération.
     */
    private void applyMvtToDossier(OperationsDelegueesMvt mvt, OperationsDeleguee dossier) {
        Integer codeOperation = mvt.getCodeOperation();
        
        switch (codeOperation) {
            case 200:  // OUVERTURE → ÉCRASEMENT TOTAL
                // Mapper TOUS les champs MVT → Dossier
                dossier.setNumDossier(mvt.getNumDossier());
                dossier.setDateDossier(mvt.getDateDossier());
                dossier.setCodeTypeDosAva(mvt.getCodeTypeDosAva());
                dossier.setNoPieceClient(mvt.getNoPieceClient());
                dossier.setMntAutorise(mvt.getMntAutorise());
                dossier.setMntUtilise(mvt.getMntUtilise());
                // ... tous les autres champs
                break;
                
            case 201:  // AVENANT → MISE À JOUR PARTIELLE
                dossier.setMntAutorise(
                    dossier.getMntAutorise().add(mvt.getMntMvtAva())
                );
                break;
                
            case 202:  // UTILISATION → CUMUL
                dossier.setMntUtilise(
                    dossier.getMntUtilise().add(mvt.getMntMvtAva())
                );
                break;
                
            case 269:  // RÉSERVATION → CUMUL
                dossier.setMntReserve(
                    dossier.getMntReserve().add(mvt.getMntMvtAva())
                );
                break;
                
            case 231:  // ANNULATION RÉSERVATION → SOUSTRACTION
                dossier.setMntReserve(
                    dossier.getMntReserve().subtract(mvt.getMntMvtAva())
                );
                break;
                
            default:
                throw new BusinessException("CODE_OPERATION_INVALIDE", 
                    "Code opération " + codeOperation + " non géré");
        }
    }
}
```

---

## 🔄 Scheduler de rattrapage automatique

Le scheduler garantit que **toute opération validée finit appliquée**, même en cas d'erreur temporaire.

```java
@Component
@Slf4j
public class MvtRecoveryWorker {
    
    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeService dossierService;
    
    /**
     * Exécuté toutes les 30 secondes.
     * Récupère tous les MVT en status V ou E et retente leur application.
     */
    @Scheduled(fixedDelay = 30_000)
    public void recoverPendingOperations() {
        
        // 1. Récupérer tous les MVT en attente
        List<OperationsDelegueesMvt> pending = mvtRepository.findByStatusIn(
            List.of("V", "E")
        );
        
        if (pending.isEmpty()) {
            return;
        }
        
        log.info("[RECOVERY] {} MVT(s) en attente", pending.size());
        
        // 2. Regrouper par numDossier
        Map<Integer, List<OperationsDelegueesMvt>> byDossier = pending.stream()
                .collect(Collectors.groupingBy(OperationsDelegueesMvt::getNumDossier));
        
        // 3. Appliquer pour chaque dossier
        for (Integer numDossier : byDossier.keySet()) {
            try {
                dossierService.applyForDossier(numDossier);
            } catch (Exception e) {
                log.error("[RECOVERY] Erreur pour numDossier={}: {}", 
                         numDossier, e.getMessage());
                // Continue avec les autres dossiers
            }
        }
    }
}
```

**Garanties** :
- ✅ Tous les MVT en status `V` ou `E` sont retentés toutes les 30 secondes
- ✅ Lock pessimiste empêche les conflits avec les requêtes HTTP concurrentes
- ✅ Idempotence : si un MVT passe à `A` entre 2 exécutions, il est ignoré

---

## 📋 Checklist d'implémentation

Quand vous implémentez un nouveau service avec "finalize", suivez cette checklist :

### ✅ Controller
- [ ] Ajouter `@RequestParam("finalize")` avec `defaultValue="false"`
- [ ] Déléguer au service : `service.create(dto, finalize)`
- [ ] Retourner HTTP 201 Created
- [ ] Utiliser `OperationCreationResponseDTO`
- [ ] **Aucune logique métier** dans le controller

### ✅ Service Interface
- [ ] Signature : `OperationCreationResponseDTO create(DTO dto, boolean finalize)`

### ✅ Service Implémentation
- [ ] Méthode `create(dto, finalize)` qui délègue à `createMvt()` + `writeDossier()`
- [ ] Méthode `createMvt(dto)` :
  - [ ] Générer `refOperation` (séquence Oracle)
  - [ ] Générer `numDossier` (si absent)
  - [ ] Positionner `status = "I"`
  - [ ] Exécuter validations métier
  - [ ] Calculer solde (si applicable)
  - [ ] Sauvegarder MVT + relations
- [ ] Méthode `writeDossier(mvt)` :
  - [ ] Marquer `status = "V"`
  - [ ] Appeler `dossierService.applyForDossier(numDossier)`
  - [ ] Recharger MVT pour vérifier status final
  - [ ] Retourner `OperationCreationResponseDTO` avec status A ou E

### ✅ Service Dossier (partagé)
- [ ] Méthode `applyForDossier(numDossier)` existe déjà
- [ ] Méthode `applyOne(refOperation)` existe déjà
- [ ] Si nouveau `codeOperation`, ajouter un `case` dans `applyMvtToDossier()`

### ✅ Repository
- [ ] Query `findByStatusIn(List<String> statuses)`
- [ ] Query `findByNumDossierAndStatusInOrderByDateOperation(...)`
- [ ] Query `findByIdForUpdate(numDossier)` avec `@Lock(PESSIMISTIC_WRITE)`

### ✅ Tests
- [ ] Test `finalize=false` → status I
- [ ] Test `finalize=true` → status A
- [ ] Test validation métier échoue → HTTP 422
- [ ] Test concurrence (2 MVT simultanés) → lock fonctionne
- [ ] Test erreur application → status E → scheduler retente

---

## 🎯 Exemples d'appels API

### Exemple 1 : Créer un brouillon

```http
POST /api/mon-nouveau-service?finalize=false
Content-Type: application/json

{
  "numDossier": 123,
  "mntMvtAva": 5000,
  "codeActivite": 23
}
```

**Réponse** :
```json
HTTP/1.1 201 Created
{
  "refOperation": 456,
  "numDossier": 123,
  "status": "I",
  "message": null
}
```

**État du système** :
- ✅ MVT créé (status=I)
- ❌ Dossier non modifié

---

### Exemple 2 : Créer et finaliser en une fois

```http
POST /api/mon-nouveau-service?finalize=true
Content-Type: application/json

{
  "numDossier": 123,
  "mntMvtAva": 5000,
  "codeActivite": 23
}
```

**Réponse (succès)** :
```json
HTTP/1.1 201 Created
{
  "refOperation": 456,
  "numDossier": 123,
  "status": "A",
  "message": "Opération appliquée avec succès"
}
```

**État du système** :
- ✅ MVT créé et appliqué (status=A)
- ✅ Dossier créé/mis à jour

**Réponse (erreur)** :
```json
HTTP/1.1 201 Created
{
  "refOperation": 456,
  "numDossier": 123,
  "status": "E",
  "message": "Erreur: Lock timeout"
}
```

**État du système** :
- ✅ MVT créé (status=E)
- ❌ Dossier non modifié
- ⏳ Le scheduler retentera automatiquement dans 30s

---

### Exemple 3 : Valider un brouillon existant

```http
PUT /api/mon-nouveau-service/validation/123
```

**Réponse** :
```json
HTTP/1.1 200 OK
{
  "refOperation": 456,
  "numDossier": 123,
  "status": "A",
  "message": "Validation réussie"
}
```

**État du système** :
- ✅ MVT status I → V → A
- ✅ Dossier créé/mis à jour

---

## 🚨 Erreurs courantes et solutions

### Erreur 1 : "Lock timeout" (status E)

**Cause** : 2 threads tentent d'appliquer des MVT pour le même dossier simultanément.

**Solution** : Le scheduler retentera automatiquement. Si l'erreur persiste :
- Augmenter `spring.jpa.properties.javax.persistence.lock.timeout`
- Vérifier qu'il n'y a pas de deadlock (2 dossiers qui se bloquent mutuellement)

### Erreur 2 : MVT reste en status V pour toujours

**Cause** : `applyForDossier()` n'a pas été appelé dans `writeDossier()`.

**Solution** : Vérifier que `writeDossier()` appelle bien `dossierService.applyForDossier(numDossier)`.

### Erreur 3 : Double projection (montants doublés)

**Cause** : `applyOne()` n'est pas idempotent (manque le check `if status=A → skip`).

**Solution** : Toujours vérifier le status avant de projeter :
```java
if ("A".equals(mvt.getStatus())) {
    log.info("Déjà appliqué, skip");
    return;
}
```

### Erreur 4 : Validation métier bloquée après création MVT

**Cause** : Validations métier exécutées dans `writeDossier()` au lieu de `createMvt()`.

**Solution** : TOUTES les validations métier doivent être dans `createMvt()` (phase 1).  
`writeDossier()` (phase 2) ne doit contenir AUCUNE validation, uniquement la projection.

---

## 🎓 Résumé : Les 3 règles d'or

### Règle 1 : Séparation des phases
```
Phase 1 (createMvt)  : Validations + Sauvegarde MVT (status I)
Phase 2 (writeDossier): Projection MVT → Dossier (status V → A/E)
```

### Règle 2 : Le dossier est une projection du MVT
```
JAMAIS : dossier.update(...)
TOUJOURS : mvt.create(...) → applyForDossier() → dossier.update(...)
```

### Règle 3 : Idempotence + Récupération automatique
```
applyOne() : if status=A → skip
scheduler  : retry tous les V/E toutes les 30s
```

---

## 📚 Ressources supplémentaires

- **Code source de référence** : `OperationsDelegueesMvtServiceImpl.java`
- **Exemple complet** : `ReservationOperationServiceImpl.java` (après implémentation du pattern)
- **Documentation complète** : `DOCUMENTATION_PROJET.md`
- **Plan scheduler** : `PLAN_SCHEDULER_RATTRAPAGE.md`
- **Plan réservation** : `PLAN_RESERVATION_FINALIZE.md`

---

**Bonne implémentation ! 🚀**

