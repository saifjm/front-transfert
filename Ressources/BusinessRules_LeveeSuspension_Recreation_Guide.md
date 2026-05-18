# BusinessRules_LeveeSuspension Module — Recreation & Integration Guide

This guide provides everything you need to recreate the **Levée de Suspension** module and integrate it into another Spring Boot project.

---

## 1. What Is the Module?

The **Levée de Suspension** module restores an AVA dossier from a blocked state (`'B'` — Bloqué) to an active state (`'V'` — Valide). It is the inverse of the suspension operation and is triggered when the exporter has fulfilled the required compliance conditions.

**Important** : If the original suspension reason was `codeEtat=1` (Dépassement du montant autorisé), the levée requires providing BCT authorization details (`numBct`, `dateBct`) — these are **conditionally mandatory**.

---

## 2. Module Architecture Overview

| Layer | Component | Responsibility |
| :--- | :--- | :--- |
| **API** | `LeveeSuspensionController` | `POST /api/levee-suspension/{Finalize}` |
| **Service** | `OperationsDelegueeServiceImpl` | `leveeSuspensionDossier(dto, finalizeFlag)` |
| **Repository** | `OperationsDelegueeRepository` | `findByIdForUpdate(numDossier)` — pessimistic lock |
| **Repository** | `OperationsDelegueeMvtRepository` | `getNextRefOperation()`, INSERT MVT |
| **Entity** | `OperationsDeleguee` | UPDATE : `ETAT_DOSSIER='V'`, `CODE_ETAT=null`, `MOTIF_ETAT`, `DATE_ETAT` |
| **Entity** | `OperationsDelegueesMvt` | INSERT Audit |

---

## 3. DTOs

### `LeveeSuspensionDTO` (corps de la requête)

```java
public class LeveeSuspensionDTO {
    @NotNull
    private Long numDossier;   // required — numéro du dossier à lever

    @NotNull
    private String motifEtat;  // required — motif de la levée de suspension

    private String numBct;     // conditionnel — numéro BCT (requis si codeEtat précédent = 1)
    private LocalDate dateBct; // conditionnel — date BCT (requise si codeEtat précédent = 1)
}
```

> **`numBct` et `dateBct`** : ne portent pas d'annotation `@NotNull` dans le DTO — leur validation est **conditionnelle** et gérée manuellement dans la logique métier.

---

## 4. Règle Conditionnelle : `codeEtat = 1`

La validation de `numBct` / `dateBct` dépend de l'état **actuel en base** du dossier, pas d'un champ du DTO :

```
Si dossier.codeEtat (en BD) == 1 (DEPASSEMENT DU MONTANT AUTORISE)
  → dto.numBct obligatoire
  → dto.dateBct obligatoire
  → dto.numBct doit être un entier valide (Integer.parseInt)
```

Ce contrôle est indispensable car le dépassement BCT requiert la preuve d'un accord formel.

---

## 5. Business Logic — `leveeSuspensionDossier`

### Workflow complet

```
[1] Récupérer dossier → findByIdForUpdate(numDossier) — lock pessimiste
[2] Vérifier que dossier existe → sinon ResourceNotFoundException
[3] Vérifier etatDossier == 'B' → sinon erreur métier ("Dossier non suspendu")
[4] Vérifier dto.motifEtat non null/vide → obligatoire
[5] Si dossier.codeEtat == 1 :
      → Vérifier dto.numBct non null/vide → obligatoire
      → Vérifier dto.dateBct non null → obligatoire
      → Vérifier Integer.parseInt(dto.numBct) → doit être numérique

         ↓ FINALIZE = TRUE
[6] Si dossier.codeEtat == 1 :
      → dossier.setNumeroBct(dto.numBct)
      → dossier.setDateBct(dto.dateBct)
[7] Appliquer levée :
    - dossier.setEtatDossier("V")
    - dossier.setCodeEtat(null)       ← réinitialisation
    - dossier.setMotifEtat(dto.motifEtat)
    - dossier.setDateEtat(LocalDate.now())
[8] Sauvegarder dossier
[9] Créer mouvement : createLeveeSuspensionMovement(dossier, "A", dto)
[10] Retourner OuvertureDossierDTO via buildSuspensionResultDTO()

         ↓ FINALIZE = FALSE
[6] Créer mouvement : createLeveeSuspensionMovement(dossier, "X", dto)
[7] Retourner OuvertureDossierDTO minimal (numDossier)
```

### Pre-condition obligatoire : `etatDossier = 'B'`

