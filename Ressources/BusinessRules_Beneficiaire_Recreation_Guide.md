# BusinessRules_Beneficiaire Module — Recreation & Integration Guide

This guide provides everything you need to recreate the **Bénéficiaire (createOrUpdateBeneficiaire)** module and merge it into another Spring Boot project.

---

## 1. Module Architecture Overview

The Bénéficiaire module handles the creation and update of beneficiaries linked to delegated operations (AVA dossiers). It follows a multi-layer Spring Boot architecture:

1. **API Layer**: `BeneficiaireController` — Exposes REST endpoints at `/api/beneficiaires`.
2. **Service Layer**:
   - `BeneficiaireService` (Interface) & `BeneficiaireServiceImpl` (Implementation): Contains the business logic for create/update with `finalize` pattern.
3. **Data Layer**:
   - **Entities**: `Beneficiaire`, `BeneficiaireId` (composite key), `OperationsDeleguee`, `OperationsDelegueesMvt`.
   - **Repositories**: `BeneficiaireRepository`, `OperationsDelegueeRepository`, `OperationsDelegueeMvtRepository`.
4. **Integration Layer**: `ApiExterneService` — Calls the external REF API to verify person existence (`verifierPersonne`).

---

## 2. Database Schema (Entities)

### Core Tables

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `BENEFICIAIRE` | Beneficiaries linked to dossiers | `NUM_DOSSIER`, `DATE_DOSSIER`, `TYPE_PIECE_BENEF`, `NO_PIECE_BENEF` (composite PK) |
| `OPERATIONS_DELEGUEES` | Parent dossier | `NUM_DOSSIER` |
| `OPERATIONS_DELEGUEES_MVT` | Movement history for audit | `REF_OPERATION`, `DATE_OPERATION` |

### Key Entity: `Beneficiaire.java`

Stores one beneficiary record per dossier/piece combination.

**Composite Primary Key** (`BeneficiaireId`):

```java
@Embeddable
public class BeneficiaireId implements Serializable {
    private Integer numDossier;
    private LocalDate dateDossier;
    private Integer typePieceBenef;   // 1 = CIN, 4 = Passeport, 7 = Autre
    private String noPieceBenef;
}
```

**Important Fields**:

| Field | Type | Description |
| :--- | :--- | :--- |
| `nomBenef` | `String` | Full name — required |
| `adresseBenef` | `String` | Address — required |
| `qualite` | `String` | Role: `Dirigeant`, `Conseil d'administration`, `Employé` |
| `datePiece` | `LocalDate` | Piece issuance date — must be before today |
| `etat` | `String` | Status: `AA`, `A`, `AD`, `N` |
| `codeTypeDos` | `Short` | Type of dossier — required |
| `codeAgenceAva` | `Long` | Agency code — default `1` if null |
| `dateCreation` | `LocalDate` | Auto-set to `LocalDate.now()` on creation |

---

## 3. Data Transfer Objects (DTOs)

### `BeneficiaireDTO`

```java
public class BeneficiaireDTO {
    private Integer numDossier;      // required
    private LocalDate dateDossier;   // required
    private Integer typePieceBenef;  // required: 1, 4, or 7
    private String noPieceBenef;     // required; CIN format if type=1
    private Short codeTypeDos;       // required
    private Long codeAgenceAva;      // optional — default: 1
    private String nomBenef;         // required
    private String adresseBenef;     // required
    private String qualite;          // required: "Dirigeant", "Conseil d'administration", "Employé"
    private LocalDate datePiece;     // required — must be before today
    private String etat;             // required: "AA", "A", "AD", "N"
    private LocalDate dateCreation;  // auto-set on creation
    private LocalDate dateSuppression;
}
```

---

## 4. Business Logic — `BeneficiaireServiceImpl`

### Workflow (`createOrUpdateBeneficiaire`)

#### Phase commune (toujours exécutée, `finalize` = true **ou** false)

