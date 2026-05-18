# 🔧 PLAN — Implémenter le pattern `finalize` sur `ReservationOperation`

> **Date** : 2 mars 2026  
> **Objectif** : Reproduire EXACTEMENT le pattern `create(dto, finalize)` + `writeDossier()` de `OperationsDelegueesMvt` sur `ReservationOperation`  
> **Règle** : NE RIEN INVENTER. Copier la même mécanique. Même architecture.

---

## 📊 COMPARAISON : Ce qui existe vs. Ce qu'on veut

### Pattern existant dans `OperationsDelegueesMvt` (MODÈLE)

```
POST /api/operations-deleguees-mvt/initialisation?finalize=true

Controller (aucune logique)
    └─ service.create(dto, finalize)
         ├─ Phase 1 : Insert MVT status=I + validations métier + relations
         └─ Phase 2 (si finalize=true) : writeDossier(mvt)
              ├─ mvt.status = "V" + dateValidation = now
              ├─ applyMvtToDossier(numDossier)   ← lock pessimiste + idempotence
              ├─ si OK → mvt.status = "A"
              └─ si KO → mvt.status = "E"
```

### Pattern actuel dans `ReservationOperation` (À MODIFIER)

```
POST /api/reservation-operations          ← pas de ?finalize
    └─ service.create(dto)
         ├─ Insert MVT status=I
         ├─ Validations métier
         └─ si status == "V" → processMvtImmediately()   ← condition jamais vraie car status=I !

PUT /api/reservation-operations/validate/{referenceRes}   ← endpoint séparé
    └─ service.validateAndProcessByReferenceRes(ref)
         ├─ Cherche MVT par referenceRes, status != V
         ├─ mvt.status = "V"
         └─ processMvtImmediately(mvt)                   ← PAS de lock pessimiste, PAS de A/E
```

### ❌ Problèmes actuels de `ReservationOperation`

| # | Problème | Conséquence |
|---|---|---|
| 1 | Pas de paramètre `finalize` | Obligation de faire 2 appels (create + validate séparé) |
| 2 | `processMvtImmediately` ne met PAS status A | Le MVT reste en V pour toujours, jamais "terminé" |
| 3 | Pas de lock pessimiste sur le dossier | Race condition si 2 réservations en même temps |
| 4 | Pas de gestion status E | Si `processMvtImmediately` échoue → exception non rattrapée |
| 5 | `create()` ne peut jamais finalize | Le `if (STATUS_VALIDE.equals(saved.getStatus()))` est toujours faux car on vient de mettre I |

---

## 🎯 CIBLE : Pattern identique à `OperationsDelegueesMvt`

```
POST /api/reservation-operations?finalize=true              ← réservation 269
POST /api/reservation-operations/annulation?finalize=true   ← annulation 231

Controller (aucune logique)
    └─ service.create(dto, finalize)  ou  service.createAnnulation(dto, finalize)
         ├─ Phase 1 : Insert MVT status=I + validations
         └─ Phase 2 (si finalize=true) : writeDossierReservation(mvt)
              ├─ mvt.status = "V" + dateValidation = now
              ├─ applyReservationToDossier(mvt)   ← lock pessimiste + idempotence
              ├─ si OK → mvt.status = "A"
              └─ si KO → mvt.status = "E"
```

---

## 📝 FICHIERS À MODIFIER (5 fichiers, 0 nouveau)

| # | Fichier | Action |
|---|---|---|
| 1 | `service/ReservationOperationService.java` | Ajouter signatures `create(dto, finalize)` et `createAnnulation(dto, finalize)` |
| 2 | `service/impl/ReservationOperationServiceImpl.java` | Refactorer `create` / `createOprAnnulation` + ajouter `writeDossierReservation` + `applyReservationToDossier` |
| 3 | `controller/ReservationOperationController.java` | Ajouter `@RequestParam("finalize")` sur les endpoints create/annulation |
| 4 | `DTO/OperationCreationResponseDTO.java` | Aucun changement (déjà réutilisable) |
| 5 | `repository/OperationsDelegueeRepository.java` | Aucun changement (`findByIdForUpdate` existe déjà) |