```
'B' (Bloqué, Suspendu)  → Levée autorisée → suite normale
'V' (Valide, Actif)     → Erreur : "Dossier non suspendu"
Autre état              → Erreur métier
```

### Création du Mouvement (`createLeveeSuspensionMovement`)

```java
private void createLeveeSuspensionMovement(OperationsDeleguee dossier, String status, LeveeSuspensionDTO dto) {
    Long refOperation = operationsMvtRepository.getNextRefOperation();
    OperationsDelegueesMvt mvt = new OperationsDelegueesMvt();
    // copier champs du dossier dans le mvt
    mvt.setMotifEtat(dto.getMotifEtat());
    mvt.setEtatDossier("V");  // état après levée
    mvt.setCodeEtat(null);    // réinitialisé
    mvt.setNumeroBct(dto.getNumBct());
    mvt.setDateBct(dto.getDateBct());
    mvt.setStatus(status);    // "A" ou "X"
    operationsMvtRepository.save(mvt);
    if ("A".equals(status)) {
        dossier.setDernierNumMvtAva(newNumMvtAva);
        operationsDelegueeRepository.save(dossier);
    }
}
```

---

## 6. API Endpoints

### `LeveeSuspensionController` (`/api/levee-suspension`)

| Method | Endpoint | `Finalize` | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/levee-suspension/true` | `true` | Lève la suspension + MVT `status='A'` |
| `POST` | `/api/levee-suspension/false` | `false` | MVT `status='X'` uniquement (brouillon) |

**Réponse HTTP** : `200 OK` avec `OuvertureDossierDTO`.

---

## 7. Validation Rules (synthèse)

| Champ | Source | Règle | Exception |
| :--- | :--- | :--- | :--- |
| `numDossier` | DTO | Obligatoire (`@NotNull`) | 400 |
| `numDossier` | BD | Dossier doit exister | `ResourceNotFoundException` |
| `etatDossier` | BD | Doit être `'B'` | Business Exception |
| `motifEtat` | DTO | Obligatoire (`@NotNull`) | 400 |
| `numBct` | DTO | Obligatoire si `dossier.codeEtat == 1` | Business Exception |
| `dateBct` | DTO | Obligatoire si `dossier.codeEtat == 1` | Business Exception |
| `numBct` format | DTO | Doit être un entier valide (`parseInt`) | Business Exception |

---

## 8. Effect on `OPERATIONS_DELEGUEES`

| Champ BD | `finalize=true` | `finalize=false` |
| :--- | :--- | :--- |
| `ETAT_DOSSIER` | `'V'` (Valide) | ❌ Non modifié |
| `CODE_ETAT` | `null` (réinitialisé) | ❌ Non modifié |
| `MOTIF_ETAT` | Valeur du DTO | ❌ Non modifié |
| `DATE_ETAT` | `LocalDate.now()` | ❌ Non modifié |
| `NUMERO_BCT` | Mis à jour si `codeEtat=1` | ❌ Non modifié |
| `DATE_BCT` | Mis à jour si `codeEtat=1` | ❌ Non modifié |
| `DERNIER_NUM_MVT_AVA` | Incrémenté (+1) | ❌ Non modifié |
| `OPERATIONS_DELEGUEES_MVT` | `status='A'` | `status='X'` |

---

## 9. Diagramme d'état du Dossier (Levée de Suspension)

```
       finalize=true
            │
[etatDossier='B'] ─────────────────────► [etatDossier='V']
  (Bloqué, Suspendu)  leveeSuspension       (Valide, Actif)
   codeEtat = 1..4/99                         codeEtat = null
                                              motifEtat = dto.motifEtat
                                              dateEtat = today
                        ↑
              si codeEtat == 1 :
              numeroBct + dateBct
              aussi mis à jour
