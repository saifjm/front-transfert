# 🏗️ PLAN D'IMPLÉMENTATION — Scheduler de Rattrapage + Refactoring `applyForDossier`

> **Auteur** : Senior Java Architect  
> **Date** : 2 mars 2026  
> **Objectif** : Garantir l'invariant **"Toute opération validée (V) finit appliquée (A)"**  
> **Méthode** : Scheduler de rattrapage + refactoring `applyForDossier` avec sérialisation par dossier

---

## 📊 ÉTAT ACTUEL DU CODE (Audit)

### ✅ Ce qui existe déjà et fonctionne

| Élément | Fichier | Status |
|---|---|---|
| Entité `OperationsDelegueesMvt` (MVT) | `entity/OperationsDelegueesMvt.java` | ✅ Existe |
| Entité `OperationsDeleguee` (Dossier) | `entity/OperationsDeleguee.java` | ✅ Existe |
| EmbeddedId `refOperation + dateOperation` | `entity/OperationsDelegueesMvtId.java` | ✅ Existe |
| Status MVT : I / V / A / E | Champ `status` sur l'entité | ✅ Existe |
| `create(dto, finalize)` | `OperationsDelegueesMvtServiceImpl` | ✅ Existe |
| `writeDossier(mvt)` — V → apply → A/E | `OperationsDelegueesMvtServiceImpl` | ✅ Existe |
| `applyMvtToDossier(numDossier)` | `OperationsDelegueeServiceImpl` | ✅ Existe |
| Lock pessimiste `findByIdForUpdate` | `OperationsDelegueeRepository` | ✅ Existe |
| `@EnableScheduling` | `AvaApplication.java` | ✅ Existe |
| `BusinessRulesService` (validations) | `service/BusinessRulesService.java` | ✅ Existe |
| `GlobalExceptionHandler` (400/422/500) | `exception/GlobalExceptionHandler.java` | ✅ Existe |
| Controller avec `?finalize=true/false` | `OperationsDelegueesMvtController.java` | ✅ Existe |
| MapStruct mappers (MVT → Dossier) | `mapper/OperationsDelegueeMapper.java` | ✅ Existe |

### ❌ Ce qui MANQUE (à implémenter)

| # | Élément manquant | Impact |
|---|---|---|
| 1 | **Query `findPendingOperations()`** — récupérer tous les MVT en status V ou E | Repository |
| 2 | **Query `findByNumDossierAndStatusIn()`** — MVT V/E pour un dossier donné, triés par date | Repository |
| 3 | **Méthode `applyForDossier(numDossier)`** — applique TOUTES les opérations V/E d'un dossier dans l'ordre | Service |
| 4 | **Méthode `applyOne(refOperation)`** — applique UN MVT, idempotent (si déjà A → skip) | Service |
| 5 | **Scheduler `MvtRecoveryWorker`** — rattrapage périodique des MVT V/E orphelins | Nouveau fichier |
| 6 | **Refactoring `writeDossier()`** — doit utiliser `applyForDossier` au lieu de `applyMvtToDossier` direct | Service |

### ⚠️ Problème architectural actuel

```
writeDossier(mvt)
    ├─ mvt.setStatus("V")
    ├─ operationsDelegueeService.applyMvtToDossier(numDossier)   ← applique UN SEUL MVT
    ├─ si OK → mvt.setStatus("A")
    └─ si KO → mvt.setStatus("E")                                ← reste bloqué en E, pas de retry
```

**Problèmes** :
1. `applyMvtToDossier` n'applique qu'un seul MVT — si 3 MVT sont V simultanément, seul le premier est projeté
2. Un MVT en status E n'est **jamais re-tenté** — il reste bloqué pour toujours
3. Pas de sérialisation : si 2 threads appellent `writeDossier` pour le même dossier, risque de race condition

### ✅ Architecture cible