1. **Validation `numDossier`** — requis.
2. **Lock pessimiste sur dossier** — `operationsDelegueeRepository.findByIdForUpdate(numDossier)`.
3. **Contrôles de saisie** :

| Champ | Règle |
| :--- | :--- |
| `numDossier` | Obligatoire |
| `dateDossier` | Obligatoire |
| `typePieceBenef` | Obligatoire — valeurs: `1`, `4`, `7` |
| `noPieceBenef` | Obligatoire — format CIN (`\d{7}[A-Za-z]`) si `type=1` |
| `codeTypeDos` | Obligatoire |
| `nomBenef` | Obligatoire, non vide |
| `adresseBenef` | Obligatoire, non vide |
| `qualite` | Obligatoire — `"Dirigeant"`, `"Conseil d'administration"`, `"Employé"` |
| `datePiece` | Obligatoire — doit être **avant aujourd'hui** |
| `etat` | Obligatoire — `"AA"`, `"A"`, `"AD"`, `"N"` |
| `noPieceBenef` (API REF) | Doit exister dans la table **Personne** via `apiExterneService.existsPersonneByNoPiece()` |

#### Phase `finalize = true` (comportement complet)

4. **Appliquer les valeurs par défaut** : `codeAgenceAva = 1` si null.
5. **Construire `BeneficiaireId`** composite.
6. **Chercher bénéficiaire existant** avec `findByIdForUpdate(id)` :
   - Si **trouvé** → UPDATE des champs modifiables.
   - Si **non trouvé** → INSERT avec `dateCreation = LocalDate.now()`.
7. **Sauvegarder** (`beneficiaireRepository.save`).
8. **Créer mouvement** dans `OPERATIONS_DELEGUEES_MVT` : `status = 'A'`.
9. **Mettre à jour** `dernierNumMvtAva` dans `OPERATIONS_DELEGUEES`.

#### Phase `finalize = false` (MVT brouillon uniquement)

4. **Créer mouvement** dans `OPERATIONS_DELEGUEES_MVT` : `status = 'X'`.
5. **Aucune modification** dans `BENEFICIAIRE`.
6. Retourner un DTO minimal (`numDossier`, `dateDossier`).

### Création du Mouvement (`createMovement`)

```java
private void createMovement(OperationsDeleguee operationsDeleguee, String status, BeneficiaireDTO dto) {
    Long refOperation = operationsMvtRepository.getNextRefOperation(); // Oracle sequence AVA.AVA_REF_OPR
    OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
    mvtId.setRefOperation(refOperation);
    mvtId.setDateOperation(LocalDate.now());

    OperationsDelegueesMvt mvt = new OperationsDelegueesMvt();
    // ... copie de tous les champs du dossier ...
    Integer newNumMvtAva = (operationsDeleguee.getDernierNumMvtAva() != null
            ? operationsDeleguee.getDernierNumMvtAva() : 0) + 1;
    mvt.setNumMvtAva(newNumMvtAva);
    mvt.setStatus(status); // "A" ou "X"
    mvt.setCodeProduitService((short) 1);
    mvt.setCodeOperation(1);

    operationsMvtRepository.save(mvt);

    // Mise à jour du dossier uniquement si status 'A'
    if ("A".equals(status)) {
        operationsDeleguee.setDernierNumMvtAva(newNumMvtAva);
        operationsDelegueeRepository.save(operationsDeleguee);
    }
}
```

---

## 5. API Endpoints

### `BeneficiaireController` (`/api/beneficiaires`)

