# 🎯 Guide Simplifié : Comprendre et Implémenter le Pattern "Finalize"

> **Date** : 3 mars 2026  
> **Objectif** : Comprendre comment fonctionne le mécanisme "finalize" dans AVA et l'implémenter dans vos nouveaux services

---

## 📚 Table des matières

1. [Qu'est-ce que le pattern "Finalize" ?](#1-quest-ce-que-le-pattern-finalize-)
2. [Comment fonctionne le "Finalize" dans AVA ?](#2-comment-fonctionne-le-finalize-dans-ava-)
3. [Les 4 statuts d'un mouvement](#3-les-4-statuts-dun-mouvement)
4. [Architecture du pattern](#4-architecture-du-pattern)
5. [Implémentation étape par étape](#5-implémentation-étape-par-étape)
6. [Exemple concret : FV (Frais de Voyage)](#6-exemple-concret--fv-frais-de-voyage)
7. [Checklist d'implémentation](#7-checklist-dimplémentation)

---

## 1. Qu'est-ce que le pattern "Finalize" ?

### 🎯 Le concept en une phrase

> **Le pattern "finalize" sépare la création d'un mouvement (brouillon) de son application au dossier (finalisation).**

### 🔄 Les 2 phases

```
Phase 1 : CRÉATION (Brouillon)
├─ Créer un mouvement (MVT) avec status "I" (Initial)
├─ Exécuter toutes les validations métier
├─ Sauvegarder le mouvement et ses relations
└─ ❌ AUCUN impact sur le dossier réel

Phase 2 : FINALISATION (Application)
├─ Marquer le mouvement comme "V" (Validé)
├─ Projeter le mouvement sur le dossier (création ou mise à jour)
├─ Si succès → status "A" (Appliqué)
└─ Si échec → status "E" (Erreur, sera retenté automatiquement)
```

### ✅ Pourquoi ce pattern ?

| Avantage | Explication |
|----------|-------------|
| **Séparation des responsabilités** | Créer ≠ Appliquer → code plus clair et maintenable |
| **Traçabilité totale** | Tous les mouvements (même non appliqués) sont conservés |
| **Flexibilité** | Possibilité de créer un brouillon et le valider plus tard |
| **Récupération automatique** | Un scheduler retente les opérations en erreur (status "E") |
| **Cohérence garantie** | Lock pessimiste empêche les conflits concurrents |

### ⚠️ Règle d'or

> **On ne modifie JAMAIS le dossier directement. Le dossier est TOUJOURS mis à jour via un mouvement validé.**

---

## 2. Comment fonctionne le "Finalize" dans AVA ?

### 📍 Les 2 modes d'utilisation

#### Mode 1 : Création en 2 étapes (`finalize=false`)

```http
# Étape 1 : Créer un brouillon
POST /api/operations-deleguees-mvt/initialisation?finalize=false
→ Status MVT : I (brouillon)
→ Aucun impact sur le dossier
→ Response : { "refOperation": 123, "status": "I" }

# Étape 2 : Valider le brouillon (plus tard)
PUT /api/operations-deleguees/validation/{numDossier}
→ Status MVT : V → A (appliqué au dossier)
→ Response : { "refOperation": 123, "status": "A" }
```

**Cas d'usage** : Workflows avec validation humaine, brouillons modifiables

#### Mode 2 : Création en 1 étape (`finalize=true`)

```http
POST /api/operations-deleguees-mvt/initialisation?finalize=true
→ Status MVT : I → V → A (tout en une transaction)
→ Dossier créé/mis à jour immédiatement
→ Response : { "refOperation": 123, "status": "A" }
```

**Cas d'usage** : API publiques, intégrations automatiques, pas besoin de brouillon

---

## 3. Les 4 statuts d'un mouvement

| Status | Signification | Quand | Action suivante |
|--------|--------------|-------|-----------------|
| **I** | Initial (Brouillon) | Mouvement créé mais pas encore validé | Peut être validé manuellement ou via `finalize=true` |
| **V** | Validé | Validations métier passées, prêt à être appliqué | Sera appliqué au dossier (devient "A" ou "E") |
| **A** | Appliqué (Final) | Mouvement projeté avec succès sur le dossier | **État final** — rien à faire |
| **E** | Erreur | L'application au dossier a échoué | **Retenté** automatiquement par le scheduler |

### 📊 Diagramme de flux

```
┌──────────┐
│ Status I │ ← Mouvement créé (brouillon)
└────┬─────┘
     │
     │ finalize=true OU PUT /validation
     ▼
┌──────────┐
│ Status V │ ← Marqué comme validé
└────┬─────┘
     │
     │ applyForDossier() avec lock pessimiste
     ▼
┌──────────────────┐
│ Status A ou E    │
└──────────────────┘
     │
     │ Si E → Scheduler retente toutes les 30s
     ▼
┌──────────┐
│ Status A │ ← Mouvement appliqué (FINAL)
└──────────┘
```

---

## 4. Architecture du pattern

### 🏗️ Structure des fichiers

```
controller/
└── MonServiceController.java
      └── POST /mon-service?finalize={true|false}
           └── service.create(dto, finalize)

service/
├── MonService.java (interface)
│    └── OperationCreationResponseDTO create(DTO dto, boolean finalize)
│
└── impl/
    ├── MonServiceImpl.java
    │    ├── create(dto, finalize)           ← Point d'entrée
    │    │    ├── Phase 1: createMvt(dto)    ← Crée MVT status=I + validations
    │    │    └── Phase 2: writeDossier(mvt) ← Applique au dossier (V → A/E)
    │    │
    │    ├── createMvt(dto)                  ← Logique de création
    │    └── writeDossier(mvt)               ← Logique d'application
    │
    └── OperationsDelegueeServiceImpl.java  ← Service partagé
         └── applyForDossier(numDossier)     ← Applique TOUS les MVT V/E
              └── applyOne(refOperation)     ← Applique UN MVT (idempotent)
```

### 🔄 Flux détaillé

```
1. Controller reçoit la requête
   ↓
2. service.create(dto, finalize)
   ↓
3. createMvt(dto)
   ├─ Générer refOperation (séquence)
   ├─ Générer numDossier (si absent)
   ├─ Status = "I"
   ├─ Exécuter validations métier
   ├─ Calculer solde
   └─ Sauvegarder MVT + relations
   ↓
4. Si finalize=false → Return { status: "I" }
   ↓
5. Si finalize=true → writeDossier(mvt)
   ├─ mvt.status = "V"
   ├─ dossierService.applyForDossier(numDossier)
   │   ├─ Lock dossier (PESSIMISTIC_WRITE)
   │   ├─ Récupérer tous MVT V/E triés par date
   │   └─ Pour chaque → applyOne(refOperation)
   │        ├─ Si status=A → skip (idempotent)
   │        ├─ Mapper MVT → Dossier
   │        ├─ Calculer solde
   │        ├─ Projeter relations
   │        └─ Status = "A" (succès) ou "E" (échec)
   │
   └─ Return { status: "A" ou "E" }
```

---

## 5. Implémentation étape par étape

### Étape 1 : Controller (aucune logique métier)

```java
@RestController
@RequestMapping("/api/mon-service")
@RequiredArgsConstructor
public class MonServiceController {
    
    private final MonService service;
    
    @PostMapping
    public ResponseEntity<OperationCreationResponseDTO> create(
            @Valid @RequestBody MonServiceDTO dto,
            @RequestParam(name = "finalize", defaultValue = "false") boolean finalize) {
        
        // ✅ Aucune logique, juste déléguer au service
        OperationCreationResponseDTO response = service.create(dto, finalize);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

**Points clés** :
- ✅ Paramètre `@RequestParam("finalize")` avec `defaultValue="false"`
- ✅ Déléguer directement au service
- ✅ Retourner HTTP 201 Created

---

### Étape 2 : Service Interface

```java
public interface MonService {
    
    /**
     * Crée un mouvement.
     * Si finalize=false → status I (brouillon)
     * Si finalize=true → status I → V → A/E (application au dossier)
     */
    OperationCreationResponseDTO create(MonServiceDTO dto, boolean finalize);
}
```

---

### Étape 3 : Service Implémentation

```java
@Service
@Slf4j
@Transactional
@RequiredArgsConstructor
public class MonServiceImpl implements MonService {
    
    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeService dossierService;
    private final BusinessRulesService businessRulesService;
    
    // ═══════════════════════════════════════════════════════════
    // POINT D'ENTRÉE PRINCIPAL
    // ═══════════════════════════════════════════════════════════
    
    @Override
    public OperationCreationResponseDTO create(MonServiceDTO dto, boolean finalize) {
        log.info("[MonService] Début création, finalize={}", finalize);
        
        // PHASE 1 : Créer le mouvement (status I) + validations
        OperationsDelegueesMvt mvt = createMvt(dto);
        
        // PHASE 2 : Si finalize=true, appliquer au dossier
        if (!finalize) {
            log.info("[MonService] Mouvement créé en brouillon (status I)");
            return new OperationCreationResponseDTO(
                mvt.getId().getRefOperation(),
                mvt.getNumDossier(),
                "I",
                null
            );
        }
        
        return writeDossier(mvt);
    }
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 1 : Créer le mouvement (status I)
    // ═══════════════════════════════════════════════════════════
    
    private OperationsDelegueesMvt createMvt(MonServiceDTO dto) {
        LocalDate now = LocalDate.now();
        
        // 1. Générer refOperation (séquence Oracle)
        Long refOperation = mvtRepository.getNextRefOperation();
        log.info("[createMvt] refOperation généré : {}", refOperation);
        
        // 2. Générer numDossier si absent
        Integer numDossier = dto.getNumDossier();
        if (numDossier == null) {
            numDossier = generateNumDossier(now);
        }
        
        // 3. Construire l'entité MVT
        OperationsDelegueesMvt entity = buildMvtEntity(dto, refOperation, now, numDossier);
        
        // 4. Exécuter TOUTES les validations métier (bloquantes)
        validateAll(dto, entity);
        
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
        
        // 6. Sauvegarder le MVT
        OperationsDelegueesMvt saved = mvtRepository.save(entity);
        log.info("[createMvt] Mouvement sauvegardé : refOperation={}, status={}", 
                saved.getId().getRefOperation(), saved.getStatus());
        
        // 7. Sauvegarder les relations (bénéficiaires, documents, marché...)
        saveBeneficiaires(dto, saved);
        saveDocuments(dto, saved);
        saveMarche(dto, saved);
        
        return saved;
    }
    
    /**
     * Construit l'entité OperationsDelegueesMvt à partir du DTO.
     */
    private OperationsDelegueesMvt buildMvtEntity(MonServiceDTO dto, Long refOperation, 
                                                   LocalDate now, Integer numDossier) {
        OperationsDelegueesMvt entity = new OperationsDelegueesMvt();
        
        // ID composite
        OperationsDelegueesMvtId id = new OperationsDelegueesMvtId();
        id.setRefOperation(refOperation);
        id.setDateOperation(now);
        entity.setId(id);
        
        // Informations dossier
        entity.setNumDossier(numDossier);
        entity.setDateDossier(now);
        entity.setCodeOperation(250);  // ← Code spécifique à votre opération
        entity.setCodeProduitService(108);
        
        // Status
        entity.setStatus("I");  // ← BROUILLON
        entity.setEtatDossier("X");  // ← En cours
        
        // Mapper les autres champs du DTO...
        // entity.setMntMvtAva(dto.getMontant());
        // ...
        
        return entity;
    }
    
    /**
     * Exécute TOUTES les validations métier (bloquantes).
     */
    private void validateAll(MonServiceDTO dto, OperationsDelegueesMvt entity) {
        log.info("[validateAll] Début validations métier");
        
        // Exemple de validations
        // validateEtatDossier(dossier);
        // validateCompteRib(dto.getCompteRib());
        // validateFinancial(dto, dossier);
        // ...
        
        log.info("[validateAll] Toutes les validations passées");
    }
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 2 : Validation et application au dossier
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Marque le mouvement comme validé (V) et applique au dossier.
     * Status final : A (appliqué) ou E (erreur).
     */
    private OperationCreationResponseDTO writeDossier(OperationsDelegueesMvt mvt) {
        LocalDate now = LocalDate.now();
        Long refOperation = mvt.getId().getRefOperation();
        Integer numDossier = mvt.getNumDossier();
        
        log.info("[writeDossier] Début application au dossier pour refOperation={}", refOperation);
        
        // 1. Marquer comme VALIDÉ
        mvt.setStatus("V");
        mvt.setDateValidation(now);
        mvtRepository.save(mvt);
        
        log.info("[writeDossier] Mouvement marqué 'V' (Validé)");
        
        // 2. Appliquer TOUS les MVT V/E de ce dossier
        //    (lock pessimiste + idempotence + retry des erreurs)
        try {
            dossierService.applyForDossier(numDossier);
            
            // 3. Recharger le MVT pour vérifier le status final
            mvt = mvtRepository.findByIdRefOperation(refOperation)
                    .stream()
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("MVT_NOT_FOUND",
                        "Mouvement introuvable : refOperation=" + refOperation));
            
            // 4. Retourner le résultat
            if ("A".equals(mvt.getStatus())) {
                log.info("[writeDossier] Opération appliquée avec succès (status=A)");
                return new OperationCreationResponseDTO(
                    refOperation,
                    numDossier,
                    "A",
                    "Opération appliquée avec succès"
                );
            } else {
                log.warn("[writeDossier] Opération en erreur (status=E)");
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
    
    private void saveBeneficiaires(MonServiceDTO dto, OperationsDelegueesMvt mvt) {
        // ... logique de sauvegarde
    }
    
    private void saveDocuments(MonServiceDTO dto, OperationsDelegueesMvt mvt) {
        // ... logique de sauvegarde
    }
    
    private void saveMarche(MonServiceDTO dto, OperationsDelegueesMvt mvt) {
        // ... logique de sauvegarde
    }
}
```

---

## 6. Exemple concret : FV (Frais de Voyage)

Le système FV est **déjà implémenté** avec le pattern finalize dans `OperationFVServiceImpl.java`.

### 📁 Documentation FV

**Fichier** : `BusinessRulesFV_Recreation_Guide.md`

### 🔍 Comment le FV utilise le pattern finalize

```java
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OperationFVServiceImpl implements OperationFVService {
    
    @Override
    public OperationCreationResponseDTO create(OperationFVDTO dto, boolean finalize) {
        // PHASE 1 : Créer le MVT (status I)
        OperationsDelegueesMvt mvt = createMvt(dto);
        
        // PHASE 2 : Si finalize=true, appliquer au dossier
        if (!finalize) {
            return new OperationCreationResponseDTO(
                mvt.getId().getRefOperation(),
                mvt.getNumDossier(),
                "I",
                null
            );
        }
        
        return writeDossier(mvt);
    }
    
    private OperationsDelegueesMvt createMvt(OperationFVDTO dto) {
        // 1. Générer refOperation
        Long refOperation = mvtRepository.getNextRefOperation();
        
        // 2. Récupérer le dossier existant
        OperationsDeleguee dossier = dossierRepository.findById(dto.getDossier().getNumeroDossier())
                .orElseThrow(...);
        
        // 3. Enrichir le DTO avec les données du dossier
        enrichDTOFromDossier(dto, dossier);
        
        // 4. Exécuter TOUTES les validations métier
        validateAll(dto, dossier);
        
        // 5. Construire l'entité MVT
        OperationsDelegueesMvt entity = buildMvtEntity(dto, dossier, refOperation, now);
        
        // 6. Sauvegarder le MVT
        return mvtRepository.save(entity);
    }
    
    private OperationCreationResponseDTO writeDossier(OperationsDelegueesMvt mvt) {
        // 1. Marquer comme VALIDÉ
        mvt.setStatus("V");
        mvt.setDateValidation(LocalDate.now());
        mvtRepository.save(mvt);
        
        // 2. Appliquer au dossier
        try {
            dossierService.applyForDossier(mvt.getNumDossier());
            
            // 3. Recharger et vérifier status final
            mvt = mvtRepository.findByIdRefOperation(refOperation).get(0);
            
            if ("A".equals(mvt.getStatus())) {
                return new OperationCreationResponseDTO(..., "A", "Succès");
            } else {
                return new OperationCreationResponseDTO(..., "E", "Erreur");
            }
        } catch (Exception e) {
            mvt.setStatus("E");
            mvtRepository.save(mvt);
            return new OperationCreationResponseDTO(..., "E", e.getMessage());
        }
    }
}
```

### 🎯 Validations métier FV

Le FV exécute ces validations dans `createMvt()` :

1. **État du dossier** : Doit être exactement 'V' (Valide)
2. **Compte RIB** : Doit contenir exactement 20 chiffres
3. **Devise** : Doit exister (via API externe)
4. **Validation financière** : Montant demandé ≤ Solde disponible
5. **Mode de paiement** : BB, CH, TC limités à 30 000 TND
6. **Dates de voyage** : Date départ < Date retour
7. **Bénéficiaire** : Doit exister dans la table BENEFICIAIRE

### 📝 Endpoints FV

```http
# Créer un brouillon
POST /api/operations-fv?finalize=false

# Créer et finaliser
POST /api/operations-fv?finalize=true

# Valider un brouillon existant
PUT /api/operations-fv/validate/{refOperation}
```

---

## 7. Checklist d'implémentation

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

- [ ] Méthode `applyForDossier(numDossier)` existe déjà dans `OperationsDelegueeServiceImpl`
- [ ] Méthode `applyOne(refOperation)` existe déjà
- [ ] Si nouveau `codeOperation`, ajouter un `case` dans `applyMvtToDossier()`

---

## 🎓 Résumé : Les 3 règles d'or

### Règle 1 : Séparation des phases

```
Phase 1 (createMvt)  : Validations + Sauvegarde MVT (status I)
Phase 2 (writeDossier): Projection MVT → Dossier (status V → A/E)
```

### Règle 2 : Le dossier est une projection du MVT

```
❌ JAMAIS : dossier.update(...)
✅ TOUJOURS : mvt.create(...) → applyForDossier() → dossier.update(...)
```

### Règle 3 : Idempotence + Récupération automatique

```
applyOne() : if status=A → skip
scheduler  : retry tous les V/E toutes les 30s
```

---

## 📚 Fichiers de référence

| Fichier | Description |
|---------|-------------|
| `GUIDE_FINALIZE_IMPLEMENTATION.md` | Guide complet avec tous les détails techniques |
| `BusinessRulesFV_Recreation_Guide.md` | Documentation du système FV (exemple implémenté) |
| `PLAN_RESERVATION_FINALIZE.md` | Plan d'implémentation pour les réservations |
| `DOCUMENTATION_PROJET.md` | Documentation complète du projet AVA |
| `OperationFVServiceImpl.java` | **Exemple concret** d'implémentation du pattern |

---

**Bonne implémentation ! 🚀**

