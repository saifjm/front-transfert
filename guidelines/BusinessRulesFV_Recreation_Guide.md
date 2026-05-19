# BusinessRulesFV Module Recreation & Integration Guide

This guide provides everything you need to recreate the **BusinessRulesFV (Frais de Voyage)** module and merge it into another Spring Boot project.

---

## 1. Module Architecture Overview

The [BusinessRulesFV](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesFVService.java#10-178) module is designed to handle validation and recording of "Frais de Voyage" (Travel Expenses) operations. It relies on a multi-layer Spring Boot architecture:

1.  **API Layer**: [BusinessRulesFVController](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/controller/BusinessRulesFVController.java#20-307) - Exposes REST endpoints for validation and persistence.
2.  **Service Layer**:
    *   [BusinessRulesFVService](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesFVService.java#10-178) (Interface) & [BusinessRulesFVServiceImpl](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/impl/BusinessRulesFVServiceImpl.java#31-1970) (Implementation): Contains the FV-specific logic.
    *   [BusinessRulesService](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesService.java#14-73): A shared utility service for common calculations (solde, mvt_ava_cr).
3.  **Data Layer**:
    *   **Entities**: [OperationsDeleguee](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/entity/OperationsDeleguee.java#15-161), [OperationsDelegueesMvt](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/entity/OperationsDelegueesMvt.java#14-158), [Beneficiaire](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesFVService.java#124-128), [Document](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/controller/BusinessRulesFVController.java#127-144).
    *   **Repositories**: Standard Spring Data JPA repositories.
4.  **Integration Layer**: `ApiExterneService` - Interfaces with external systems (Reference data, Client verification).

---

## 2. Database Schema (Entities)

You need to recreate the following tables. Note that these entries use Hibernate `@Audited` (Envers) in the source project.

### Core Tables

| Table Name | Description | Key Primary Columns |
| :--- | :--- | :--- |
| `OPERATIONS_DELEGUEES` | Main dossier information | `NUM_DOSSIER` |
| `OPERATIONS_DELEGUEES_MVT` | Movement history | `REF_OPERATION`, `DATE_OPERATION` |
| `BENEFICIAIRE` | Beneficiaries linked to dossiers | `NUM_DOSSIER`, `TYPE_PIECE`, `NO_PIECE` |
| `DOCUMENT` | Scanned documents | `ID` |

### Key Entities Breakdown

#### [OperationsDeleguee.java](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/entity/OperationsDeleguee.java)
Stores the current state of a dossier.
*   **Important Fields**: `solde`, `mntAvance`, `mntUtilise`, `mntAutorise`, `etatDossier` (must be 'V' for validation), `codemTypeDosAva`.

#### [OperationsDelegueesMvt.java](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/entity/OperationsDelegueesMvt.java)
Stores every movement (validation) performed on a dossier.
*   **Important Fields**: `mntMvtAva` (the amount of the current transaction), `status`, `dateValidation`.

---

## 3. Data Transfer Objects (DTOs)

The frontend communicates with the controller using the `OperationFVDTO` hierarchy.

### Hierarchy
*   `OperationFVDTO`: Root object.
    *   `DossierFVDTO`: Dossier details (`numeroDossier`, `dateDossier`, `agence`, `compteRib`).
    *   `MontantsFVDTO`: Financial status (`solde`, `avance`, `caFiscalHT`, `devise`).
    *   `MouvementFVDTO`: The current transaction details (`montant`, `montantDvs`, `beneficiaire`, `pays`, `mode`).
    *   `DocumentScanneFVDTO`: Metadata about uploaded documents.

---

## 4. Business Logic (Service Implementation)

The core logic resides in [BusinessRulesFVServiceImpl](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/impl/BusinessRulesFVServiceImpl.java#31-1970).

### Validation Workflow ([validerOperationFV](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesFVService.java#12-18))
1.  **Population**: Missing fields are fetched from the database based on `numeroDossier`.
2.  **State Check**: Ensures the dossier state (`ETAT_DOSSIER`) is exactly **'V'** (Valide).
3.  **Dossier Validation**: Checks agence format, RIB (20 digits), and dates.
4.  **Financial Validation**:
    *   Calculates Solde: `mnt_autorise + mnt_avance - mnt_utilise`.
    *   Checks if `avance <= solde`.
    *   Validates Devise against external reference data.
5.  **Movement Validation**:
    *   Checks limits (e.g., Mode "BB", "CH", or "TC" is capped at **30,000 TND**).
    *   Validates travel dates (Departure < Return).
    *   Verifies Beneficiary existence via `BeneficiaireRepository`.

### Persistence Workflow ([enregistrerOperationFV](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesFVService.java#168-176))
When an operation is valid, the service:
1.  Updates the dossier (`OPERATIONS_DELEGUEES`): Updates `mntAutorise` and `dernierNumMvtAva`.
2.  Inserts a movement (`OPERATIONS_DELEGUEES_MVT`): Records the transaction details.

---

## 5. API Endpoints

The [BusinessRulesFVController](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/controller/BusinessRulesFVController.java#20-307) exposes:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/business-rules-fv/valider` | Full validation + Immediate recording if successful. |
| `POST` | `/api/business-rules-fv/valider/dossier` | Only validate dossier headers. |
| `POST` | `/api/business-rules-fv/valider/montants` | Only validate financial consistency. |
| `GET` | `/api/business-rules-fv/controle/compte-rib` | Quick check for a 20-digit RIB. |
| `GET` | `/api/business-rules-fv/controle/dates-voyage` | Check travel date logic. |

---

## 6. Step-by-Step Integration Guide

To merge this into a new project:

### Step 1: Copy Entities & Repositories
Copy the contents of `AVA/entity` and `AVA/repository` related to [OperationsDeleguee](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/entity/OperationsDeleguee.java#15-161) and [OperationsDelegueesMvt](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/entity/OperationsDelegueesMvt.java#14-158). Ensure you include the `@Embeddable` ID classes.

### Step 2: Implement [BusinessRulesService](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesService.java#14-73)
You must have the generic [BusinessRulesService](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesService.java#14-73) (specifically the [calculerSolde](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/impl/BusinessRulesServiceImpl.java#97-116) and [calculMvtAvaCr](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesService.java#18-19) methods) as the FV module depends on it.

### Step 3: Configure `ApiExterneService`
The FV module calls external APIs for:
*   `getDevises()`
*   `getModePaiements()`
*   `verifierPersonne()`
If you don't have these, you'll need to create mocks or adapt the service to your own reference data source.

### Step 4: Register the Controller and Service
Ensure [BusinessRulesFVServiceImpl](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/impl/BusinessRulesFVServiceImpl.java#31-1970) is annotated with `@Service` and [BusinessRulesFVController](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/controller/BusinessRulesFVController.java#20-307) with `@RestController`.

### Step 5: Frontend Integration
The frontend should send a JSON matching the structure of `OperationFVDTO`.
**Example JSON Snippet:**
```json
{
  "dossier": { "numeroDossier": "123456", "compteRib": { "racineCompte": "12345678901234567890" } },
  "montants": { "devise": 788 },
  "mouvement": { "montant": 500, "type": "A", "mode": "BB" }
}
```

---
> [!TIP]
> **Pro-Tip**: The [validerCompteRib](file:///c:/Users/Alaa/Desktop/AVA/src/main/java/IbansysPoc/AVA/service/BusinessRulesFVService.java#54-58) in this module specifically enforces a **20-digit** numeric format for the `racineCompte`. Ensure your frontend strips any spaces or non-numeric characters before sending.
