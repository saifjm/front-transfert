# BusinessRules_Rapatriement_Exportateur Module — Recreation & Integration Guide

This guide provides everything you need to recreate the **Rapatriement Exportateur** module and integrate it into another Spring Boot project.

---

## 1. Module Architecture Overview

The Rapatriement Exportateur module handles recording repatriation operations for AVA exporters. It links funds received abroad back to a delegated operation dossier (AVA) and applies a TND equivalent calculation.

Layers :
1. **API Layer**: `OperationExportateurAVAController` → `/api/operation-exportateur-ava`
2. **Service Layer**: `OperationExportateurAVAServiceImpl.createRapatriement(dto, finalizeFlag)`
3. **Data Layer**: `OPERATION_EXPORTATEUR_AVA`, `OPERATIONS_DELEGUEES`, `OPERATIONS_DELEGUEES_MVT`
4. **Repositories**: `OperationExportateurAVARepository`, `OperationsDelegueeRepository`, `OperationsDelegueeMvtRepository`

---

## 2. Database Schema (Entities)

### Tables impactées

| Table | Rôle | Modification |
| :--- | :--- | :--- |
| `OPERATION_EXPORTATEUR_AVA` | Enregistrement du rapatriement | INSERT |
| `OPERATIONS_DELEGUEES` | Mise à jour `mntAutorise` + `dernierNumMvtAva` | UPDATE |
| `OPERATIONS_DELEGUEES_MVT` | Historique / audit | INSERT |

### Entity : `OperationExportateurAVA.java`

| Champ | Type | Description |
| :--- | :--- | :--- |
| `numDossierAva` | `Integer` | Clé étrangère : dossier AVA (FK → OPERATIONS_DELEGUEES) |
| `dateDosRap` | `LocalDate` | Date de rapatriement |
| `numeroCompte` | `String` | Numéro de compte bancaire (13 chiffres) |
| `typePieceBenef` | `Integer` | Type de pièce bénéficiaire : 1, 4, 7 |
| `noPieceBenef` | `String` | Numéro pièce bénéficiaire |
| `mntRap` | `BigDecimal` | Montant rapatrié (devises) |
| `mntMvtTnd` | `BigDecimal` | **Calculé** = 25% × `mntRap` |
| `codeOperation` | `Integer` | Toujours : **204** |
| `codeProduitService` | `Short` | Toujours : **108** |
| `codeOrigine` | `Short` | Toujours : **1** |

---

## 3. DTOs

### `OperationExportateurAVADTO`

```java
public class OperationExportateurAVADTO {
    private Integer numDossierAva;   // required — dossier existant
    private LocalDate dateDosRap;    // required — date de rapatriement
    private String numeroCompte;     // required — 13 chiffres numériques
    private Integer typePieceBenef;  // required — 1, 4, ou 7
    private String noPieceBenef;     // required
    private BigDecimal mntRap;       // required — montant en devises > 0
    private BigDecimal mntMvtTnd;    // calculé (25% de mntRap) — retourné en réponse
    private Integer codeOperation;   // toujours 204 — fixe
    private Short codeProduitService; // toujours 108 — fixe
}
```

---

## 4. Business Logic — `OperationExportateurAVAServiceImpl`

### Particularité importante : MVT créé EN PREMIER

> ⚠️ **Ordre exceptionnel** : Contrairement aux autres modules, le mouvement dans `OPERATIONS_DELEGUEES_MVT` est **toujours créé avant les validations métier**. Si une validation échoue, le MVT reste avec `status='X'`.

### Workflow `createRapatriement(dto, finalizeFlag)`

```
[1] Vérifier numDossierAva → dossier doit exister (findByIdForUpdate)
[2] Créer MVT avec status='X' (PRÉ-CRÉATION — avant toutes les validations)
[3] Validation numDossierAva → non null
[4] Validation dateDosRap → non null ; isDateRapValid(dateDosRap, dossier)
[5] Validation numeroCompte → non null + regex ^\d{13}$
[6] Validation typePieceBenef → non null, ∈ {1, 4, 7}
[7] Validation noPieceBenef → non null
[8] Validation mntRap → > 0
         ↓ FINALIZE = TRUE
[9] Calculer mntMvtTnd = 25% × mntRap
[10] Sauvegarder OperationExportateurAVA
[11] MAJ mntAutorise dossier (plafond 500 000 TND)
[12] MAJ dernierNumMvtAva (+1)
[13] MAJ MVT status → 'A'
[14] Retourner DTO complet

         ↓ FINALIZE = FALSE
[9] Retourner DTO minimal (numDossierAva)
```

