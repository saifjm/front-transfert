# BusinessRules_Suspension Module — Recreation & Integration Guide

This guide provides everything you need to recreate the **Suspension de Dossier** module and integrate it into another Spring Boot project.

---

## 1. What Is the Module?

The **Suspension** module blocks an active AVA dossier by changing its state from `'V'` (Valide) to `'B'` (Bloqué). It is triggered when the bank identifies an issue with the exporter's compliance status.

Once suspended, no new operations (rapatriement, alimentation BCT, etc.) can be applied to the dossier until a levée de suspension is performed.

---

## 2. Module Architecture Overview

| Layer | Component | Responsibility |
| :--- | :--- | :--- |
| **API** | `SuspensionController` | `POST /api/suspension/{Finalize}` |
| **Service** | `OperationsDelegueeServiceImpl` | `suspensionDossier(dto, finalizeFlag)` |
| **Repository** | `OperationsDelegueeRepository` | `findByIdForUpdate(numDossier)` — pessimistic lock |
| **Repository** | `OperationsDelegueeMvtRepository` | `getNextRefOperation()`, INSERT MVT |
| **Entity** | `OperationsDeleguee` | UPDATE : `ETAT_DOSSIER='B'`, `CODE_ETAT`, `MOTIF_ETAT`, `DATE_ETAT` |
| **Entity** | `OperationsDelegueesMvt` | INSERT Audit |

---

## 3. DTOs

### `SuspensionDTO` (corps de la requête)

```java
public class SuspensionDTO {
    @NotNull
    private Long numDossier;    // required — numéro du dossier à suspendre

    @NotNull
    @Min(1) @Max(99)
    private Short codeEtat;     // required — code motif de suspension

    private String motifEtat;   // conditionnel — obligatoire si codeEtat = 99
}
```

---

## 4. Codes Motif de Suspension (`codeEtat`)

| `codeEtat` | Libellé |
| :--- | :--- |
| `1` | DEPASSEMENT DU MONTANT AUTORISE |
| `2` | DECLARATION FISCALE NON PRESENTEE |
| `3` | TOTAL IMPORTATIONS INSUFFISANT |
| `4` | DOSSIER NON RENOUVELE |
| `99` | AUTRE MOTIF (`motifEtat` obligatoire) |

> Toute autre valeur de `codeEtat` est rejetée avec une erreur de validation.

---

## 5. Business Logic — `suspensionDossier`

### Workflow complet

```
[1] Récupérer dossier → findByIdForUpdate(numDossier) — lock pessimiste
[2] Vérifier que dossier existe → sinon ResourceNotFoundException
[3] Vérifier etatDossier == 'V' → sinon erreur métier ("Dossier non actif")
[4] Vérifier codeEtat ∈ {1, 2, 3, 4, 99} → sinon erreur métier
[5] Si codeEtat == 99 → vérifier motifEtat non null/vide → sinon erreur métier

         ↓ FINALIZE = TRUE
[6] Appliquer suspension :
    - dossier.setEtatDossier("B")
    - dossier.setCodeEtat(dto.codeEtat)
    - dossier.setMotifEtat(dto.motifEtat)
    - dossier.setDateEtat(LocalDate.now())
[7] Sauvegarder dossier
[8] Créer mouvement : createSuspensionMovement(dossier, "A", dto)
[9] Retourner OuvertureDossierDTO via buildSuspensionResultDTO()

         ↓ FINALIZE = FALSE
[6] Créer mouvement : createSuspensionMovement(dossier, "X", dto)
[7] Retourner OuvertureDossierDTO minimal (numDossier)
```

### Pre-condition obligatoire : `etatDossier = 'V'`

```
'V' (Valide)  → Suspension autorisée → suite normale
'B' (Bloqué)  → Erreur : "Dossier déjà suspendu"
Autre état    → Erreur métier
```

### Création du Mouvement (`createSuspensionMovement`)