---

## 📋 DÉTAIL FICHIER PAR FICHIER

---

### ÉTAPE 1 — `service/ReservationOperationService.java`

**Ajouter** les nouvelles signatures avec `finalize` :

```java
// ── NOUVELLES SIGNATURES ──

/** Crée une réservation (269). Si finalize=true → valide + applique au dossier */
OperationCreationResponseDTO create(ReservationOperationDTO dto, boolean finalize);

/** Crée une annulation (231). Si finalize=true → valide + applique au dossier */
OperationCreationResponseDTO createAnnulation(ReservationOperationDTO dto, boolean finalize);
```

**Garder** les anciennes signatures pour backward compat :
- `create(dto)` → délègue à `create(dto, false)`
- `createOprAnnulation(dto)` → délègue à `createAnnulation(dto, false)`

---

### ÉTAPE 2 — `service/impl/ReservationOperationServiceImpl.java`

C'est le fichier principal. Voici les modifications :

#### 2a. Refactorer `create(dto)` → backward compat

```java
@Override
public ReservationOperationDTO create(ReservationOperationDTO dto) {
    // Backward compat
    OperationCreationResponseDTO resp = create(dto, false);
    return getById(resp.getRefOperation());
}
```

#### 2b. Nouvelle méthode `create(dto, finalize)`

Exactement le même pattern que `OperationsDelegueesMvtServiceImpl.create()` :

```
create(dto, finalize) {
    // Phase 1 : Identique à l'actuel
    LocalDate now = LocalDate.now();
    Long refOperation = mvtRepository.getNextRefOperation();
    OperationsDeleguee dossier = getDossierOrThrow(dto.getNumDossier());
    OperationsDelegueesMvt entity = buildNewEntity(refOperation, now, dossier);
    validateBusinessRules(dto, entity);
    mapper.updateEntityFromDto(dto, entity);
    entity.setReferenceRes(dto.getReference());
    entity.setCodeOperation(CODE_OPERATION_RESERVATION);  // 269
    entity.setCodeProduitService(CODE_PRODUIT_SERVICE);
    fillSnapshotFromDossier(entity, dossier);
    OperationsDelegueesMvt saved = mvtRepository.saveAndFlush(entity);

    if (!finalize) {
        return new OperationCreationResponseDTO(refOp, numDossier, "I", null);
    }

    // Phase 2 : Finalize
    return writeDossierReservation(saved);
}
```

#### 2c. Même chose pour `createAnnulation(dto, finalize)`

Pattern identique mais avec `CODE_OPERATION_RESERVATION_ANNULATION = 231`.

#### 2d. Nouvelle méthode privée `writeDossierReservation(mvt)`

**Exactement** le même pattern que `writeDossier()` dans `OperationsDelegueesMvtServiceImpl` :

```java
private OperationCreationResponseDTO writeDossierReservation(OperationsDelegueesMvt mvt) {
    LocalDate now = LocalDate.now();
    Long refOp = mvt.getId().getRefOperation();
    Integer numDossier = mvt.getNumDossier();

    // 1) Marquer V
    mvt.setStatus("V");
    mvt.setDateValidation(now);
    mvtRepository.save(mvt);

    // 2) Appliquer au dossier (avec lock pessimiste)
    try {
        applyReservationToDossier(mvt);

        // 3a) Succès → A
        mvt.setStatus("A");
        mvtRepository.save(mvt);
        return new OperationCreationResponseDTO(refOp, numDossier, "A", "Réservation appliquée avec succès");

    } catch (Exception e) {
        // 3b) Échec → E
        mvt.setStatus("E");
        mvtRepository.save(mvt);
        return new OperationCreationResponseDTO(refOp, numDossier, "E", "Erreur: " + e.getMessage());
    }
}
```

#### 2e. Nouvelle méthode `applyReservationToDossier(mvt)`