| Method | Endpoint | `finalize` | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/beneficiaires/{Finalize}` | `true` | Crée/MAJ bénéficiaire + MVT `status='A'` |
| `POST` | `/api/beneficiaires/{Finalize}` | `false` | MVT `status='X'` uniquement (brouillon) |
| `GET` | `/api/beneficiaires/{numDossier}` | — | Liste tous les bénéficiaires d'un dossier |

**Réponse HTTP** : `201 Created` avec `BeneficiaireDTO`.

---

## 6. Validation Rules (synthèse)

### Champs obligatoires (toujours)

```
numDossier, dateDossier, typePieceBenef, noPieceBenef, codeTypeDos,
nomBenef, adresseBenef, qualite, datePiece, etat
```

### Règles métier

| Règle | Détail |
| :--- | :--- |
| **typePieceBenef** | Doit être `1` (CIN), `4` (Passeport) ou `7` (Autre) |
| **Format CIN** | Si `typePieceBenef = 1` : regex `\d{7}[A-Za-z]` (ex: `1234567A`) |
| **qualite** | `"Dirigeant"`, `"Conseil d'administration"` ou `"Employé"` |
| **datePiece** | Doit être **strictement avant** `LocalDate.now()` |
| **etat** | `"AA"`, `"A"`, `"AD"` ou `"N"` |
| **Personne (API REF)** | `noPieceBenef` doit exister en base via l'API REF externe |
| **Dossier état** | Le dossier parent (`OPERATIONS_DELEGUEES`) doit exister |

---

## 7. Effect on `OPERATIONS_DELEGUEES`

| Action | `finalize=true` | `finalize=false` |
| :--- | :--- | :--- |
| `BENEFICIAIRE` | INSERT ou UPDATE | ❌ Non touché |
| `OPERATIONS_DELEGUEES_MVT` | INSERT : `status='A'` | INSERT : `status='X'` |
| `DERNIER_NUM_MVT_AVA` | Incrémenté (`+1`) | ❌ Non touché |

---

## 8. Step-by-Step Integration Guide

### Étape 1 : Copier Entités & Repositories

- `Beneficiaire.java`, `BeneficiaireId.java`
- `BeneficiaireRepository.java` (avec `findByIdForUpdate`, `findByIdNumDossier`)
- `OperationsDeleguee.java`, `OperationsDelegueeRepository.java`
- `OperationsDelegueeMvtRepository.java` (avec `getNextRefOperation()`)

### Étape 2 : Copier DTO & Mapper

- `BeneficiaireDTO.java`
- `BeneficiaireMapper.java`

### Étape 3 : Configurer `ApiExterneService`

Le module appelle :
- `existsPersonneByNoPiece(noPieceBenef)` — vérifie existence dans table `PERSONNE` via API REF.

### Étape 4 : Enregistrer Service & Contrôleur

- `BeneficiaireServiceImpl` → `@Service @Transactional`
- `BeneficiaireController` → `@RestController @RequestMapping("/api/beneficiaires")`

### Étape 5 : Exemples JSON

#### finalize=true (création)

```json
POST /api/beneficiaires/true
{
  "numDossier": 6110227,
  "dateDossier": "2025-01-15",
  "typePieceBenef": 1,
  "noPieceBenef": "1234567A",
  "codeTypeDos": 1,
  "nomBenef": "Mohamed Ben Ali",
  "adresseBenef": "12 Rue de la République, Tunis",
  "qualite": "Dirigeant",
  "datePiece": "2020-05-10",
  "etat": "A"
}
```

#### finalize=false (brouillon MVT seul)

```json
POST /api/beneficiaires/false
{
  "numDossier": 6110227,
  "dateDossier": "2025-01-15",
  "typePieceBenef": 1,
  "noPieceBenef": "1234567A",
  ...
}
```

---

## 9. Validation Rules — Errors

| Code | Condition | HTTP |
| :--- | :--- | :--- |
| Business Exception | `numDossier` absent | 400 |
| Business Exception | `typePieceBenef` ∉ {1, 4, 7} | 400 |
| `FORMAT_CIN_INVALIDE` | CIN ne respecte pas `\d{7}[A-Za-z]` | 400 |
| Business Exception | `qualite` invalide | 400 |
| Business Exception | `datePiece` ≥ aujourd'hui | 400 |
| Business Exception | `etat` ∉ {AA, A, AD, N} | 400 |
| `CLIENT_NON_TROUVE` | Personne absente de l'API REF | 400 |
| `ResourceNotFoundException` | Dossier parent introuvable | 404 |

---

## 10. 🔧 PLAN — Implémenter le Lock Pessimiste sur createOrUpdateBeneficiaire

> **Date** : 13 mars 2026  
> **Objectif** : Reproduire EXACTEMENT le pattern de lock pessimiste de `OperationsDelegueesMvt` sur `createOrUpdateBeneficiaire`  
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

### Pattern actuel dans `createOrUpdateBeneficiaire` (À MODIFIER)

```
POST /api/beneficiaires/{Finalize}
Controller
    └─ service.createOrUpdateBeneficiaire(dto, finalizeFlag)
         ├─ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate)
         ├─ Validations métier
         └─ Phase finalize=true : MAJ/INSERT Beneficiaire + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