```java
private void createSuspensionMovement(OperationsDeleguee dossier, String status, SuspensionDTO dto) {
    Long refOperation = operationsMvtRepository.getNextRefOperation();
    OperationsDelegueesMvt mvt = new OperationsDelegueesMvt();
    // copier champs du dossier dans le mvt
    mvt.setCodeEtat(dto.getCodeEtat());
    mvt.setMotifEtat(dto.getMotifEtat());
    mvt.setEtatDossier("B"); // état après suspension
    mvt.setStatus(status);   // "A" ou "X"
    operationsMvtRepository.save(mvt);
    if ("A".equals(status)) {
        dossier.setDernierNumMvtAva(newNumMvtAva);
        operationsDelegueeRepository.save(dossier);
    }
}
```

---

## 6. API Endpoints

### `SuspensionController` (`/api/suspension`)

| Method | Endpoint | `Finalize` | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/suspension/true` | `true` | Suspend le dossier + MVT `status='A'` |
| `POST` | `/api/suspension/false` | `false` | MVT `status='X'` uniquement (brouillon) |

**Réponse HTTP** : `200 OK` avec `OuvertureDossierDTO`.

---

## 7. Validation Rules (synthèse)

| Champ | Source | Règle | Exception |
| :--- | :--- | :--- | :--- |
| `numDossier` | DTO | Obligatoire (`@NotNull`) | 400 |
| `numDossier` | BD | Dossier doit exister | `ResourceNotFoundException` |
| `etatDossier` | BD | Doit être `'V'` | Business Exception |
| `codeEtat` | DTO | Obligatoire + ∈ {1, 2, 3, 4, 99} | 400 |
| `motifEtat` | DTO | Obligatoire si `codeEtat = 99` | 400 |

---

## 8. Effect on `OPERATIONS_DELEGUEES`

| Champ BD | `finalize=true` | `finalize=false` |
| :--- | :--- | :--- |
| `ETAT_DOSSIER` | `'B'` (Bloqué) | ❌ Non modifié |
| `CODE_ETAT` | Valeur du DTO | ❌ Non modifié |
| `MOTIF_ETAT` | Valeur du DTO | ❌ Non modifié |
| `DATE_ETAT` | `LocalDate.now()` | ❌ Non modifié |
| `DERNIER_NUM_MVT_AVA` | Incrémenté (+1) | ❌ Non modifié |
| `OPERATIONS_DELEGUEES_MVT` | `status='A'` | `status='X'` |

---

## 9. Diagramme d'état du Dossier (Suspension)

```
         finalize=true
              │
[etatDossier='V'] ──────────────────► [etatDossier='B']
  (Valide, Active)   suspensionDossier    (Bloqué, Suspendu)
                                           codeEtat = 1..4 ou 99
                                           motifEtat set
                                           dateEtat = today