```
writeDossier(mvt)
    ├─ mvt.setStatus("V")                      ← marque V (commit partiel si nécessaire)
    └─ applyForDossier(numDossier)              ← applique TOUTES les opérations V/E du dossier
         ├─ Lock dossier (PESSIMISTIC_WRITE)    ← sérialisation garantie
         ├─ Récupère tous les MVT V/E triés par dateOperation
         ├─ Pour chaque MVT :
         │    └─ applyOne(refOperation)         ← idempotent
         │         ├─ si déjà A → skip
         │         ├─ projette MVT → Dossier
         │         ├─ si OK → status A
         │         └─ si KO → status E (continue les suivants)
         └─ return

MvtRecoveryWorker (@Scheduled 30s)
    ├─ Récupère tous les MVT V/E (orphelins)
    ├─ Regroupe par numDossier
    └─ Pour chaque dossier : applyForDossier(numDossier)
```

---

## 🔴 QUESTION CRITIQUE : 2 MVT en même temps = faux montants ?

### Le scénario que tu soulèves

```
MVT_A (codeOp=200, ouverture) : mntAutorise=10000, mntUtilise=0
MVT_B (codeOp=200, ouverture) : mntAutorise=5000,  mntUtilise=2000

applyForDossier(123)
    applyOne(MVT_A) → dossier.mntAutorise = 10000 ✅
    applyOne(MVT_B) → dossier.mntAutorise = 5000  ❌ ÉCRASE au lieu de CUMULER
```

### Réponse : CE CAS NE PEUT PAS SE PRODUIRE pour codeOperation=200 (ouverture)

**Pourquoi ?** Parce que le contrôle `controlerCompatibiliteTypeDossier` BLOQUE la création
d'un 2ème MVT d'ouverture (codeOp=200) pour le même client/type dossier.

Vérifions le flux réel :

```
MVT_A (codeOp=200, type=3, client=1695881M) → OK, créé ✅
MVT_B (codeOp=200, type=3, client=1695881M) → BusinessException "DOSSIER_INCOMPATIBLE" ❌ BLOQUÉ
```

Le contrôle vérifie :
- OPERATIONS_DELEGUEES (dossier) : existsByNoPieceClientAndCodeTypeDosAvaIn
- OPERATIONS_DELEGUEES_MVT : existsByNoPieceClientAndCodeTypeDosAvaIn (controlerCompatibiliteTypeDossierMvt)

**Donc il est IMPOSSIBLE d'avoir 2 ouvertures (codeOp=200) pour le même dossier.**

### MAIS : quand d'autres codeOperation existeront (avenant, modification, clôture)

Quand tu auras des opérations de type :
- `codeOp=201` = Avenant (modifier montant autorisé)
- `codeOp=202` = Utilisation (augmenter mntUtilisé)
- `codeOp=203` = Clôture

Là, le problème de **cumul vs écrasement** deviendra RÉEL.

### La solution : `applyOne` doit être différencié par codeOperation

```
applyOne(mvt) {
    switch (mvt.codeOperation) {
        case 200: // OUVERTURE → ÉCRASEMENT TOTAL (projection complète)
            dossier = mapper.fromMvt(mvt);  // ← ce qui existe aujourd'hui

        case 201: // AVENANT → MISE À JOUR PARTIELLE
            dossier.mntAutorise += mvt.mntMvtAva;
            recalculSolde();

        case 202: // UTILISATION → CUMUL
            dossier.mntUtilise += mvt.mntMvtAva;
            recalculSolde();

        case 203: // CLÔTURE → ÉTAT FINAL
            dossier.etatDossier = "C";
    }
}
```

### Conclusion pour AUJOURD'HUI (codeOp=200 uniquement)

| Question | Réponse |
|---|---|
| 2 ouvertures en même temps ? | ❌ IMPOSSIBLE — bloqué par compatibilité type dossier |
| Le plan est-il correct ? | ✅ OUI pour codeOp=200 |
| Faut-il changer quelque chose ? | ❌ NON pour l'instant |
| Quand faudra-t-il changer ? | Quand on ajoutera d'autres codeOperation (201, 202, etc.) |
| Que faudra-t-il changer ? | `applyOne` devra différencier le comportement par codeOperation |

### Résumé visuel

```
AUJOURD'HUI (codeOp=200 seul) :
================================
Client X → MVT ouverture A → dossier créé → OK
Client X → MVT ouverture B → BLOQUÉ par contrôle compatibilité ❌
→ UN SEUL MVT par dossier → PAS de problème de montants

DEMAIN (multi codeOperation) :
================================
Client X → MVT ouverture (200) → dossier créé, mntAutorise=10000
Client X → MVT avenant   (201) → dossier.mntAutorise += 5000 = 15000
Client X → MVT utilisation(202) → dossier.mntUtilise += 3000
→ applyOne DOIT cumuler selon le type → à implémenter quand nécessaire
```