### Calcul `mntMvtTnd`

```java
BigDecimal mntMvtTnd = dto.getMntRap().multiply(BigDecimal.valueOf(0.25));
```

### Plafond `mntAutorise`

```java
BigDecimal PLAFOND = new BigDecimal("500000");
BigDecimal newMntAutorise = dossier.getMntAutorise().add(mntMvtTnd);
if (newMntAutorise.compareTo(PLAFOND) > 0) {
    newMntAutorise = PLAFOND;
}
dossier.setMntAutorise(newMntAutorise);
```

### Validation de date `isDateRapValid`

- `dateDosRap` doit être une date valide par rapport au dossier (contrôle interne — règle métier sur la cohérence de la période de rapatriement).

### Création du Mouvement

```java
// codeOperation = 204, codeProduitService = 108
mvt.setCodeOperation(204);
mvt.setCodeProduitService((short) 108);
mvt.setCodeOrigine((short) 1);
mvt.setStatus("X"); // pré-créé; mis à 'A' si finalize=true
```

---

## 5. API Endpoints

### `OperationExportateurAVAController` (`/api/operation-exportateur-ava`)

| Method | Endpoint | `Finalize` | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/operation-exportateur-ava/rapatriement/{Finalize}` | `true` | Crée rapatriement + MVT `status='A'` |
| `POST` | `/api/operation-exportateur-ava/rapatriement/{Finalize}` | `false` | MVT `status='X'` uniquement (brouillon) |
| `GET` | `/api/operation-exportateur-ava/{numDossier}` | — | Liste des opérations du dossier |

**Réponse HTTP** : `201 Created` avec `OperationExportateurAVADTO`.

---

## 6. Validation Rules (synthèse)

| Champ | Règle | Erreur |
| :--- | :--- | :--- |
| `numDossierAva` | Obligatoire + dossier doit exister | 400 / 404 |
| `dateDosRap` | Obligatoire + cohérence avec dossier | 400 |
| `numeroCompte` | Obligatoire + regex `^\d{13}$` | 400 |
| `typePieceBenef` | Obligatoire + ∈ {1, 4, 7} | 400 |
| `noPieceBenef` | Obligatoire | 400 |
| `mntRap` | Obligatoire + > 0 | 400 |

---

## 7. Effect on `OPERATIONS_DELEGUEES`

| Champ | `finalize=true` | `finalize=false` |
| :--- | :--- | :--- |
| `OPERATION_EXPORTATEUR_AVA` | INSERT | ❌ Non créé |
| `MNT_AUTORISE` | Ajout de `mntMvtTnd` (plafond 500 000 TND) | ❌ Non modifié |
| `DERNIER_NUM_MVT_AVA` | Incrémenté (+1) | ❌ Non modifié |
| `OPERATIONS_DELEGUEES_MVT` | `status='A'` | `status='X'` |

---

## 8. Constantes Fixes

| Constante | Valeur | Source |
| :--- | :--- | :--- |
| `codeOperation` | `204` | Code Rapatriement Exportateur |
| `codeProduitService` | `108` | Produit AVA Exportateur |
| `codeOrigine` | `1` | Toujours 1 |
| `tauxMvtTnd` | `25%` | Calcul TND : 25% du montant rapatrié |
| `plafondMntAutorise` | `500 000 TND` | Plafond légal mntAutorise |

---

## 9. Step-by-Step Integration Guide

### Étape 1 : Entités & Repositories

- `OperationExportateurAVA.java`
- `OperationExportateurAVARepository.java`
- `OperationsDeleguee.java`, `OperationsDelegueeRepository.java` (avec `findByIdForUpdate`)
- `OperationsDelegueeMvtRepository.java` (avec `getNextRefOperation()`)

### Étape 2 : DTOs & Mappers

- `OperationExportateurAVADTO.java`
- `OperationExportateurAVAMapper.java`

### Étape 3 : Service & Controller

- `OperationExportateurAVAServiceImpl` → `@Service @Transactional`
- `OperationExportateurAVAController` → `@RestController @RequestMapping("/api/operation-exportateur-ava")`

### Étape 4 : Exemples JSON

#### finalize=true (rapatriement complet)

```json
POST /api/operation-exportateur-ava/rapatriement/true
{
  "numDossierAva": 6110227,
  "dateDosRap": "2025-03-15",
  "numeroCompte": "1234567890123",
  "typePieceBenef": 1,
  "noPieceBenef": "1234567A",
  "mntRap": 10000.00
}
```

**Résultat déclenché** :
- `mntMvtTnd` = 0.25 × 10000 = **2500.00 TND**
- `OPERATION_EXPORTATEUR_AVA` : INSERT
- `OPERATIONS_DELEGUEES.mntAutorise` += 2500 (plafond 500 000)
- `OPERATIONS_DELEGUEES_MVT` : `status='A'`

#### finalize=false (brouillon MVT)

```json
POST /api/operation-exportateur-ava/rapatriement/false
{
  "numDossierAva": 6110227,
  ...
}
```

- `OPERATIONS_DELEGUEES_MVT` : `status='X'`
- `OPERATION_EXPORTATEUR_AVA` : ❌ pas d'INSERT

---

## 10. 🔧 PLAN — Implémenter le Lock Pessimiste sur createRapatriement

> **Date** : 13 mars 2026  
> **Objectif** : Reproduire EXACTEMENT le pattern de lock pessimiste de `OperationsDelegueesMvt` sur `createRapatriement`  
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

### Pattern actuel dans `createRapatriement` (À MODIFIER)

```
POST /api/operation-exportateur-ava/rapatriement/{Finalize}
Controller
    └─ service.createRapatriement(dto, finalizeFlag)
         ├─ Créer MVT status='X' (pré-création)
         ├─ Validations métier
         └─ Phase finalize=true : Sauvegarder OperationExportateurAVA + MAJ dossier + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