```

---

## 10. Step-by-Step Integration Guide

### Étape 1 : Entités

- `OperationsDeleguee.java` — vérifier présence de : `etatDossier`, `codeEtat`, `motifEtat`, `dateEtat`
- `OperationsDelegueesMvt.java` — mêmes champs pour l'audit

### Étape 2 : Repositories

- `OperationsDelegueeRepository.java` — `findByIdForUpdate(Long numDossier)`
- `OperationsDelegueeMvtRepository.java` — `getNextRefOperation()`

### Étape 3 : DTO

- `SuspensionDTO.java` (avec Jakarta Validation)
- `OuvertureDossierDTO.java` (réponse)

### Étape 4 : Service

Ajouter `suspensionDossier` dans `OperationsDelegueeServiceImpl`.

### Étape 5 : Controller

`SuspensionController` → mapping `/api/suspension/{Finalize}`.

### Étape 6 : Exemples JSON

#### finalize=true — codeEtat = 1 (Dépassement)

```json
POST /api/suspension/true
{
  "numDossier": 6110227,
  "codeEtat": 1
}
```

**Effet** :
- `ETAT_DOSSIER` → `'B'`
- `CODE_ETAT` = 1, `DATE_ETAT` = aujourd'hui
- `OPERATIONS_DELEGUEES_MVT` : `status='A'`

#### finalize=true — codeEtat = 99 (Autre motif)

```json
POST /api/suspension/true
{
  "numDossier": 6110227,
  "codeEtat": 99,
  "motifEtat": "Fraude documentaire constatée par l'audit"
}
```

#### finalize=false (brouillon MVT seul)

```json
POST /api/suspension/false
{
  "numDossier": 6110227,
  "codeEtat": 2
}
```

**Effet** : uniquement `OPERATIONS_DELEGUEES_MVT` : `status='X'`
 
---

## 11. 🔧 PLAN — Implémenter le Lock Pessimiste sur suspensionDossier

> **Date** : 13 mars 2026  
> **Objectif** : Reproduire EXACTEMENT le pattern de lock pessimiste de `OperationsDelegueesMvt` sur `suspensionDossier`  
> **Règle** : NE RIEN INVENTER. Copier la même mécanique de lock pessimiste.

---

## 📊 COMPARAISON : Ce qui existe vs. Ce qu'on veut

### Pattern existant dans `OperationsDelegueesMvt` (MODÈLE)

```
Controller
    └─ service.create(dto, finalize)
         ├─ Phase 1 : Insert MVT status=I + validations
         └─ Phase 2 (si finalize=true) : writeDossier(mvt)
              ├─ mvt.status = "V" + dateValidation = now
              ├─ applyMvtToDossier(numDossier)   ← lock pessimiste + idempotence
              ├─ si OK → mvt.status = "A"
              └─ si KO → mvt.status = "E"
```

### Pattern actuel dans `suspensionDossier` (À MODIFIER)

```
POST /api/suspension/{Finalize}
Controller
    └─ service.suspensionDossier(dto, finalizeFlag)
         ├─ Récupérer dossier
         ├─ Vérifier etatDossier == 'V'
         ├─ Validations métier (codeEtat, motifEtat)
         └─ Phase finalize=true : etatDossier='B' + codeEtat + motifEtat + dateEtat + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

### ❌ Problèmes actuels de `suspensionDossier` (sans lock)

| # | Problème | Conséquence |
|---|---|---|
| 1 | Pas de lock pessimiste sur dossier | Race condition sur changement d'état |
| 2 | MAJ concurrente de etatDossier/codeEtat | État incohérent si 2 suspensions simultanées |
| 3 | Pas de protection contre accès concurrent | Plusieurs threads peuvent suspendre le même dossier |

---

## 🎯 CIBLE : Pattern avec Lock Pessimiste