---

## 📝 PLAN DÉTAILLÉ FICHIER PAR FICHIER

---

### ÉTAPE 1 — Repository : ajouter les queries manquantes

**Fichier** : `repository/OperationsDelegueeMvtRepository.java`

**Ajouts** :

```java
/**
 * Récupère tous les MVT en status V ou E (opérations en attente d'application).
 * Utilisé par le scheduler de rattrapage.
 */
@Query("SELECT o FROM OperationsDelegueesMvt o WHERE o.status IN :statuses ORDER BY o.id.dateOperation ASC, o.id.refOperation ASC")
List<OperationsDelegueesMvt> findByStatusIn(@Param("statuses") List<String> statuses);

/**
 * Récupère tous les MVT V ou E pour un dossier donné, triés par date chronologique.
 * Utilisé par applyForDossier pour appliquer dans l'ordre.
 */
@Query("SELECT o FROM OperationsDelegueesMvt o WHERE o.numDossier = :numDossier AND o.status IN :statuses ORDER BY o.id.dateOperation ASC, o.id.refOperation ASC")
List<OperationsDelegueesMvt> findByNumDossierAndStatusInOrderByDateOperation(
        @Param("numDossier") Integer numDossier,
        @Param("statuses") List<String> statuses);
```

**Risque** : 🟢 Faible — ajout de queries, aucun impact sur l'existant

---

### ÉTAPE 2 — Service Dossier : ajouter `applyForDossier` + `applyOne`

**Fichier** : `service/OperationsDelegueeService.java` (interface)

**Ajouts** :

```java
/**
 * Applique TOUTES les opérations V/E d'un dossier dans l'ordre chronologique.
 * Lock pessimiste sur le dossier → sérialisation garantie.
 * Chaque MVT est appliqué via applyOne (idempotent).
 */
void applyForDossier(Integer numDossier);

/**
 * Applique UN mouvement au dossier. Idempotent : si déjà A → skip.
 * Projette MVT → Dossier + relations + recalcul solde.
 * Si succès → status A. Si erreur → status E.
 */
void applyOne(Long refOperation);
```

---

### ÉTAPE 3 — Service Dossier : implémenter `applyForDossier` + `applyOne`

**Fichier** : `service/impl/OperationsDelegueeServiceImpl.java`

**`applyForDossier(numDossier)`** :
```
1. Lock le dossier via findByIdForUpdate(numDossier)
   (si dossier n'existe pas encore → pas de lock, il sera créé par applyOne)
2. Récupérer tous les MVT en status V ou E pour ce numDossier, triés par dateOperation ASC
3. Pour chaque MVT → appeler applyOne(refOperation)
4. Log le résultat
```

**`applyOne(refOperation)`** :
```
1. Charger le MVT par refOperation
2. IDEMPOTENCE : si mvt.status == "A" → skip (déjà appliqué)
3. Charger les relations (bénéficiaires, documents, marché)
4. Mapper MVT → Dossier
5. Calculer solde
6. Si dossier existe → UPDATE (lock déjà acquis par applyForDossier)
   Si dossier n'existe pas → INSERT (EntityManager.persist)
7. Projeter les relations (bénéf, docs, marché)
8. Si succès → mvt.status = "A", mvt.etatDossier = "V"
9. Si erreur → mvt.status = "E" (ne PAS lever d'exception, log et continue)
```

**Différence avec `applyMvtToDossier` existant** :
- `applyOne` est **idempotent** (check status A)
- `applyOne` ne lance **pas** d'exception en cas d'erreur → marque E et continue
- `applyOne` travaille par **refOperation** (pas par numDossier)
- `applyMvtToDossier` existant est CONSERVÉ pour backward compat mais pourrait déléguer à `applyOne`

**Risque** : 🟡 Moyen — code métier, mais logique identique à `applyMvtToDossier` existant

---

### ÉTAPE 4 — Refactorer `writeDossier` pour utiliser `applyForDossier`