```

---

## 10. Relation avec la Suspension (cycle complet)

| Étape | Module | État dossier |
| :--- | :--- | :--- |
| Dossier actif | — | `'V'` (Valide) |
| Suspension appliquée | `suspensionDossier` | `'B'` (Bloqué) |
| Levée de suspension | `leveeSuspensionDossier` | `'V'` (Valide) |

> Le cycle peut se répéter : un dossier peut être suspendu et levé plusieurs fois. Chaque transition est tracée dans `OPERATIONS_DELEGUEES_MVT`.

---

## 11. Step-by-Step Integration Guide

### Étape 1 : Entités

- `OperationsDeleguee.java` — vérifier : `etatDossier`, `codeEtat`, `motifEtat`, `dateEtat`, `numeroBct`, `dateBct`
- `OperationsDelegueesMvt.java` — mêmes champs pour l'audit + `numBct`, `dateBct`

### Étape 2 : Repositories

- `OperationsDelegueeRepository.java` — `findByIdForUpdate(Long numDossier)`
- `OperationsDelegueeMvtRepository.java` — `getNextRefOperation()`

### Étape 3 : DTO

- `LeveeSuspensionDTO.java` (avec Jakarta Validation)
- `OuvertureDossierDTO.java` (réponse)

### Étape 4 : Service

Ajouter `leveeSuspensionDossier` dans `OperationsDelegueeServiceImpl`.

### Étape 5 : Controller

`LeveeSuspensionController` → mapping `/api/levee-suspension/{Finalize}`.

### Étape 6 : Exemples JSON

#### finalize=true — levée normale (codeEtat ≠ 1)

```json
POST /api/levee-suspension/true
{
  "numDossier": 6110227,
  "motifEtat": "Situation fiscale régularisée — attestation fournie"
}
```

**Effet** :
- `ETAT_DOSSIER` → `'V'`
- `CODE_ETAT` → `null`
- `OPERATIONS_DELEGUEES_MVT` : `status='A'`

#### finalize=true — levée avec accord BCT (codeEtat=1 en BD)

```json
POST /api/levee-suspension/true
{
  "numDossier": 6110227,
  "motifEtat": "Accord BCT reçu — montant autorisé régularisé",
  "numBct": "12345",
  "dateBct": "2025-03-08"
}
```

**Effet** :
- `ETAT_DOSSIER` → `'V'`
- `CODE_ETAT` → `null`
- `NUMERO_BCT` → "12345", `DATE_BCT` → 2025-03-08
- `OPERATIONS_DELEGUEES_MVT` : `status='A'`

#### finalize=false (brouillon MVT seul)

```json
POST /api/levee-suspension/false
{
  "numDossier": 6110227,
  "motifEtat": "Vérification en cours"
}
```

**Effet** : uniquement `OPERATIONS_DELEGUEES_MVT` : `status='X'`

---

## 11. 🔧 PLAN — Implémenter le Lock Pessimiste sur leveeSuspensionDossier

> **Date** : 13 mars 2026  
> **Objectif** : Reproduire EXACTEMENT le pattern de lock pessimiste de `OperationsDelegueesMvt` sur `leveeSuspensionDossier`  
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

### Pattern actuel dans `leveeSuspensionDossier` (À MODIFIER)

```
POST /api/levee-suspension/{Finalize}
Controller
    └─ service.leveeSuspensionDossier(dto, finalizeFlag)
         ├─ Récupérer dossier
         ├─ Vérifier etatDossier == 'B'
         ├─ Validations métier (motifEtat, numBct/dateBct conditionnels)
         └─ Phase finalize=true : etatDossier='V' + codeEtat=null + motifEtat + dateEtat + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

### ❌ Problèmes actuels de `leveeSuspensionDossier` (sans lock)

| # | Problème | Conséquence |
|---|---|---|
| 1 | Pas de lock pessimiste sur dossier | Race condition sur changement d'état |
| 2 | MAJ concurrente de etatDossier/codeEtat | État incohérent si 2 levées simultanées |
| 3 | Pas de protection contre accès concurrent | Plusieurs threads peuvent lever la suspension du même dossier |

---

## 🎯 CIBLE : Pattern avec Lock Pessimiste