```
POST /api/suspension/{Finalize}
Controller
    └─ service.suspensionDossier(dto, finalizeFlag)
         ├─ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate) ← AJOUTÉ
         ├─ Vérifier etatDossier == 'V'
         ├─ Validations métier (codeEtat, motifEtat)
         └─ Phase finalize=true : etatDossier='B' + codeEtat + motifEtat + dateEtat + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

---

## 📝 FICHIERS À MODIFIER (1 fichier, 0 nouveau)

| # | Fichier | Action |
|---|---|---|
| 1 | `service/impl/OperationsDelegueeServiceImpl.java` | Ajouter lock pessimiste dans `suspensionDossier` |

---

## 📋 DÉTAIL FICHIER PAR FICHIER

---

### ÉTAPE 1 — `service/impl/OperationsDelegueeServiceImpl.java`

**Modifier** `suspensionDossier` pour ajouter le lock pessimiste :

```java
@Override
public OuvertureDossierDTO suspensionDossier(SuspensionDTO dto, boolean finalize) {
    log.info("[suspensionDossier] ⏳ Tentative d'acquisition du lock sur dossier {}", dto.getNumDossier());
    
    // Lock pessimiste sur OperationsDeleguee
    OperationsDeleguee dossier = operationsDelegueeRepository.findByIdForUpdate(dto.getNumDossier())
            .orElseThrow(() -> new ResourceNotFoundException("Dossier not found"));
    
    log.info("[suspensionDossier] ✅ Lock acquis sur dossier {}", dto.getNumDossier());
    
    // Vérifier etatDossier == 'V'
    if (!"V".equals(dossier.getEtatDossier())) {
        throw new BusinessException("DOSSIER_NON_ACTIF", "Dossier non actif pour suspension");
    }
    
    // Validations métier
    validateSuspension(dto);
    
    if (finalize) {
        // Appliquer suspension
        dossier.setEtatDossier("B");
        dossier.setCodeEtat(dto.getCodeEtat());
        dossier.setMotifEtat(dto.getMotifEtat());
        dossier.setDateEtat(LocalDate.now());
        operationsDelegueeRepository.save(dossier);
        
        // Créer MVT status='A'
        createSuspensionMovement(dossier, "A", dto);
        
        return buildSuspensionResultDTO(dossier);
    } else {
        // MVT status='X' uniquement
        createSuspensionMovement(dossier, "X", dto);
        return buildSuspensionResultDTO(dossier); // DTO minimal ?
    }
}
```

---

## 🔄 FLUX COMPLETS APRÈS IMPLÉMENTATION

### suspensionDossier — finalize=true

```
POST /api/suspension/true
{
  "numDossier": 6110227,
  "codeEtat": 1,
  "motifEtat": "Dépassement montant autorisé"
}

→ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate)
→ Vérifier etatDossier == 'V'
→ Validations métier (codeEtat ∈ {1,2,3,4,99}, motifEtat si 99)
→ etatDossier = 'B', codeEtat=1, motifEtat=..., dateEtat=today
→ Créer MVT status='A'
→ 200 { ... etatDossier: "B" }
```

### suspensionDossier — finalize=false

```
POST /api/suspension/false
{
  "numDossier": 6110227,
  "codeEtat": 2
}

→ Lock pessimiste sur OperationsDeleguee
→ Vérifier etatDossier == 'V'
→ Validations métier
→ Créer MVT status='X' uniquement
→ Aucun impact sur dossier
→ 200 { ... }
```

---

## 📊 TABLEAU COMPARATIF FINAL

| Aspect | OperationsDelegueesMvt (modèle) | suspensionDossier (cible) |
|---|---|---|
| **Lock pessimiste** | `findByIdForUpdate()` sur dossier | ✅ Identique sur OperationsDeleguee |
| **Vérification état** | Selon logique métier | ✅ etatDossier == 'V' |
| **MAJ dossier** | `applyMvtToDossier()` | ✅ etatDossier='B' + codeEtat + motifEtat + dateEtat |
| **Status MVT** | 'A' ou 'E' | ✅ 'A' ou 'X' |
| **Codes motif** | Selon logique | ✅ 1=DEPASSEMENT, 2=FISCAL, 3=IMPORTS, 4=NON_RENOUV, 99=AUTRE |

---

## ⚙️ GARANTIES IDENTIQUES

| Garantie | Mécanisme |
|---|---|
| **Sérialisation** | Lock pessimiste → une suspension à la fois par dossier |
| **Atomicité** | Transaction Spring @Transactional |
| **Logs de lock** | `[⏳ Tentative...]` et `[✅ Lock acquis]` |
| **Même pattern** | Copié exactement d'OperationsDelegueesMvt |

---

## 🚀 ORDRE D'EXÉCUTION

```
Étape 1 → service/impl/OperationsDelegueeServiceImpl.java (ajout lock)
```

**1 fichier modifié. 0 nouveau fichier. Lock pessimiste ajouté.**

---

## ✅ VALIDATION

> **Répondez "GO" pour lancer l'implémentation.**
