# BusinessRules_AlimentationBCT Module — Recreation & Integration Guide

This guide provides everything you need to recreate the **Alimentation Suite Accord BCT** module and integrate it into another Spring Boot project.

---

## 1. What Is the Module?

The **Alimentation BCT** module records the authorization granted by the Banque Centrale de Tunisie (BCT) to a dossier, increasing its authorized ceiling (`mntAutoriseBct`). It is triggered when an exporter receives an official BCT accord and must record the corresponding movement.

**Key concept** : the `numDossier` is passed as a **URL path variable** — it is NOT part of the request body (`AutorisationBctDTO`).

---

## 2. Module Architecture Overview

| Layer | Component | Responsibility |
| :--- | :--- | :--- |
| **API** | `AlimentationBCTController` | `POST /api/alimentation-bct/{numDossier}/{Finalize}` |
| **Service** | `OperationsDelegueeServiceImpl` | `alimentationSuiteAccordBct(numDossier, dto, finalizeFlag)` |
| **Repository** | `OperationsDelegueeRepository` | `findByIdForUpdate(numDossier)` — pessimistic lock |
| **Repository** | `OperationsDelegueeMvtRepository` | `getNextRefOperation()`, INSERT |
| **Entity** | `OperationsDeleguee` | Update `numeroBct`, `dateBct`, `mntAutoriseBct` |
| **Entity** | `OperationsDelegueesMvt` | Audit trail |

---

## 3. Database Schema

### Tables impactées

| Table | Action | Champs modifiés |
| :--- | :--- | :--- |
| `OPERATIONS_DELEGUEES` | UPDATE | `NUMERO_BCT`, `DATE_BCT`, `MNT_AUTORISE_BCT` |
| `OPERATIONS_DELEGUEES_MVT` | INSERT | `STATUS`, `MNT_MVT_AVA`, `CODE_PRODUIT_SERVICE`, `CODE_OPERATION`, ... |

### Calcul central : Cumul BCT

```
MNT_AUTORISE_BCT (new) = MNT_AUTORISE_BCT (actuel) + dto.mntMvtAva
```

Il n'y a **pas de plafond** sur `mntAutoriseBct` — le montant s'accumule à chaque accord BCT reçu.

---

## 4. DTOs

### `AutorisationBctDTO` (corps de la requête)

```java
public class AutorisationBctDTO {
    @NotNull
    private String numeroBct;      // Numéro d'accord BCT — required

    @NotNull
    @PastOrPresent
    private LocalDate dateBct;     // Date de l'accord — required, passé ou aujourd'hui

    @NotNull
    private Short typeBct;         // Type d'accord BCT — required

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal mntMvtAva;  // Montant autorisé par l'accord — required, > 0
}
```

> **Note** : `numDossier` vient du **path variable** de l'URL, pas du DTO.

---

## 5. Business Logic — `alimentationSuiteAccordBct`

### Workflow complet

```
[1] Récupérer dossier → findByIdForUpdate(numDossier) — lock pessimiste
[2] Vérifier que le dossier existe → sinon ResourceNotFoundException
[3] Vérifier etatDossier == 'V' → sinon erreur métier
[4] Vérifier dto.numeroBct != null → obligatoire
[5] Vérifier dto.dateBct != null + @PastOrPresent → passé ou aujourd'hui
[6] Vérifier dto.typeBct != null → obligatoire
[7] Vérifier dto.mntMvtAva != null + > 0 → non nul, positif

         ↓ FINALIZE = TRUE
[8] Calculer newMntAutoriseBct = dossier.mntAutoriseBct + dto.mntMvtAva
[9] Mettre à jour dossier :
    - dossier.setNumeroBct(dto.numeroBct)
    - dossier.setDateBct(dto.dateBct)
    - dossier.setMntAutoriseBct(newMntAutoriseBct)
[10] Sauvegarder dossier
[11] Créer mouvement : createAlimentationBctMovement(dossier, "A", dto)
[12] Retourner OuvertureDossierDTO via buildSuspensionResultDTO()

         ↓ FINALIZE = FALSE
[8] Créer mouvement : createAlimentationBctMovement(dossier, "X", dto)
[9] Retourner OuvertureDossierDTO minimal (numDossier)
```

### Pre-condition obligatoire : `etatDossier = 'V'`

```
'V' (Valide) → seul état autorisant l'alimentation BCT
'B' (Bloqué) → erreur : "Dossier suspendu, levée de suspension requise"
Autre → erreur métier
```

### Création du Mouvement (`createAlimentationBctMovement`)

```java
private void createAlimentationBctMovement(OperationsDeleguee dossier, String status, AutorisationBctDTO dto) {
    Long refOperation = operationsMvtRepository.getNextRefOperation();
    // ... construction du mvt ...
    mvt.setMntMvtAva(dto.getMntMvtAva());
    mvt.setNumeroBct(dto.getNumeroBct());
    mvt.setDateBct(dto.getDateBct());
    mvt.setStatus(status); // "A" ou "X"
    operationsMvtRepository.save(mvt);
    if ("A".equals(status)) {
        dossier.setDernierNumMvtAva(newNumMvtAva);
        operationsDelegueeRepository.save(dossier);
    }
}
```