### ❌ Problèmes actuels de `createRapatriement` (sans lock)

| # | Problème | Conséquence |
|---|---|---|
| 1 | Pas de lock pessimiste sur dossier | Race condition sur mntAutorise (cumul concurrent) |
| 2 | MAJ concurrente de dernierNumMvtAva | Valeur incorrecte si 2 rapatriements simultanés |
| 3 | Pas de protection contre accès concurrent | Plusieurs threads peuvent MAJ le même dossier |

---

## 🎯 CIBLE : Pattern avec Lock Pessimiste

```
POST /api/operation-exportateur-ava/rapatriement/{Finalize}
Controller
    └─ service.createRapatriement(dto, finalizeFlag)
         ├─ Créer MVT status='X' (pré-création)
         ├─ Validations métier
         ├─ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate) ← AJOUTÉ
         └─ Phase finalize=true : Sauvegarder OperationExportateurAVA + MAJ dossier + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

---

## 📝 FICHIERS À MODIFIER (1 fichier, 0 nouveau)

| # | Fichier | Action |
|---|---|---|
| 1 | `service/impl/OperationExportateurAVAServiceImpl.java` | Ajouter lock pessimiste sur OperationsDeleguee |

---

## 📋 DÉTAIL FICHIER PAR FICHIER

---

### ÉTAPE 1 — `service/impl/OperationExportateurAVAServiceImpl.java`

**Modifier** `createRapatriement` pour ajouter le lock pessimiste :

```java
@Override
public OperationExportateurAVADTO createRapatriement(OperationExportateurAVADTO dto, boolean finalize) {
    log.info("[createRapatriement] ⏳ Tentative d'acquisition du lock sur dossier {}", dto.getNumDossierAva());
    
    // Lock pessimiste sur OperationsDeleguee
    OperationsDeleguee operationsDeleguee = operationsDelegueeRepository.findByIdForUpdate(dto.getNumDossierAva())
            .orElseThrow(() -> new ResourceNotFoundException("Dossier not found"));
    
    log.info("[createRapatriement] ✅ Lock acquis sur dossier {}", dto.getNumDossierAva());
    
    // Créer MVT pré-création status='X'
    OperationsDelegueesMvt mvt = createMvtForRapatriement(dto, "X");
    
    // Validations métier
    validateRapatriement(dto, operationsDeleguee);
    
    if (finalize) {
        // Calcul mntMvtTnd = 25% × mntRap
        BigDecimal mntMvtTnd = dto.getMntRap().multiply(BigDecimal.valueOf(0.25));
        dto.setMntMvtTnd(mntMvtTnd);
        
        // Sauvegarder OperationExportateurAVA
        OperationExportateurAVA entity = mapper.toEntity(dto);
        operationExportateurAVARepository.save(entity);
        
        // MAJ dossier : mntAutorise (plafond 500 000 TND) + dernierNumMvtAva
        BigDecimal newMntAutorise = operationsDeleguee.getMntAutorise().add(mntMvtTnd);
        if (newMntAutorise.compareTo(BigDecimal.valueOf(500000)) > 0) {
            newMntAutorise = BigDecimal.valueOf(500000);
        }
        operationsDeleguee.setMntAutorise(newMntAutorise);
        operationsDeleguee.setDernierNumMvtAva(operationsDeleguee.getDernierNumMvtAva() + 1);
        operationsDelegueeRepository.save(operationsDeleguee);
        
        // MAJ MVT status='A'
        mvt.setStatus("A");
        operationsMvtRepository.save(mvt);
        
        return mapper.toDto(entity);
    } else {
        // MVT status='X' uniquement
        return dto; // DTO avec mntMvtTnd calculé ?
    }
}
```

---

## 🔄 FLUX COMPLETS APRÈS IMPLÉMENTATION

### createRapatriement — finalize=true

```
POST /api/operation-exportateur-ava/rapatriement/true
{
  "numDossierAva": 6110227,
  "mntRap": 10000.00,
  ...
}