### ❌ Problèmes actuels de `createOrUpdateBeneficiaire` (sans lock complet)

| # | Problème | Conséquence |
|---|---|---|
| 1 | Lock seulement sur OperationsDeleguee | Pas de protection contre accès concurrent sur Beneficiaire |
| 2 | Race condition sur création bénéficiaire | 2 threads peuvent créer le même bénéficiaire en même temps |
| 3 | Pas de lock pessimiste sur Beneficiaire | UPDATE concurrent possible sur la même entité |

---

## 🎯 CIBLE : Pattern avec Lock Pessimiste Complet

```
POST /api/beneficiaires/{Finalize}
Controller
    └─ service.createOrUpdateBeneficiaire(dto, finalizeFlag)
         ├─ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate)
         ├─ Validations métier
         ├─ Construire BeneficiaireId composite
         ├─ Lock pessimiste sur Beneficiaire (findByIdForUpdate) ← AJOUTÉ
         └─ Phase finalize=true : MAJ/INSERT Beneficiaire + MVT status='A'
         └─ Phase finalize=false : MVT status='X' uniquement
```

---

## 📝 FICHIERS À MODIFIER (2 fichiers, 0 nouveau)

| # | Fichier | Action |
|---|---|---|
| 1 | `repository/BeneficiaireRepository.java` | Ajouter `findByIdForUpdate(BeneficiaireId id)` |
| 2 | `service/impl/BeneficiaireServiceImpl.java` | Utiliser `findByIdForUpdate` sur Beneficiaire + logs de lock |

---

## 📋 DÉTAIL FICHIER PAR FICHIER

---

### ÉTAPE 1 — `repository/BeneficiaireRepository.java`

**Ajouter** la méthode de lock pessimiste :

```java
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT b FROM Beneficiaire b WHERE b.id = :id")
Optional<Beneficiaire> findByIdForUpdate(@Param("id") BeneficiaireId id);
```

---

### ÉTAPE 2 — `service/impl/BeneficiaireServiceImpl.java`

**Modifier** `createOrUpdateBeneficiaire` pour ajouter le lock sur Beneficiaire :