---

## 6. API Endpoints

### `AlimentationBCTController` (`/api/alimentation-bct`)

| Method | Endpoint | `Finalize` | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/alimentation-bct/{numDossier}/true` | `true` | MAJ dossier BCT + MVT `status='A'` |
| `POST` | `/api/alimentation-bct/{numDossier}/false` | `false` | MVT `status='X'` uniquement (brouillon) |

**Réponse** : `200 OK` avec `OuvertureDossierDTO` (construit via `buildSuspensionResultDTO()`).

---

## 7. Validation Rules (synthèse)

| Champ | Source | Règle | Exception |
| :--- | :--- | :--- | :--- |
| `numDossier` | Path var | Dossier doit exister | `ResourceNotFoundException` |
| `etatDossier` | BD | Doit être `'V'` | Business Exception |
| `numeroBct` | DTO | Obligatoire (`@NotNull`) | 400 |
| `dateBct` | DTO | Obligatoire + passé/présent (`@PastOrPresent`) | 400 |
| `typeBct` | DTO | Obligatoire | 400 |
| `mntMvtAva` | DTO | Obligatoire + > 0 | 400 |

---

## 8. Effect on `OPERATIONS_DELEGUEES`

| Opération | `finalize=true` | `finalize=false` |
| :--- | :--- | :--- |
| `NUMERO_BCT` | Mis à jour avec `dto.numeroBct` | ❌ Non modifié |
| `DATE_BCT` | Mis à jour avec `dto.dateBct` | ❌ Non modifié |
| `MNT_AUTORISE_BCT` | **Incrémenté** : + `dto.mntMvtAva` | ❌ Non modifié |
| `DERNIER_NUM_MVT_AVA` | Incrémenté (+1) | ❌ Non modifié |
| `OPERATIONS_DELEGUEES_MVT` | `status='A'` | `status='X'` |

---

## 9. Réponse — `OuvertureDossierDTO` via `buildSuspensionResultDTO()`

La méthode `buildSuspensionResultDTO(dossier)` construit le DTO de retour en recopiant tous les champs du dossier :

```java
private OuvertureDossierDTO buildSuspensionResultDTO(OperationsDeleguee dossier) {
    OuvertureDossierDTO result = new OuvertureDossierDTO();
    result.setNumDossier(dossier.getNumDossier());
    result.setMntAutoriseBct(dossier.getMntAutoriseBct());
    result.setNumeroBct(dossier.getNumeroBct());
    result.setDateBct(dossier.getDateBct());
    // ... autres champs du dossier ...
    return result;
}
```

---

## 10. Step-by-Step Integration Guide

### Étape 1 : Entités

- `OperationsDeleguee.java` — ajouter champs `numeroBct`, `dateBct`, `mntAutoriseBct`
- `OperationsDelegueesMvt.java` — ajouter champs `numeroBct`, `dateBct`, `mntMvtAva`

### Étape 2 : Repositories

- `OperationsDelegueeRepository.java` — vérifier présence de `findByIdForUpdate`
- `OperationsDelegueeMvtRepository.java` — vérifier `getNextRefOperation()`

### Étape 3 : DTO

- `AutorisationBctDTO.java` (avec annotations Jakarta Validation)
- `OuvertureDossierDTO.java` (réponse)

### Étape 4 : Service

Ajouter `alimentationSuiteAccordBct` dans `OperationsDelegueeServiceImpl`.

### Étape 5 : Controller

`AlimentationBCTController` → mapping `/api/alimentation-bct/{numDossier}/{Finalize}`.

### Étape 6 : Exemples JSON

#### finalize=true

```json
POST /api/alimentation-bct/6110227/true
{
  "numeroBct": "BCT2025/0042",
  "dateBct": "2025-03-10",
  "typeBct": 1,
  "mntMvtAva": 50000.00
}
```

**Effet** :
- `MNT_AUTORISE_BCT` += 50 000
- `NUMERO_BCT` = "BCT2025/0042"
- `DATE_BCT` = 2025-03-10
- `OPERATIONS_DELEGUEES_MVT` : `status='A'`

#### finalize=false

```json
POST /api/alimentation-bct/6110227/false
{
  "numeroBct": "BCT2025/0042",
  "dateBct": "2025-03-10",
  "typeBct": 1,
  "mntMvtAva": 50000.00
}
```

**Effet** : uniquement `OPERATIONS_DELEGUEES_MVT` : `status='X'`

---

## 11. 🔧 PLAN — Implémenter le Lock Pessimiste sur alimentationSuiteAccordBct

> **Date** : 13 mars 2026  
> **Objectif** : Reproduire EXACTEMENT le pattern de lock pessimiste de `OperationsDelegueesMvt` sur `alimentationSuiteAccordBct`  
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

### Pattern actuel dans `alimentationSuiteAccordBct` (À MODIFIER)

```
POST /api/alimentation-bct/{numDossier}/{Finalize}
Controller
    └─ service.alimentationSuiteAccordBct(numDossier, dto, finalizeFlag)
         ├─ Récupérer dossier
         ├─ Vérifier etatDossier == 'V'
         ├─ Validations métier
         └─ Phase finalize=true : MAJ numeroBct, dateBct, mntAutoriseBct + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