**Fichier** : `service/impl/OperationsDelegueesMvtServiceImpl.java`

**Avant** :
```java
private OperationCreationResponseDTO writeDossier(OperationsDelegueesMvt mvt) {
    mvt.setStatus("V");
    mvt.setDateValidation(now);
    save(mvt);
    
    try {
        operationsDelegueeService.applyMvtToDossier(numDossier);  // ← UN SEUL MVT
        mvt.setStatus("A");
    } catch (Exception e) {
        mvt.setStatus("E");                                        // ← bloqué en E
    }
}
```

**Après** :
```java
private OperationCreationResponseDTO writeDossier(OperationsDelegueesMvt mvt) {
    mvt.setStatus("V");
    mvt.setDateValidation(now);
    save(mvt);
    
    // Applique TOUTES les opérations V/E du dossier (y compris celle-ci)
    // → sérialisation par lock pessimiste
    // → idempotent (si déjà A → skip)
    // → retry des E précédents
    operationsDelegueeService.applyForDossier(numDossier);
    
    // Recharger pour vérifier le status final
    mvt = reload(mvt);
    return new OperationCreationResponseDTO(refOp, numDossier, mvt.getStatus(), ...);
}
```

**Avantages** :
- Applique TOUTES les opérations en attente (pas une seule)
- Retry automatique des E précédents
- Lock pessimiste → pas de race condition
- Le status final (A ou E) est déterminé par `applyOne` dans `applyForDossier`

**Risque** : 🟡 Moyen — refactoring du flux existant, mais le comportement est identique + amélioré

---

### ÉTAPE 5 — Créer le scheduler `MvtRecoveryWorker`

**Nouveau fichier** : `service/impl/MvtRecoveryWorker.java`

```java
@Component
@Slf4j
public class MvtRecoveryWorker {

    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeService dossierService;

    /**
     * Scheduler de rattrapage.
     * Garantit l'invariant : "Toute opération validée finit appliquée"
     * 
     * Exécution : toutes les 30 secondes
     * 
     * Logique :
     * 1. Récupère tous les MVT en status V ou E
     * 2. Regroupe par numDossier
     * 3. Pour chaque dossier → applyForDossier(numDossier)
     *    - Lock pessimiste → pas de conflit avec les requêtes HTTP
     *    - Idempotent → si déjà appliqué, skip
     *    - Retry → les E sont re-tentés
     */
    @Scheduled(fixedDelay = 30_000)
    public void recoverPendingOperations() {
        List<OperationsDelegueesMvt> pending = mvtRepository.findByStatusIn(List.of("V", "E"));
        
        if (pending.isEmpty()) return;
        
        // Regrouper par numDossier
        Map<Integer, List<OperationsDelegueesMvt>> byDossier = pending.stream()
                .collect(Collectors.groupingBy(OperationsDelegueesMvt::getNumDossier));
        
        for (Integer numDossier : byDossier.keySet()) {
            try {
                dossierService.applyForDossier(numDossier);
            } catch (Exception e) {
                log.error("[RECOVERY] Erreur pour numDossier={}: {}", numDossier, e.getMessage());
                // Continue avec les autres dossiers
            }
        }
    }
}
```

**Risque** : 🟢 Faible — nouveau fichier, aucun impact sur l'existant

---

## 🔄 FLUX COMPLETS APRÈS REFACTORING

### CAS 1 : `POST /initialisation?finalize=false` (Brouillon)

```
Controller → service.create(dto, false)
    └─ Insert MVT status=I
    └─ Return {refOp, numDossier, status:"I"}
    
    ❌ Aucun impact dossier
    ❌ Le scheduler IGNORE les status I
```

### CAS 2 : `POST /initialisation?finalize=true` (Create + Finalize)

```
Controller → service.create(dto, true)
    ├─ Phase 1: Insert MVT status=I + validations + relations
    └─ Phase 2: writeDossier(mvt)
         ├─ mvt.status = "V"
         └─ dossierService.applyForDossier(numDossier)
              ├─ Lock dossier (PESSIMISTIC_WRITE)
              ├─ Récupère tous MVT V/E pour ce dossier
              └─ Pour chaque MVT → applyOne(refOp)
                   ├─ si A → skip (idempotent)
                   ├─ projette → dossier
                   ├─ si OK → status A ✅
                   └─ si KO → status E ⚠️
         
    Return {refOp, numDossier, status: "A" ou "E"}
```