Refactoring de `processMvtImmediately()` avec :
- **Lock pessimiste** via `dossierRepository.findByIdForUpdate(numDossier)`
- **Idempotence** : si mvt.status == "A" → skip
- Logique métier identique (réservation ou annulation selon codeOperation)

```java
private void applyReservationToDossier(OperationsDelegueesMvt mvt) {
    Integer numDossier = mvt.getNumDossier();

    // Idempotence
    if ("A".equals(mvt.getStatus())) {
        log.info("MVT refOp={} déjà appliqué, skip", mvt.getId().getRefOperation());
        return;
    }

    // Lock pessimiste sur le dossier
    OperationsDeleguee dossier = dossierRepository.findByIdForUpdate(numDossier)
            .orElseThrow(() -> new BusinessException("DOSSIER_NON_TROUVE", "..."));

    Integer codeOperation = mvt.getCodeOperation();

    if (Objects.equals(codeOperation, CODE_OPERATION_RESERVATION)) {
        // ── Réservation 269 ──
        reservationService.createFromMvt(mvt);
        BigDecimal nouveauMntReserve = defaultZero(dossier.getMntReserve()).add(defaultZero(mvt.getMntMvtAva()));
        dossier.setMntReserve(nouveauMntReserve);
        // ... recalcul solde (identique à processMvtImmediately actuel)

    } else if (Objects.equals(codeOperation, CODE_OPERATION_RESERVATION_ANNULATION)) {
        // ── Annulation 231 ──
        reservationService.createAnnulationFromMvt(mvt);
        BigDecimal nouveauReserve = defaultZero(dossier.getMntReserve()).subtract(defaultZero(mvt.getMntMvtAva()));
        dossier.setMntReserve(nouveauReserve);
        // ... recalcul solde (identique à processMvtImmediately actuel)
    }

    dossier.setSolde(businessRulesService.calculerSolde(...));
    dossierRepository.save(dossier);
}
```

#### 2f. Refactorer `validateAndProcessByReferenceRes`

Utilise maintenant `writeDossierReservation` au lieu de `processMvtImmediately` :

```java
@Override
public ReservationOperationDTO validateAndProcessByReferenceRes(String referenceRes) {
    // ... même recherche qu'avant ...

    // Au lieu de :
    //   mvt.setStatus("V");
    //   processMvtImmediately(saved);

    // Maintenant :
    OperationCreationResponseDTO resp = writeDossierReservation(mvt);
    // resp.status sera "A" ou "E"
    return mapper.toDto(mvtRepository.findByIdRefOperation(mvt.getId().getRefOperation()).get(0));
}
```

---

### ÉTAPE 3 — `controller/ReservationOperationController.java`

**Modifier** les endpoints `create` et `annulation` pour ajouter `?finalize` :

```java
// AVANT
@PostMapping
public ResponseEntity<ReservationOperationDTO> create(@Valid @RequestBody ReservationOperationDTO dto)

// APRÈS
@PostMapping
public ResponseEntity<OperationCreationResponseDTO> create(
        @Valid @RequestBody ReservationOperationDTO dto,
        @RequestParam(name = "finalize", defaultValue = "false") boolean finalize)
```

Même chose pour `/annulation`.

**Réponse** :
- `finalize=false` → `201 Created` avec `{ refOperation, numDossier, status: "I" }`
- `finalize=true` → `201 Created` avec `{ refOperation, numDossier, status: "A", message: "..." }`

---

## 🔄 FLUX COMPLETS APRÈS IMPLÉMENTATION

### Réservation (269) — finalize=false (brouillon)

```
POST /api/reservation-operations?finalize=false
{
    "numDossier": 123,
    "mntMvtAva": 5000,
    "origine": "MONETIQUE",
    "reference": "RES-001"
}

→ Insert MVT status=I, codeOp=269
→ Aucun impact dossier
→ 201 { refOperation: 456, numDossier: 123, status: "I" }
```

### Réservation (269) — finalize=true