```java
@Override
public BeneficiaireDTO createOrUpdateBeneficiaire(BeneficiaireDTO dto, boolean finalize) {
    log.info("[createOrUpdateBeneficiaire] ⏳ Tentative d'acquisition du lock sur dossier {}", dto.getNumDossier());
    
    // Lock pessimiste sur OperationsDeleguee
    OperationsDeleguee operationsDeleguee = operationsDelegueeRepository.findByIdForUpdate(dto.getNumDossier())
            .orElseThrow(() -> new ResourceNotFoundException("Dossier not found"));
    
    log.info("[createOrUpdateBeneficiaire] ✅ Lock acquis sur dossier {}", dto.getNumDossier());
    
    // Validations
    validateInput(dto);
    
    if (finalize) {
        // Construire BeneficiaireId
        BeneficiaireId beneficiaireId = buildBeneficiaireId(dto);
        
        log.info("[createOrUpdateBeneficiaire] ⏳ Tentative d'acquisition du lock sur bénéficiaire {}", beneficiaireId);
        
        // Lock pessimiste sur Beneficiaire
        Optional<Beneficiaire> existingBeneficiaire = beneficiaireRepository.findByIdForUpdate(beneficiaireId);
        
        log.info("[createOrUpdateBeneficiaire] ✅ Lock acquis sur bénéficiaire {}", beneficiaireId);
        
        Beneficiaire beneficiaire;
        if (existingBeneficiaire.isPresent()) {
            // UPDATE
            beneficiaire = existingBeneficiaire.get();
            updateBeneficiaireFromDto(beneficiaire, dto);
        } else {
            // INSERT
            beneficiaire = new Beneficiaire();
            beneficiaire.setId(beneficiaireId);
            beneficiaire.setDateCreation(LocalDate.now());
            updateBeneficiaireFromDto(beneficiaire, dto);
        }
        
        beneficiaireRepository.save(beneficiaire);
        
        // Créer MVT status='A'
        createMovement(operationsDeleguee, "A", dto);
        
        return mapper.toDto(beneficiaire);
    } else {
        // MVT status='X' uniquement
        createMovement(operationsDeleguee, "X", dto);
        return new BeneficiaireDTO(); // DTO minimal
    }
}
```

---

## 🔄 FLUX COMPLETS APRÈS IMPLÉMENTATION

### createOrUpdateBeneficiaire — finalize=true

```
POST /api/beneficiaires/true
{
  "numDossier": 6110227,
  "typePieceBenef": 1,
  "noPieceBenef": "1234567A",
  ...
}

→ Lock pessimiste sur OperationsDeleguee (findByIdForUpdate)
→ Validations métier
→ Construire BeneficiaireId composite
→ Lock pessimiste sur Beneficiaire (findByIdForUpdate)
→ Si existe → UPDATE, sinon INSERT avec dateCreation=now()
→ Sauvegarder Beneficiaire
→ Créer MVT status='A' + MAJ dernierNumMvtAva
→ 201 { ... }
```

### createOrUpdateBeneficiaire — finalize=false

```
POST /api/beneficiaires/false
{
  "numDossier": 6110227,
  ...
}

→ Lock pessimiste sur OperationsDeleguee
→ Validations métier
→ Créer MVT status='X' uniquement
→ Aucun impact sur Beneficiaire
→ 201 { numDossier, ... }
```

---

## 📊 TABLEAU COMPARATIF FINAL

| Aspect | OperationsDelegueesMvt (modèle) | createOrUpdateBeneficiaire (cible) |
|---|---|---|
| **Lock pessimiste** | `findByIdForUpdate()` sur dossier | ✅ Identique sur OperationsDeleguee + Beneficiaire |
| **Idempotence** | Si status A → skip | ✅ Lock empêche concurrence |
| **Gestion d'erreur** | try/catch → status E | ✅ Exception si lock échoue |
| **Backward compat** | `create(dto)` sans finalize | ✅ `finalize=false` fonctionne |
| **Tables impactées** | OPERATIONS_DELEGUEES_MVT | BENEFICIAIRE + OPERATIONS_DELEGUEES_MVT |

---

## ⚙️ GARANTIES IDENTIQUES

| Garantie | Mécanisme |
|---|---|
| **Sérialisation** | Lock pessimiste → un thread à la fois par dossier/bénéficiaire |
| **Idempotence** | Lock empêche les accès concurrents |
| **Atomicité** | Transaction Spring @Transactional |
| **Logs de lock** | `[⏳ Tentative...]` et `[✅ Lock acquis]` |
| **Même pattern** | Copié exactement d'OperationsDelegueesMvt |

---

## 🚀 ORDRE D'EXÉCUTION

```
Étape 1 → repository/BeneficiaireRepository.java     (ajout findByIdForUpdate)
Étape 2 → service/impl/BeneficiaireServiceImpl.java (utilisation du lock)
```

**2 fichiers modifiés. 0 nouveau fichier. Lock pessimiste complet.**

---

## ✅ VALIDATION

> **Répondez "GO" pour lancer l'implémentation.**