### CAS 3 : MVT en erreur (E) → Rattrapage automatique

```
MvtRecoveryWorker (@Scheduled 30s)
    ├─ SELECT * FROM MVT WHERE status IN ('V', 'E')
    ├─ Regroupe par numDossier
    └─ Pour chaque dossier → applyForDossier(numDossier)
         ├─ Lock dossier
         ├─ Récupère MVT V/E triés
         └─ Pour chaque MVT → applyOne(refOp)
              ├─ si A → skip
              ├─ retry projection
              ├─ si OK cette fois → A ✅
              └─ si KO encore → reste E (sera re-tenté dans 30s)
```

### CAS 4 : Validations parallèles (2 MVT finalize=true en même temps)

```
Thread 1: writeDossier(mvt_A)              Thread 2: writeDossier(mvt_B)
    ├─ mvt_A.status = V                        ├─ mvt_B.status = V
    └─ applyForDossier(123)                    └─ applyForDossier(123)
         ├─ Lock dossier 123 ← ACQUIS              ├─ Lock dossier 123 ← ATTEND...
         ├─ applyOne(mvt_A) → A                    │
         ├─ applyOne(mvt_B) → A                    │ (bloqué par le lock)
         └─ Libère lock                             │
                                                    ├─ Lock acquis
                                                    ├─ applyOne(mvt_A) → skip (déjà A)
                                                    ├─ applyOne(mvt_B) → skip (déjà A)
                                                    └─ Libère lock (rien à faire)
    
    ✅ Cohérence garantie par lock + idempotence
```

---

## 📊 MATRICE D'IMPACT

| # | Fichier | Action | Lignes | Risque |
|---|---|---|---|---|
| 1 | `repository/OperationsDelegueeMvtRepository.java` | MODIFIER — ajouter 2 queries | ~15 | 🟢 |
| 2 | `service/OperationsDelegueeService.java` | MODIFIER — ajouter 2 signatures | ~10 | 🟢 |
| 3 | `service/impl/OperationsDelegueeServiceImpl.java` | MODIFIER — implémenter `applyForDossier` + `applyOne` | ~100 | 🟡 |
| 4 | `service/impl/OperationsDelegueesMvtServiceImpl.java` | MODIFIER — refactorer `writeDossier` | ~30 | 🟡 |
| 5 | `service/impl/MvtRecoveryWorker.java` | **CRÉER** — scheduler de rattrapage | ~60 | 🟢 |

**Total** : ~215 lignes de delta, 4 fichiers modifiés + 1 nouveau fichier.

---

## ⚙️ GARANTIES

| Garantie | Mécanisme |
|---|---|
| **Toute opération validée finit appliquée** | Scheduler toutes les 30s retry les V et E |
| **Sérialisation par dossier** | `@Lock(PESSIMISTIC_WRITE)` sur `findByIdForUpdate` |
| **Idempotence** | `applyOne` : si MVT déjà status A → skip |
| **Retry automatique** | Scheduler reprend les E à chaque exécution |
| **Pas de corruption** | Lock pessimiste empêche 2 threads de modifier le même dossier |
| **Ordre chronologique** | `ORDER BY dateOperation ASC, refOperation ASC` |
| **Pas d'outbox** | Le scheduler lit directement la table MVT |
| **Backward compat** | `applyMvtToDossier` existant reste fonctionnel |

---

## 🚀 ORDRE D'EXÉCUTION

```
Étape 1 → OperationsDelegueeMvtRepository.java     (queries)
Étape 2 → OperationsDelegueeService.java            (signatures)
Étape 3 → OperationsDelegueeServiceImpl.java        (applyForDossier + applyOne)
Étape 4 → OperationsDelegueesMvtServiceImpl.java    (refactoring writeDossier)
Étape 5 → MvtRecoveryWorker.java                    (scheduler)
```

---

## ✅ VALIDATION

**Si ce plan est validé, je procède à l'implémentation dans cet ordre exact.**

> **Répondez "GO" pour lancer l'implémentation.**

