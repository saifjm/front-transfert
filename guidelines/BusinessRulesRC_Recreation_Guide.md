# BusinessRulesRC (Rétrocession) Module — Recreation & Integration Guide

This guide provides everything needed to recreate the **BusinessRulesRC** module and merge it into another Spring Boot project.

---

## 1. What Is the RC Module?

The RC module handles **Rétrocession** (Retrocession) operations — the process of **reversing or partially refunding** a previously recorded Frais de Voyage (FV) travel movement.

There are **two sub-types**:

| Code | Name | Description |
| :--- | :--- | :--- |
| [RAV](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/impl/BusinessRulesRcServiceImpl.java#555-567) | Rétrocession AVA | Full cancellation of an existing FV movement. The amount is fetched **automatically** from the original movement in the database. |
| `RRV` | Remboursement Rétrocession Voyage | Partial refund. The caller supplies the amount, which must be **≤ the original FV movement amount**. Also requires a declaration number and date. |

---

## 2. Effect on `OPERATIONS_DELEGUEES` (Amounts Changed)

Unlike FV which *consumes* the authorization, RC *reverses* it:

| Field | Change | Direction |
| :--- | :--- | :--- |
| `MNT_UTILISE` | Decreases (freed up) | `old - mntMvt` (clamped to 0) |
| `SOLDE` | Increases (restored) | `old + mntMvt` |
| `DERNIER_NUM_MVT_AVA` | Increments | `old + 1` |
| `MNT_AUTORISE` | ❌ Not touched | Intentionally left unchanged |

> [!IMPORTANT]
> The original PL/SQL conditionally updated `MNT_AUTORISE` when the fiscal year changed. This project **intentionally disables that update** — `MNT_AUTORISE` is never modified during RC processing.

---

## 3. Architecture Overview

```
BusinessRulesRcController
    └── POST /api/business-rules-rc/valider
            ├── businessRulesRcService.validerOperationRC(dto)
            │       ├── validateDossierFields()
            │       ├── validateMouvementFields()
            │       ├── validerRetrocessionUnique()        [RAV only]
            │       ├── validerMntMvtAvaNullPourRAV()      [RAV only]
            │       ├── validerDateMvtAvaPourRAV()         [RAV only - 40-day rule]
            │       ├── validerChronologie()               [RRV: dateDeclaration >= dateMvtAva]
            │       ├── findMvtByRefAndNumDossier()        [both: verifies original exists]
            │       └── validerDocumentsScannes()          [optional]
            └── businessRulesRcService.enregistrerOperationRC(dto)
                    ├── Fetch Dossier from OPERATIONS_DELEGUEES
                    ├── For RAV: retrieve amount from OPERATIONS_DELEGUEES_MVT
                    ├── For RRV: verify amount <= mntMvtAva of original
                    ├── Update OPERATIONS_DELEGUEES (mntUtilise ↓, solde ↑, dernierNumMvtAva ↑)
                    ├── Insert into OPERATIONS_DELEGUEES_MVT
                    └── Insert into DOCUMENTS (if documents provided)
```

---

## 4. API Endpoint

| Method | URL | Description |
| :--- | :--- | :--- |
| `POST` | `/api/business-rules-rc/valider` | Full validation + recording if valid. |

**Response Structure:**
```json
{
  "valide": true,
  "nombreErreurs": 0,
  "erreurs": [],
  "message": "L'opération RC est valide"
}
```
On failure, HTTP `422 Unprocessable Entity` is returned with the error list.

---

## 5. DTOs

### [OperationRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/OperationRCDTO.java#8-15) (Root)
```java
private DossierRCDTO dossier;
private MouvementRCDTO mouvements;
private List<DocumentScanneRCDTO> documentsScannes; // optional
```

### [DossierRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/DossierRCDTO.java#6-14)
```java
private Long numeroDossier;       // required
private String dateDossier;       // dd/MM/yyyy format, required
private Integer typeDossier;      // required (Short in entity)
private Short codeAgenceAva;      // optional (used for duplicate checks)
```

### [MouvementRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/MouvementRCDTO.java#8-18)
```java
private String typeMouvement;     // "RAV" or "RRV" — required
private String refOperation;      // REF_OPERATION of the ORIGINAL FV movement — required for both
private BigDecimal mntMvt;        // Amount: NULL for RAV (auto-fetched), required for RRV
private String numeroDeclaration; // RRV only — required
private String dateDeclaration;   // RRV only — dd/MM/yyyy, must be >= date of original movement
```

### [DocumentScanneRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/DocumentScanneRCDTO.java#6-14)
```java
private Integer ligne;         // must be > 0
private String nomImage;       // filename with valid extension (.pdf, .jpg, .jpeg, .png, .tiff)
private String cheminFichier;  // optional path
private Integer typeDocument;  // required
```

---

## 6. Validation Rules

### Common (Both RAV & RRV)
- `numeroDossier`, `dateDossier`, `typeDossier` — all required.
- `mouvements` — required.
- `typeMouvement` — must be `"RAV"` or `"RRV"` (case-insensitive).
- `refOperation` — **required** for both types. Must point to an existing record in `OPERATIONS_DELEGUEES_MVT` with matching `numDossier`.
- **Chronology check**: The original movement must exist and have a valid `DATE_MVT_AVA`.

### RAV-specific
1. **Unique Retrocession**: Checks `DERNIER_NUM_MVT_AVA + 1` doesn't already exist in `OPERATIONS_DELEGUEES` for that dossier/agence, preventing double retrocession.
2. **MNT_MVT_AVA must be NULL**: The `N+1` movement slot must not already have a non-null amount (prevents re-retrocession).
3. **40-Day Rule**: The `DATE_MVT_AVA` of the original movement must be within the **last 40 days** (`SYSDATE - 40`).
4. **Amount**: `mntMvt` is **NOT** sent in the request — it is automatically fetched from `mntMvtAva` of the original movement found via `refOperation`.

### RRV-specific
1. **`numeroDeclaration`** — required and non-empty.
2. **`dateDeclaration`** — required, dd/MM/yyyy format, must be **≥ the original movement's `DATE_MVT_AVA`**.
3. **Amount bounds**: `0 < mntMvt <= mntMvtAva` of the original movement.
4. **Scanned Documents**: **RRV logically requires at least one mandatory scanned document** (the Customs Declaration/Quittance) that proves the unspent currency was declared, matching the `numeroDeclaration` provided.

### Document Validation (Optional for RAV, Mandatory for RRV)
- `ligne` > 0
- `nomImage` required, non-empty
- `typeDocument` required
- Extension must be one of: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.tiff`
- During `/valider` flow: **DB existence check is skipped** (documents will be inserted during [enregistrerOperationRC](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/impl/BusinessRulesRcServiceImpl.java#220-504)).

> [!WARNING]
> **Strict Enforcement in Backend Code:** The default boilerplate might only check documents *if they are provided*. To strictly enforce the rule that RRV **must** have a document, ensure this check is added to [validerOperationRC](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesRcService.java#8-9) for RRV:
> ```java
> if (isRRV && (dto.getDocumentsScannes() == null || dto.getDocumentsScannes().isEmpty())) {
>     erreurs.add("DOCUMENTS_OBLIGATOIRES : Un document scanné (Déclaration de douane) est obligatoire pour une opération RRV");
> }
> ```

---

## 7. Persistence Logic ([enregistrerOperationRC](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/impl/BusinessRulesRcServiceImpl.java#220-504))

Annotated `@Transactional`. Full rollback on any exception.

### Step 1: Fetch Dossier
```java
operationsDelegueeRepository
    .findByNumDossierAndDateDossierAndCodeTypeDosAva(numDossier, dateDossier, typeDossier)
```
Throws `Exception("Dossier introuvable")` if not found.

### Step 2: Retrieve Amount (RAV only)
For RAV, the amount is read from the **original movement**:
```java
operationsDelegueeMvtRepository.findByIdRefOperation(Long.parseLong(refOperation))
// then filter by numDossier
// montantMvt = mvtOrigine.getMntMvtAva()
```

### Step 3: Idempotency Check
Prevents double-processing:
```java
operationsDelegueeMvtRepository
    .existsByNumDossierAndDernierNumMvtAvaAndMntMvtAva(numDossier, numMvtAvaToSave, montant)
```
If already processed → **return early** (no-op).

### Step 4: Update `OPERATIONS_DELEGUEES`
```java
// SOLDE := SOLDE + montant
dossier.setSolde(nvl(dossier.getSolde()).add(montant));

// MNT_UTILISE := MNT_UTILISE - montant   (floored at 0)
dossier.setMntUtilise(max(0, nvl(dossier.getMntUtilise()).subtract(montant)));

// DERNIER_NUM_MVT_AVA := DERNIER_NUM_MVT_AVA + 1
dossier.setDernierNumMvtAva(dernierNumMvtAva + 1);

// Partial update (preferred):
operationsDelegueeRepository.updateMontantsAndDernierNum(
    numDossier, dateDossier, typeDossier,
    dossier.getMntUtilise(), dossier.getSolde(), dossier.getDernierNumMvtAva()
);
// Falls back to full .save() if 0 rows updated.
```

### Step 5: Insert into `OPERATIONS_DELEGUEES_MVT`
```java
Long nextRef = operationsDelegueeMvtRepository.getNextRefOperation(); // Oracle sequence AVA.AVA_REF_OPR
OperationsDelegueesMvt mvt = new OperationsDelegueesMvt();
mvt.setCodeProduitService((short) 108);
mvt.setCodeOperation(206); // RC-specific code (FV uses 205)
mvt.setMntMvtAva(montant);
mvt.setDateMvtAva(LocalDate.now());
mvt.setDernierNumMvtAva(numMvtAvaToSave);
// + copy client/account fields from dossier
operationsDelegueeMvtRepository.save(mvt);
```

### Step 6: Insert Documents (Optional)
Same logic as FV — each [DocumentScanneRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/DocumentScanneRCDTO.java#6-14) is mapped to a [Document](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/controller/BusinessRulesFVController.java#127-144) entity linked to `refOperation` and `dateOperation` of the newly created MVT row.

---

## 8. Repository Methods Required

### [OperationsDelegueeRepository](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeRepository.java#14-85)
| Method | Purpose |
| :--- | :--- |
| [findByNumDossierAndDateDossierAndCodeTypeDosAva(...)](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeRepository.java#35-37) | Main dossier lookup |
| [updateMontantsAndDernierNum(...)](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeRepository.java#76-84) | Partial @Modifying update |
| [countRetrocessionDuplicate(numDossier, codeAgenceAva, numMvt)](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeRepository.java#45-61) | RAV: duplicate check (with agence) |
| [countRetrocessionDuplicateWithoutAgence(numDossier, numMvt)](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeRepository.java#62-75) | RAV: duplicate check (no agence) |

### [OperationsDelegueeMvtRepository](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeMvtRepository.java#14-94)
| Method | Purpose |
| :--- | :--- |
| [findByIdRefOperation(Long ref)](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeMvtRepository.java#24-25) | Find parent movement by REF_OPERATION |
| [getNextRefOperation()](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeMvtRepository.java#17-23) | Oracle sequence `AVA.AVA_REF_OPR.NEXTVAL` |
| [existsWithNonNullMntMvtAva(numDossier, numMvt)](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeMvtRepository.java#56-70) | RAV: check N+1 slot |
| [existsWithDateMvtAvaTooOld(numDossier, numMvt, minDate)](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeMvtRepository.java#77-93) | RAV: 40-day rule |
| [existsByNumDossierAndDernierNumMvtAvaAndMntMvtAva(...)](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeMvtRepository.java#71-76) | Idempotency check |

---

## 9. Step-by-Step Integration Into Your Project

### Step 1: Copy DTOs
Create the `DTO/RC/` package with:
- [OperationRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/OperationRCDTO.java#8-15)
- [DossierRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/DossierRCDTO.java#6-14)
- [MouvementRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/MouvementRCDTO.java#8-18)
- [DocumentScanneRCDTO](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/DTO/RC/DocumentScanneRCDTO.java#6-14)

### Step 2: Add Repository Methods
Add the queries from Section 8 to your existing [OperationsDelegueeRepository](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeRepository.java#14-85) and [OperationsDelegueeMvtRepository](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeMvtRepository.java#14-94).

> [!IMPORTANT]
> The [updateMontantsAndDernierNum](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/repository/OperationsDelegueeRepository.java#76-84) is a `@Modifying` JPQL query. The calling service method **must** be `@Transactional` for it to work.

### Step 3: Copy Service Files
- [BusinessRulesRcService](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesRcService.java#7-11) (interface, 2 methods)
- [BusinessRulesRcServiceImpl](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/impl/BusinessRulesRcServiceImpl.java#23-673) (full implementation)

No external microservice calls are made in RC. It is **self-contained** — all checks are done via the internal DB.

### Step 4: Copy Controller
[BusinessRulesRcController](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/controller/BusinessRulesRcController.java#14-52) — no changes needed, it's a simple pass-through.

### Step 5: Verify Oracle Sequence
The sequence `AVA.AVA_REF_OPR` must exist in your target DB schema:
```sql
CREATE SEQUENCE AVA.AVA_REF_OPR START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
```

### Step 6: Frontend Call Example

**RAV Request (amount auto-fetched):**  RAV dosen't require documentScannes
```json
{
  "dossier": {
    "numeroDossier": 123456,
    "dateDossier": "15/03/2025",
    "typeDossier": 1,
    "codeAgenceAva": 10
  },
  "mouvements": {
    "typeMouvement": "RAV",
    "refOperation": "98765432"
  }

 "documentsScannes": null
}
```

**RRV Request (partial refund - requires scanned document):**
```json
{
  "dossier": {
    "numeroDossier": 123456,
    "dateDossier": "15/03/2025",
    "typeDossier": 1
  },
  "mouvements": {
    "typeMouvement": "RRV",
    "refOperation": "98765432",
    "mntMvt": 500.000,
    "numeroDeclaration": "DECL-2025-001",
    "dateDeclaration": "20/03/2025"
  },
  "documentsScannes": [
    {
      "ligne": 1,
      "nomImage": "declaration_douane_bct.pdf",
      "typeDocument": 1
    }
  ]
}
```

---

## 10. Key Differences: RC vs FV

| Aspect | FV (Frais de Voyage) | RC (Rétrocession) |
| :--- | :--- | :--- |
| Direction | Consumes the authorization | Restores the authorization |
| `MNT_UTILISE` | ⬆️ Increases | ⬇️ Decreases |
| `SOLDE` | ⬇️ Decreases | ⬆️ Increases |
| `MNT_AUTORISE` | ❌ Not touched | ❌ Not touched |
| External API calls | ✅ REF (devises, modes, pays) | ❌ None |
| `CODE_OPERATION` in MVT | `205` | `206` |
| Amount source | Provided by caller | RAV: from DB; RRV: from caller (bounded) |
| Requires `refOperation` | ✅ Yes (mandatory) | ✅ Yes (mandatory) |