```
POST /api/levee-suspension/{Finalize}
Controller
    └─ service.leveeSuspensionDossier(dto, finalizeFlag)
         ├─ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate) ← AJOUTÉ
         ├─ Vérifier etatDossier == 'B'
         ├─ Validations métier (motifEtat, numBct/dateBct conditionnels)
         └─ Phase finalize=true : etatDossier='V' + codeEtat=null + motifEtat + dateEtat + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

---

## 📝 FICHIERS À MODIFIER (1 fichier, 0 nouveau)

| # | Fichier | Action |
|---|---|---|
| 1 | `service/impl/OperationsDelegueeServiceImpl.java` | Ajouter lock pessimiste dans `leveeSuspensionDossier` |

---

## 📋 DÉTAIL FICHIER PAR FICHIER

---

### ÉTAPE 1 — `service/impl/OperationsDelegueeServiceImpl.java`

**Modifier** `leveeSuspensionDossier` pour ajouter le lock pessimiste :

```java
@Override
public OuvertureDossierDTO leveeSuspensionDossier(LeveeSuspensionDTO dto, boolean finalize) {
    log.info("[leveeSuspensionDossier] ⏳ Tentative d'acquisition du lock sur dossier {}", dto.getNumDossier());
    
    // Lock pessimiste sur OperationsDeleguee
    OperationsDeleguee dossier = operationsDelegueeRepository.findByIdForUpdate(dto.getNumDossier())
            .orElseThrow(() -> new ResourceNotFoundException("Dossier not found"));
    
    log.info("[leveeSuspensionDossier] ✅ Lock acquis sur dossier {}", dto.getNumDossier());
    
    // Vérifier etatDossier == 'B'
    if (!"B".equals(dossier.getEtatDossier())) {
        throw new BusinessException("DOSSIER_NON_SUSPENDU", "Dossier non suspendu pour levée");
    }
    
    // Validations métier
    validateLeveeSuspension(dto, dossier);
    
    if (finalize) {
        // Appliquer levée
        dossier.setEtatDossier("V");
        dossier.setCodeEtat(null);  // réinitialisation
        dossier.setMotifEtat(dto.getMotifEtat());
        dossier.setDateEtat(LocalDate.now());
        
        // Si codeEtat précédent == 1 → MAJ numBct/dateBct
        if (Objects.equals(dossier.getCodeEtat(), (short) 1)) {
            dossier.setNumeroBct(dto.getNumBct());
            dossier.setDateBct(dto.getDateBct());
        }
        
        operationsDelegueeRepository.save(dossier);
        
        // Créer MVT status='A'
        createLeveeSuspensionMovement(dossier, "A", dto);
        
        return buildSuspensionResultDTO(dossier);
    } else {
        // MVT status='X' uniquement
        createLeveeSuspensionMovement(dossier, "X", dto);
        return buildSuspensionResultDTO(dossier); // DTO minimal ?
    }
}
```

---

## 🔄 FLUX COMPLETS APRÈS IMPLÉMENTATION

### leveeSuspensionDossier — finalize=true (cas normal)

```
POST /api/levee-suspension/true
{
  "numDossier": 6110227,
  "motifEtat": "Situation régularisée"
}

→ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate)
→ Vérifier etatDossier == 'B'
→ Validations métier (motifEtat obligatoire)
→ etatDossier = 'V', codeEtat=null, motifEtat=..., dateEtat=today
→ Créer MVT status='A'
→ 200 { ... etatDossier: "V" }
```

### leveeSuspensionDossier — finalize=true (cas codeEtat=1)

```
POST /api/levee-suspension/true
{
  "numDossier": 6110227,
  "motifEtat": "Accord BCT fourni",
  "numBct": "12345",
  "dateBct": "2025-03-08"
}

→ Lock pessimiste sur OperationsDeleguee
→ Vérifier etatDossier == 'B' et codeEtat==1
→ Validations métier (numBct/dateBct obligatoires)
→ etatDossier = 'V', codeEtat=null, motifEtat=..., dateEtat=today
→ numeroBct="12345", dateBct=2025-03-08
→ Créer MVT status='A'
→ 200 { ... etatDossier: "V", numeroBct: "12345" }
```

### leveeSuspensionDossier — finalize=false

```
POST /api/levee-suspension/false
{
  "numDossier": 6110227,
  "motifEtat": "Vérification en cours"
}

→ Lock pessimiste sur OperationsDeleguee
→ Vérifier etatDossier == 'B'
→ Validations métier
→ Créer MVT status='X' uniquement
→ Aucun impact sur dossier
→ 200 { ... }
```

---

## 📊 TABLEAU COMPARATIF FINAL

| Aspect | OperationsDelegueesMvt (modèle) | leveeSuspensionDossier (cible) |
|---|---|---|
| **Lock pessimiste** | `findByIdForUpdate()` sur dossier | ✅ Identique sur OperationsDeleguee |
| **Vérification état** | Selon logique métier | ✅ etatDossier == 'B' |
| **MAJ dossier** | `applyMvtToDossier()` | ✅ etatDossier='V' + codeEtat=null + motifEtat + dateEtat |
| **Status MVT** | 'A' ou 'E' | ✅ 'A' ou 'X' |
| **Conditionnel** | Selon logique | ✅ numBct/dateBct si codeEtat précédent=1 |

---

## ⚙️ GARANTIES IDENTIQUES

| Garantie | Mécanisme |
|---|---|
| **Sérialisation** | Lock pessimiste → une levée à la fois par dossier |
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