### ❌ Problèmes actuels de `alimentationSuiteAccordBct` (sans lock)

| # | Problème | Conséquence |
|---|---|---|
| 1 | Pas de lock pessimiste sur dossier | Race condition sur mntAutoriseBct (cumul concurrent) |
| 2 | MAJ concurrente de numeroBct/dateBct | Valeurs écrasées si 2 alimentations simultanées |
| 3 | Pas de protection contre accès concurrent | Plusieurs threads peuvent MAJ le même dossier |

---

## 🎯 CIBLE : Pattern avec Lock Pessimiste

```
POST /api/alimentation-bct/{numDossier}/{Finalize}
Controller
    └─ service.alimentationSuiteAccordBct(numDossier, dto, finalizeFlag)
         ├─ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate) ← AJOUTÉ
         ├─ Vérifier etatDossier == 'V'
         ├─ Validations métier
         └─ Phase finalize=true : MAJ numeroBct, dateBct, mntAutoriseBct + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

---

## 📝 FICHIERS À MODIFIER (1 fichier, 0 nouveau)

| # | Fichier | Action |
|---|---|---|
| 1 | `service/impl/OperationsDelegueeServiceImpl.java` | Ajouter lock pessimiste dans `alimentationSuiteAccordBct` |

---

## 📋 DÉTAIL FICHIER PAR FICHIER

---

### ÉTAPE 1 — `service/impl/OperationsDelegueeServiceImpl.java`

**Modifier** `alimentationSuiteAccordBct` pour ajouter le lock pessimiste :

```java
@Override
public OuvertureDossierDTO alimentationSuiteAccordBct(Integer numDossier, AutorisationBctDTO dto, boolean finalize) {
    log.info("[alimentationSuiteAccordBct] ⏳ Tentative d'acquisition du lock sur dossier {}", numDossier);
    
    // Lock pessimiste sur OperationsDeleguee
    OperationsDeleguee dossier = operationsDelegueeRepository.findByIdForUpdate(numDossier)
            .orElseThrow(() -> new ResourceNotFoundException("Dossier not found"));
    
    log.info("[alimentationSuiteAccordBct] ✅ Lock acquis sur dossier {}", numDossier);
    
    // Vérifier etatDossier == 'V'
    if (!"V".equals(dossier.getEtatDossier())) {
        throw new BusinessException("DOSSIER_NON_ACTIF", "Dossier non actif pour alimentation BCT");
    }
    
    // Validations métier
    validateAutorisationBct(dto);
    
    if (finalize) {
        // Calcul newMntAutoriseBct = actuel + dto.mntMvtAva
        BigDecimal newMntAutoriseBct = defaultZero(dossier.getMntAutoriseBct()).add(dto.getMntMvtAva());
        
        // MAJ dossier
        dossier.setNumeroBct(dto.getNumeroBct());
        dossier.setDateBct(dto.getDateBct());
        dossier.setMntAutoriseBct(newMntAutoriseBct);
        operationsDelegueeRepository.save(dossier);
        
        // Créer MVT status='A'
        createAlimentationBctMovement(dossier, "A", dto);
        
        return buildSuspensionResultDTO(dossier);
    } else {
        // MVT status='X' uniquement
        createAlimentationBctMovement(dossier, "X", dto);
        return buildSuspensionResultDTO(dossier); // DTO minimal ?
    }
}
```

---

## 🔄 FLUX COMPLETS APRÈS IMPLÉMENTATION

### alimentationSuiteAccordBct — finalize=true

```
POST /api/alimentation-bct/6110227/true
{
  "numeroBct": "BCT2025/0042",
  "dateBct": "2025-03-10",
  "mntMvtAva": 50000.00
}

→ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate)
→ Vérifier etatDossier == 'V'
→ Validations métier
→ Calcul mntAutoriseBct += 50000
→ MAJ numeroBct, dateBct, mntAutoriseBct
→ Créer MVT status='A'
→ 200 { ... }
```

### alimentationSuiteAccordBct — finalize=false

```
POST /api/alimentation-bct/6110227/false
{
  "numeroBct": "BCT2025/0042",
  ...
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

| Aspect | OperationsDelegueesMvt (modèle) | alimentationSuiteAccordBct (cible) |
|---|---|---|
| **Lock pessimiste** | `findByIdForUpdate()` sur dossier | ✅ Identique sur OperationsDeleguee |
| **Vérification état** | Selon logique métier | ✅ etatDossier == 'V' |
| **MAJ dossier** | `applyMvtToDossier()` | ✅ MAJ numeroBct, dateBct, mntAutoriseBct |
| **Status MVT** | 'A' ou 'E' | ✅ 'A' ou 'X' |
| **Calcul** | Selon codeOperation | ✅ Cumul mntAutoriseBct |

---

## ⚙️ GARANTIES IDENTIQUES

| Garantie | Mécanisme |
|---|---|
| **Sérialisation** | Lock pessimiste → une alimentation à la fois par dossier |
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