```
POST /api/reservation-operations?finalize=true
{
    "numDossier": 123,
    "mntMvtAva": 5000,
    "origine": "MONETIQUE",
    "reference": "RES-001"
}

→ Insert MVT status=I, codeOp=269
→ Validations métier (solde suffisant, origine valide, dossier état V)
→ MVT status I → V
→ Lock dossier 123 (SELECT FOR UPDATE)
→ reservationService.createFromMvt(mvt) → table RESERVATION
→ dossier.mntReserve += 5000
→ dossier.solde recalculé
→ MVT status V → A
→ 201 { refOperation: 456, numDossier: 123, status: "A", message: "Réservation appliquée avec succès" }
```

### Annulation (231) — finalize=true

```
POST /api/reservation-operations/annulation?finalize=true
{
    "numDossier": 123,
    "mntMvtAva": 2000,
    "origine": "MONETIQUE",
    "reference": "RES-001"
}

→ Insert MVT status=I, codeOp=231
→ Validations métier
→ MVT status I → V
→ Lock dossier 123 (SELECT FOR UPDATE)
→ reservationService.createAnnulationFromMvt(mvt) → table RESERVATION
→ dossier.mntReserve -= 2000
→ dossier.solde recalculé
→ MVT status V → A
→ 201 { refOperation: 789, numDossier: 123, status: "A", message: "Annulation appliquée avec succès" }
```

### Validation par referenceRes (endpoint existant conservé)

```
PUT /api/reservation-operations/validate/RES-001

→ Cherche MVT par referenceRes, status != V
→ writeDossierReservation(mvt)   ← utilise maintenant le même pattern
→ Lock pessimiste + idempotence + A/E
→ 200 { ... }
```

---

## 📊 TABLEAU COMPARATIF FINAL

| Aspect | OperationsDelegueesMvt (existant) | ReservationOperation (cible) |
|---|---|---|
| **Endpoint create** | `POST /initialisation?finalize=` | `POST /?finalize=` |
| **Param finalize** | ✅ `@RequestParam` | ✅ Identique |
| **Insert MVT** | status=I | status=I |
| **Validations** | `runValidations()` | `validateBusinessRules()` |
| **writeDossier** | `writeDossier(mvt)` | `writeDossierReservation(mvt)` |
| **Lock pessimiste** | `findByIdForUpdate()` | `findByIdForUpdate()` (même) |
| **Apply** | `applyMvtToDossier()` | `applyReservationToDossier()` |
| **Idempotence** | si dossier existe → UPDATE | si status A → skip |
| **Status A** | ✅ | ✅ (ajouté) |
| **Status E** | ✅ | ✅ (ajouté) |
| **Response DTO** | `OperationCreationResponseDTO` | `OperationCreationResponseDTO` (même) |

---

## ⚙️ GARANTIES IDENTIQUES

| Garantie | Mécanisme |
|---|---|
| **Pas de logique métier en controller** | Controller ne fait que `service.create(dto, finalize)` |
| **Lock pessimiste** | `findByIdForUpdate` sur dossier → sérialisation |
| **Idempotence** | `applyReservationToDossier` : si status A → skip |
| **Gestion d'erreur** | try/catch → status E (pas d'exception non rattrapée) |
| **Backward compat** | `create(dto)` sans finalize fonctionne toujours |
| **Même DTO de réponse** | `OperationCreationResponseDTO` réutilisé |
| **Même table** | Tout dans `OPERATIONS_DELEGUEES_MVT` |

---

## 🚀 ORDRE D'EXÉCUTION

```
Étape 1 → service/ReservationOperationService.java         (signatures)
Étape 2 → service/impl/ReservationOperationServiceImpl.java (implémentation complète)
Étape 3 → controller/ReservationOperationController.java    (ajout ?finalize)
```

**3 fichiers modifiés. 0 nouveau fichier. Pattern identique.**

---

## ✅ VALIDATION

> **Répondez "GO" pour lancer l'implémentation.**