→ Créer MVT status='X' (pré-création)
→ Validations métier
→ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate)
→ Calcul mntMvtTnd = 25% × 10000 = 2500.00
→ Sauvegarder OperationExportateurAVA
→ MAJ mntAutorise += 2500 (plafond 500k) + dernierNumMvtAva +1
→ MVT status='X' → 'A'
→ 201 { ... mntMvtTnd: 2500.00 }
```

### createRapatriement — finalize=false

```
POST /api/operation-exportateur-ava/rapatriement/false
{
  "numDossierAva": 6110227,
  ...
}

→ Créer MVT status='X' (pré-création)
→ Validations métier
→ Lock pessimiste sur OperationsDeleguee
→ Aucun impact sur OperationExportateurAVA ou dossier
→ MVT reste 'X'
→ 201 { ... }
```

---

## 📊 TABLEAU COMPARATIF FINAL

| Aspect | OperationsDelegueesMvt (modèle) | createRapatriement (cible) |
|---|---|---|
| **Lock pessimiste** | `findByIdForUpdate()` sur dossier | ✅ Identique sur OperationsDeleguee |
| **Pré-création MVT** | Non | ✅ MVT créé avant validations |
| **MAJ dossier** | `applyMvtToDossier()` | ✅ MAJ mntAutorise + dernierNumMvtAva |
| **Status final** | 'A' ou 'E' | ✅ 'A' ou 'X' |
| **Calcul métier** | Selon codeOperation | ✅ 25% + plafond 500k TND |

---

## ⚙️ GARANTIES IDENTIQUES

| Garantie | Mécanisme |
|---|---|
| **Sérialisation** | Lock pessimiste → un rapatriement à la fois par dossier |
| **Atomicité** | Transaction Spring @Transactional |
| **Logs de lock** | `[⏳ Tentative...]` et `[✅ Lock acquis]` |
| **Même pattern** | Copié exactement d'OperationsDelegueesMvt |

---

## 🚀 ORDRE D'EXÉCUTION

```
Étape 1 → service/impl/OperationExportateurAVAServiceImpl.java (ajout lock)
```

**1 fichier modifié. 0 nouveau fichier. Lock pessimiste ajouté.**

---

## ✅ VALIDATION

> **Répondez "GO" pour lancer l'implémentation.**
