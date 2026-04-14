# 📘 AVA Backend — API Documentation (Frontend Integration Guide)

> **Base URL:** `http://localhost:8080`
> **Swagger UI:** `http://localhost:8080/swagger-ui.html`
> **OpenAPI JSON:** `http://localhost:8080/api-docs`
> **Content-Type:** `application/json`
> **Date Format:** `yyyy-MM-dd` (unless otherwise specified)

---

## 📑 Table of Contents

1. [Opérations Déléguées — Mouvements (MVT)](#1-opérations-déléguées--mouvements-mvt)
2. [Opérations Déléguées — Dossiers](#2-opérations-déléguées--dossiers)
3. [Bénéficiaires](#3-bénéficiaires)
4. [Alimentation BCT](#4-alimentation-bct)
5. [Suspension](#5-suspension)
6. [Levée de Suspension](#6-levée-de-suspension)
7. [Opérations Frais de Voyage (FV)](#7-opérations-frais-de-voyage-fv)
8. [Opérations Rétrocession (RC)](#8-opérations-rétrocession-rc)
9. [Opérations de Réservation](#9-opérations-de-réservation)
10. [Opérations Exportateur AVA](#10-opérations-exportateur-ava)
11. [Réservations](#11-réservations)
12. [Règles Métier (Business Rules)](#12-règles-métier-business-rules)
13. [Déclarations CA Fiscal HT](#13-déclarations-ca-fiscal-ht)
14. [Traitement AVA](#14-traitement-ava)
15. [Notifications](#15-notifications)
16. [Activités AVA (Référentiel)](#16-activités-ava-référentiel)
17. [Personnes (Référentiel)](#17-personnes-référentiel)
18. [Reports (PDF)](#18-reports-pdf)
19. [DTO Reference](#19-dto-reference)

---

## 1. Opérations Déléguées — Mouvements (MVT)

Base path: `/api/operations-deleguees-mvt`

### 1.1 POST `/api/operations-deleguees-mvt/initialisation?finalize={true|false}`

**Initialisation d'une ouverture de dossier.** Crée un nouveau mouvement avec toutes ses entités liées (bénéficiaires, documents, marchés).

- `finalize=true` → Valide le MVT (I→V), projette le dossier, et marque le MVT appliqué (A) ou en erreur (E)
- `finalize=false` (défaut) → Le MVT reste en status I (brouillon)

**Request Body:** `InitiationOuvertureDTO`

```json
{
  "codeProduitService": 108,
  "codeOperation": 100,
  "codeTypeDosAva": 1,
  "numDossier": null,
  "codeAgenceAva": 17,
  "typePieceClient": 1,
  "noPieceClient": "1234567A",
  "numeroCompte": "10170001234567890123",
  "tel": "71234567",
  "codeActivite": 23,
  "codeSousActivite": 1,
  "declarationFiscale": "O",
  "mntReserve": 0,
  "mntBlocage": 0,
  "solde": 0,
  "codeBanqueProvenance": null,
  "mntAvance": null,
  "mntUtilise": null,
  "mntAutorise": null,
  "mntAutoriseBct": null,
  "mntCa": 500000.000,
  "mntCaFiscal": 450000.000,
  "mntMvtAva": 100000.000,
  "mntImportation": 250000,
  "numeroBct": null,
  "dateBct": null,
  "echeance": "2026-12-31",
  "etatDossier": "V",
  "motifEtat": null,
  "confirmationImportation": false,
  "beneficiairesMvtListe": [
    {
      "typePieceBenef": 1,
      "noPieceBenef": "12345678",
      "nomBenef": "Ahmed Ben Salah",
      "adresseBenef": "Tunis, Rue de la Liberté",
      "qualite": "G",
      "datePiece": "2025-01-01",
      "etat": "N"
    }
  ],
  "documents": [
    {
      "typeDocument": 1,
      "referenceFichierJoint": "registre_commerce.pdf",
      "extention": "pdf"
    }
  ],
  "avaMarcheMvt": {
    "numMarche": "MC-2026-001",
    "montantMarche": 500000,
    "refContrat": "CTR-2026-001",
    "dateContrat": "2026-01-15",
    "contractant": "Société ABC",
    "dateFin": "2027-01-15",
    "codeDevise": 840,
    "mntDevise": 150000
  },
  "banqueProvenance": {
    "codeBanqueProvenance": 10,
    "mntAvance": 50000.000,
    "mntUtilise": 20000.000,
    "mntAutorise": 200000.000,
    "mntAutoriseBct": 0,
    "solde": 130000.000,
    "mntReserve": 0,
    "mntBlocage": 0
  }
}
```

**Response:** `OperationCreationResponseDTO`

```json
{
  "refOperation": 740950,
  "numDossier": 22360600,
  "status": "A",
  "message": "Opération créée et appliquée avec succès"
}
```

---

### 1.2 POST `/api/operations-deleguees-mvt/by-numdossier/{numDossier}?finalize={true|false}`

**Récupère le MVT associé au numDossier et optionnellement le finalise.**

- Path: `numDossier` = `22360542` (Integer)
- Query: `finalize` = `true` ou `false`

**No request body.** Response: `OperationCreationResponseDTO` (same structure as above).

---

### 1.3 PUT `/api/operations-deleguees-mvt/{refOperation}/{dateOperation}?finalize={true|false}`

**Met à jour un MVT existant et optionnellement le finalise.**

- Path: `refOperation` = `740950` (Long), `dateOperation` = date string in path
- Query: `finalize` = `true` or `false`

**Request Body:** `InitiationOuvertureDTO` (same structure as 1.1)

**Response:** `OperationCreationResponseDTO`

---

### 1.4 GET `/api/operations-deleguees-mvt/by-numdossier/{numDossier}?start={date}&end={date}`

**Recherche les MVTs pour un dossier et une période.**

- Path: `numDossier` = `22360542`
- Query: `start` = `2026-01-01`, `end` = `2026-12-31`

**Response:** `List<OperationsDelegueesMvt>` (entity)

```json
[
  {
    "refOperation": 740900,
    "dateOperation": "2026-03-15",
    "codeProduitService": 108,
    "codeOperation": 100,
    "numDossier": 22360542,
    "status": "A"
  }
]
```

---

## 2. Opérations Déléguées — Dossiers

Base path: `/api/operations-deleguees`

### 2.1 POST `/api/operations-deleguees/validation/{numDossier}`

**Validation d'un dossier.** Crée et valide une opération déléguée avec toutes ses entités liées.

- Path: `numDossier` = `22360542`

**No request body.**

**Response (201):** `OuvertureDossierDTO`

```json
{
  "numDossier": 22360542,
  "typeDossierAva": 1,
  "dateDossier": "2026-03-15",
  "codeAgence": 17,
  "typePieceClient": 1,
  "noPieceClient": "1234567A",
  "numeroCompte": "10170001234567890123",
  "tel": "71234567",
  "codeActivite": 23,
  "codeSousActivite": 1,
  "declarationFiscale": "O",
  "codeBanqueProvenance": 10,
  "mntAvance": 50000.000,
  "mntUtilise": 20000.000,
  "mntAutorise": 200000.000,
  "mntAutoriseBct": 0,
  "mntReserve": 0,
  "mntBlocage": 0,
  "solde": 130000.000,
  "mntCa": 500000.000,
  "mntCaFiscal": 450000.000,
  "mntImportation": 250000,
  "numeroBct": null,
  "dateBct": null,
  "echeance": "2026-12-31",
  "annee": 2026,
  "dernierNumMvtAva": 1,
  "etatDossier": "V",
  "codeEtat": null,
  "dateEtat": "2026-03-15",
  "motifEtat": null,
  "beneficiaires": [],
  "documents": [],
  "avaMarche": null
}
```

---

### 2.2 GET `/api/operations-deleguees`

**Lister toutes les opérations déléguées.**

**Response:** `List<OuvertureDossierDTO>`

---

### 2.3 GET `/api/operations-deleguees/{numDossier}`

**Rechercher un dossier par numéro.**

- Path: `numDossier` = `22360542`

**Response:** `OuvertureDossierDTO` (or 404)

---

### 2.4 GET `/api/operations-deleguees/{numDossier}/with-relations`

**Rechercher un dossier avec toutes ses relations** (bénéficiaires, documents, marchés).

**Response:** `OuvertureDossierDTO` (with populated arrays)

---

### 2.5 GET `/api/operations-deleguees/with-relations`

**Lister toutes les opérations déléguées avec leurs relations.**

**Response:** `List<OuvertureDossierDTO>`

---

### 2.6 GET `/api/operations-deleguees/by-agence/{codeAgenceAva}`

**Rechercher par code agence AVA.**

- Path: `codeAgenceAva` = `17` (Short)

**Response:** `List<OuvertureDossierDTO>`

---

### 2.7 GET `/api/operations-deleguees/by-etat/{etatDossier}`

**Rechercher par état du dossier.**

- Path: `etatDossier` = `V` (String — ex: V, B, C)

**Response:** `List<OuvertureDossierDTO>`

---

### 2.8 PUT `/api/operations-deleguees/{numDossier}`

**Mettre à jour un dossier.**

- Path: `numDossier` = `22360542`

**Request Body:** `OuvertureDossierDTO` (same structure as response in 2.1)

**Response:** `OuvertureDossierDTO`

---

### 2.9 GET `/api/operations-deleguees/{numDossier}/exists`

**Vérifier l'existence d'un dossier.**

**Response:** `true` or `false`

---

### 2.10 GET `/api/operations-deleguees/dossiers-valides-avec-nom`

**Récupérer les dossiers valides (état 'V') avec le nom du client.**

**Response:** `List<DossierValideDTO>`

```json
[
  {
    "codeAgence": 17,
    "typeDossierAva": 1,
    "numDossier": 22360542,
    "dateDossier": "2026-03-15",
    "noPieceClient": "1234567A",
    "nomClient": "Ahmed Ben Salah"
  }
]
```

---

### 2.11 GET `/api/operations-deleguees/{numDossier}/summary`

**Récupérer le résumé d'une opération déléguée.**

**Response:** `OperationsDelegueeSummaryDTO`

```json
{
  "codeTypeDosAva": 1,
  "numDossier": 22360542,
  "dateDossier": "2026-03-15",
  "codeAgenceAva": 17,
  "typePieceClient": 1,
  "noPieceClient": "1234567A",
  "mntAvance": 50000.000,
  "mntUtilise": 20000.000,
  "mntAutorise": 200000.000,
  "solde": 130000.000,
  "echeance": "2026-12-31",
  "mntAutorisationBct": 0,
  "mntReserve": 0,
  "mntBlocage": 0
}
```

---

### 2.12 GET `/api/operations-deleguees/{numDossier}/summarybenf`

**Résumé avec bénéficiaires actifs.**

**Response:** `OperationsDelegueeSummaryDTO` (with `beneficiaires` array)

```json
{
  "codeTypeDosAva": 1,
  "numDossier": 22360542,
  "beneficiaires": [
    {
      "adresseBenef": "Tunis",
      "noPieceBenef": "12345678",
      "nomBenef": "Ahmed Ben Salah",
      "qualite": "G",
      "typePieceBenef": 1
    }
  ]
}
```

---

### 2.13 GET `/api/operations-deleguees/by-matricule?noPieceClient={value}`

**Rechercher les dossiers valides par matricule fiscal.**

- Query: `noPieceClient` = `1234567A`

**Response:** `List<OperationsDeleguee>` (entity)

---

## 3. Bénéficiaires

Base path: `/api/beneficiaires`

### 3.1 POST `/api/beneficiaires/{Finalize}`

**Créer ou mettre à jour un bénéficiaire.**

- Path: `Finalize` = `true` ou `false`
  - `true` → bénéficiaire créé/mis à jour + MVT status 'A'
  - `false` → MVT créé uniquement

**Request Body:** `BeneficiaireDTO`

```json
{
  "numDossier": 22360542,
  "dateDossier": "2026-03-15",
  "typePieceBenef": 1,
  "noPieceBenef": "12345678",
  "codeTypeDos": 1,
  "codeAgenceAva": 1,
  "nomBenef": "Ahmed Ben Salah",
  "adresseBenef": "Tunis, Rue de la Liberté",
  "qualite": "G",
  "datePiece": "2025-01-01",
  "etat": "N",
  "dateCreation": "2026-03-15",
  "dateSuppression": null
}
```

**Response (201):** `BeneficiaireDTO`

---

### 3.2 GET `/api/beneficiaires/{numDossier}`

**Récupérer les bénéficiaires d'un dossier.**

- Path: `numDossier` = `22360542`

**Response:** `List<BeneficiaireDTO>`

---

## 4. Alimentation BCT

Base path: `/api/alimentation-bct`

### 4.1 POST `/api/alimentation-bct/{numDossier}/{Finalize}`

**Alimentation suite accord BCT.** Met à jour les infos BCT d'un dossier validé.

- Path: `numDossier` = `22360542`, `Finalize` = `true` or `false`

**Request Body:** `AutorisationBctDTO`

```json
{
  "numeroBct": 12345,
  "dateBct": "2026-03-10",
  "typeBct": "A",
  "mntMvtAva": 50000.000
}
```

**Response:** `OuvertureDossierDTO`

---

## 5. Suspension

Base path: `/api/suspension`

### 5.1 POST `/api/suspension/{Finalize}`

**Suspend un dossier validé** (état → 'B' bloqué).

- Path: `Finalize` = `true` or `false`

**Request Body:** `SuspensionDTO`

```json
{
  "numDossier": 22360542,
  "codeEtat": 1,
  "motifEtat": "Dépassement du montant autorisé"
}
```

> **Note:** `motifEtat` est obligatoire uniquement si `codeEtat` = 99. `codeEtat` doit être entre 1 et 99.

**Response:** `OuvertureDossierDTO`

---

## 6. Levée de Suspension

Base path: `/api/levee-suspension`

### 6.1 POST `/api/levee-suspension/{Finalize}`

**Lève la suspension d'un dossier** (état → 'V' validé).

- Path: `Finalize` = `true` or `false`

**Request Body:** `LeveeSuspensionDTO`

```json
{
  "numDossier": 22360542,
  "motifEtat": "Autorisation BCT obtenue",
  "numBct": "12345",
  "dateBct": "2026-03-20"
}
```

> **Note:** `numBct` et `dateBct` sont requis seulement si le codeEtat avant levée était 1 (DEPASSEMENT DU MONTANT AUTORISE).

**Response:** `OuvertureDossierDTO`

---

## 7. Opérations Frais de Voyage (FV)

Base path: `/api/operations-fv`

### 7.1 POST `/api/operations-fv?finalize={true|false}`

**Créer une opération Frais de Voyage.**

> ⚠️ Les dates dans ce DTO utilisent le format `dd/MM/yyyy`

**Request Body:** `OperationFVDTO`

```json
{
  "dossier": {
    "numeroDossier": 22360542,
    "dateDossier": "15/03/2026",
    "typeDossier": 1
  },
  "mouvement": {
    "devise": 978,
    "montantDvs": 2000.000,
    "beneficiaire": {
      "code": 1,
      "numero": "12345678",
      "nomPrenom": "Ahmed Ben Salah"
    },
    "mode": "BB",
    "pays": 250,
    "type": "FV",
    "montant": 6800.000,
    "dateDepart": "10/04/2026",
    "dateRetour": "20/04/2026"
  },
  "documentsScannes": [
    {
      "ligne": 1,
      "nomImage": "passport_scan.pdf",
      "cheminFichier": "/documents/2026/03/passport_scan.pdf",
      "typeDocument": 1
    }
  ]
}
```

**Response (201):** `OperationCreationResponseDTO`

```json
{
  "refOperation": 740960,
  "numDossier": 22360542,
  "status": "A",
  "message": "Opération FV créée et appliquée"
}
```

---

### 7.2 PUT `/api/operations-fv/validate/{refOperation}`

**Valider un brouillon FV.**

- Path: `refOperation` = `740960` (Long)

**No request body.**

**Response:** `OperationCreationResponseDTO`

---

### 7.3 GET `/api/operations-fv/{refOperation}`

**Récupérer une opération FV par sa référence.**

- Path: `refOperation` = `740960`

**Response:** `OperationFVDTO`

---

## 8. Opérations Rétrocession (RC)

Base path: `/api/operations-rc`

### 8.1 POST `/api/operations-rc?finalize={true|false}`

**Créer une opération de rétrocession.** Deux sous-types:

> ⚠️ Les dates dans ce DTO utilisent le format `dd/MM/yyyy`

#### Exemple RAV (annulation complète, montant auto-récupéré):

```json
{
  "dossier": {
    "numeroDossier": 6110227,
    "dateDossier": "15/02/2026",
    "typeDossier": 1
  },
  "mouvements": {
    "typeMouvement": "RAV",
    "refOperation": 740908
  }
}
```

#### Exemple RRV (remboursement partiel, déclaration obligatoire):

```json
{
  "dossier": {
    "numeroDossier": 22360542,
    "dateDossier": "02/01/2026",
    "typeDossier": 3
  },
  "mouvements": {
    "typeMouvement": "RRV",
    "numeroDeclaration": "22150",
    "dateDeclaration": "30/01/2026",
    "refOperation": 740068,
    "mntMvt": 2000.000
  },
  "documentsScannes": [
    {
      "ligne": 1,
      "nomImage": "DOC_2026001_003.jpg",
      "cheminFichier": "/documents/2026/01/passport_scan.pdf",
      "typeDocument": 1
    }
  ]
}
```

**Response (201):** `OperationCreationResponseDTO`

---

### 8.2 PUT `/api/operations-rc/validate/{refOperation}`

**Valider un brouillon RC.** Path: `refOperation` = `740910`

**Response:** `OperationCreationResponseDTO`

---

### 8.3 GET `/api/operations-rc/{refOperation}`

**Récupérer une opération RC.** Path: `refOperation` = `740910`

**Response:** `OperationRCDTO`

---

## 9. Opérations de Réservation

Base path: `/api/reservation-operations`

### 9.1 POST `/api/reservation-operations?finalize={true|false}`

**Créer une nouvelle opération de réservation.**

**Request Body:** `ReservationOperationDTO`

```json
{
  "reference": "RES-2026-001",
  "numDossier": 22360542,
  "mntMvtAva": 15000.000,
  "origine": "FRONT"
}
```

**Response:** `OperationCreationResponseDTO`

---

### 9.2 POST `/api/reservation-operations/annulation?finalize={true|false}`

**Créer une opération d'annulation de réservation.**

**Request Body:** `ReservationOperationDTO`

```json
{
  "reference": "RES-2026-001",
  "numDossier": 22360542,
  "mntMvtAva": 15000.000,
  "origine": "FRONT"
}
```

**Response:** `OperationCreationResponseDTO`

---

### 9.3 PUT `/api/reservation-operations/validate/{referenceRes}`

**Valider et traiter une opération (269 ou 231) par referenceRes.**

- Path: `referenceRes` = `RES-2026-001` (String)
- Returns 200 with data, or 204 No Content if nothing to process.

**Response:** `ReservationOperationDTO` or 204

---

## 10. Opérations Exportateur AVA

Base path: `/api/operation-exportateur-ava`

### 10.1 POST `/api/operation-exportateur-ava/rapatriement/{Finalize}`

**Créer une opération de rapatriement AVA.**

- Path: `Finalize` = `true` or `false`
- If `Finalize=true` and PDF is generated → returns binary PDF (Content-Type: application/pdf) with JSON in `X-Operation-Data` header
- If `Finalize=false` or no PDF → returns JSON

**Request Body:** `OperationExportateurAVADTO`

```json
{
  "codeBanqueProvenance": 10,
  "codeDevise": 840,
  "numDosRap": 12345,
  "codeOperation": 100,
  "codeTache": 1,
  "libTache": "Rapatriement Export",
  "dateDosRap": "2026-03-15",
  "codeProduitService": 108,
  "codeService": 1,
  "codeTypeMvtAva": "CR",
  "typeDosRap": "R",
  "dateOperation": "2026-03-15",
  "dateTraitement": null,
  "flagTraitement": 0,
  "mntMvtDvs": 10000.000,
  "mntMvtTnd": 34000.000,
  "coursAchat": 3.400,
  "coursSpecial": null,
  "dateJournee": "2026-03-15",
  "numeroCompte": "10170001234567890123",
  "typePieceBenef": 1,
  "noPieceBenef": "12345678",
  "numDossierAva": 22360542,
  "mntRap": 34000.000
}
```

**Response (201):** `OperationExportateurAVADTO` (JSON) or binary PDF

---

## 11. Réservations

Base path: `/api/reservations`

### 11.1 GET `/api/reservations/numdossier/{numeroDossier}`

**Récupérer les réservations actives** (où mntReserve - mntUtilise - mntAnnulation ≠ 0).

- Path: `numeroDossier` = `22360542` (Long)

**Response:** `List<ReservationResponseDTO>`

```json
[
  {
    "referenceRes": "RES-2026-001",
    "numeroDossier": 22360542,
    "dateResa": "2026-03-15",
    "origine": "FRONT",
    "mntReserve": 15000.000,
    "mntUtilise": 5000.000,
    "mntAnnulation": 0
  }
]
```

---

### 11.2 GET `/api/reservations/numdossier/{numeroDossier}/all`

**Récupérer toutes les réservations** (indépendamment de mntAnnulation).

**Response:** `List<ReservationResponseDTO>`

---

### 11.3 PUT `/api/reservations/{numeroDossier}/reset-reserve`

**Réinitialiser mntReserve à zéro** pour un dossier.

- Path: `numeroDossier` = `22360542`

**Response:** 204 No Content

---

## 12. Règles Métier (Business Rules)

Base path: `/api/business-rules`

### 12.1 GET `/api/business-rules/calcul-mvt-ava-cr`

**Calcul MVT AVA CR.**

| Param | Type | Required | Example |
|---|---|---|---|
| `codeTypeDosAva` | Short | ✅ | `1` |
| `autorise` | BigDecimal | ❌ | `200000.000` |
| `baseCalcul` | BigDecimal | ❌ | `500000.000` |

**Response:** `BigDecimal` — ex: `100000.000`

---

### 12.2 GET `/api/business-rules/calcul-solde`

**Calcul du Solde disponible.**

| Param | Type | Required | Example |
|---|---|---|---|
| `mntAutorise` | BigDecimal | ❌ | `200000.000` |
| `mntAvance` | BigDecimal | ❌ | `50000.000` |
| `mntAutoriseBct` | BigDecimal | ❌ | `0` |
| `mntUtilise` | BigDecimal | ❌ | `20000.000` |
| `mntReserve` | BigDecimal | ❌ | `0` |
| `mntBlocage` | BigDecimal | ❌ | `0` |

**Response:** `BigDecimal` — ex: `130000.000`

---

### 12.3 POST `/api/business-rules/controle/agence-ava?numeroCompte={value}`

**Contrôle Agence AVA.**

- Query: `numeroCompte` = `10170001234567890123` (20 chars)

**Request Body:** `InitiationOuvertureDTO` (see section 1.1)

**Response:**

```json
{
  "valide": true,
  "message": "Agence valide",
  "codeAgenceAva": 17
}
```

---

### 12.4 GET `/api/business-rules/controle/type-dossier/{codeTypeDosAva}`

**Contrôle Type Dossier AVA.**

- Path: `codeTypeDosAva` = `1` (Integer)

**Response:**

```json
{
  "valide": true,
  "typeDossier": { "codeTypeDosAva": 1, "libelle": "..." }
}
```

---

### 12.5 GET `/api/business-rules/controle/piece-client`

**Contrôle Pièce Client / Matricule fiscal.**

| Param | Type | Required | Example |
|---|---|---|---|
| `typePieceClient` | Integer | ✅ | `1` |
| `numeroPieceClient` | String | ✅ | `1234567A` |

**Response:**

```json
{ "valide": true, "message": "Client trouvé" }
```

---

### 12.6 GET `/api/business-rules/controle/compatibilite-type-dossier`

**Contrôle Compatibilité Type Dossier.**

| Param | Type | Required | Example |
|---|---|---|---|
| `noPieceClient` | String | ✅ | `1234567A` |
| `codeTypeDosAva` | Short | ✅ | `1` |

**Response:**

```json
{ "valide": true, "message": "OK" }
```

---

### 12.7 GET `/api/business-rules/controle/numero-compte`

**Contrôle Numéro de Compte (RIB 20 chiffres).**

| Param | Type | Required | Example |
|---|---|---|---|
| `typePieceClient` | Integer | ❌ | `1` |
| `numeroPieceClient` | String | ❌ | `1234567A` |
| `numeroCompte` | String | ✅ | `10170001234567890123` |

**Response:**

```json
{ "valide": true, "message": "Compte valide" }
```

---

### 12.8 GET `/api/business-rules/validate/activite-type-dossier`

**Validation Activité / Type Dossier AVA.**

| Param | Type | Required | Example |
|---|---|---|---|
| `codeTypeDosAva` | Integer | ✅ | `1` |
| `codeActivite` | Integer | ✅ | `23` |

**Response:**

```json
{ "valide": true, "message": "OK" }
```

---

### 12.9 GET `/api/business-rules/controle/matricule-fiscal`

**Contrôle format Matricule Fiscal tunisien (8 caractères).**

| Param | Type | Required | Example |
|---|---|---|---|
| `noPieceClient` | String | ✅ | `1234567A` |

**Response:**

```json
{ "valide": true, "message": "Matricule fiscal valide" }
```

---

### 12.10 GET `/api/business-rules/controle/code-activite`

**Contrôle Code Activité secondaire.**

| Param | Type | Required | Example |
|---|---|---|---|
| `codeActivite` | Integer | ✅ | `23` |
| `codeTypeDosAva` | Short | ✅ | `1` |

**Response:**

```json
{ "valide": true, "message": "Code activité valide." }
```

---

### 12.11 GET `/api/business-rules/controle/autorisation-bct`

**Contrôle Autorisation BCT** (cohérence numéro/date).

| Param | Type | Required | Example |
|---|---|---|---|
| `numeroBct` | Integer | ❌ | `12345` |
| `dateBct` | LocalDate | ❌ | `2026-03-10` |

**Response:**

```json
{ "valide": true, "message": "OK" }
```

---

### 12.12 GET `/api/business-rules/controle/montant-importation`

**Contrôle Montant Importation** (seuil 200 000).

| Param | Type | Required | Example |
|---|---|---|---|
| `mntImportation` | Long | ❌ | `250000` |
| `codeActivite` | Integer | ❌ | `24` |
| `codeTypeDosAva` | Short | ❌ | `3` |
| `numeroBct` | Integer | ❌ | `null` |

**Response:**

```json
{ "valide": true, "alerte": false, "message": "OK" }
```

---

### 12.13 GET `/api/business-rules/validate/montants-rapatries`

**Validation Montants Rapatriés.**

| Param | Type | Required | Example |
|---|---|---|---|
| `codeBanqueProvenance` | Integer | ❌ | `10` |
| `mntAutorise` | BigDecimal | ❌ | `200000.000` |
| `mntAvance` | BigDecimal | ❌ | `50000.000` |
| `mntAutorisationBct` | BigDecimal | ❌ | `0` |
| `mntUtilise` | BigDecimal | ❌ | `20000.000` |

**Response:**

```json
{ "valide": true, "message": "OK" }
```

---

### 12.14 GET `/api/business-rules/controle/declaration-fiscale`

**Contrôle Déclaration Fiscale.**

| Param | Type | Required | Example |
|---|---|---|---|
| `noPieceClient` | String | ✅ | `1234567A` |
| `codeActivite` | Integer | ❌ | `23` |
| `codeTypeDosAva` | Short | ✅ | `3` |
| `numeroBct` | Integer | ❌ | `null` |
| `typePieceClient` | Integer | ❌ | `1` |

**Response:**

```json
{ "valide": true, "alerte": false, "message": "OK" }
```

---

### 12.15 GET `/api/business-rules/controle/produit-operation`

**Contrôle Code Produit/Service et Opération.**

| Param | Type | Required | Example |
|---|---|---|---|
| `codeProduitService` | Integer | ✅ | `108` |
| `codeOperation` | Integer | ✅ | `100` |

**Response:**

```json
{ "valide": true, "message": "OK" }
```

---

## 13. Déclarations CA Fiscal HT

Base path: `/api/declarations-caf-ht`

### 13.1 POST `/api/declarations-caf-ht`

**Créer ou mettre à jour une déclaration CA Fiscal HT.**

**Request Body:** `DeclarationCAFHTDTO`

```json
{
  "numDossier": 22360542,
  "typePieceClient": 1,
  "noPieceClient": "1234567A",
  "annee": 2025,
  "dateDeclaration": "2026-02-15",
  "datePresentation": "2026-02-20",
  "mntCaFiscal": 600000.000,
  "etat": "V"
}
```

**Response (201):** `DeclarationCAFHTDTO`

---

### 13.2 GET `/api/declarations-caf-ht/{noPieceClient}/{annee}`

**Récupérer une déclaration.**

- Path: `noPieceClient` = `1234567A`, `annee` = `2025` (Short)

**Response:** `DeclarationCAFHTDTO` or 404

---

## 14. Traitement AVA

Base path: `/api/traitement-ava`

### 14.1 POST `/api/traitement-ava`

**Traiter une déclaration fiscale AVA.** Équivalent PL/SQL TRAITEMENT_AVA.

**Request Body:** `TraitementAvaDTO`

```json
{
  "codeTypeDosAva": 3,
  "numDossier": 12345,
  "dateDossier": "2025-01-15",
  "annee": 2025,
  "mntCaFiscalHT": 600000.00
}
```

**Response:** 200 OK (empty body) or 400 (validation error)

---

## 15. Notifications

Base path: `/api/notifications`

### 15.1 POST `/api/notifications/client`

**Envoyer une notification client** (via SWF-Mail microservice).

**Request Body:** `NotificationClientRequest`

```json
{
  "codeBanque": 10,
  "codeAgenceBct": 100,
  "typePieceClient": 1,
  "noPieceClient": "12345678",
  "numDossier": 2024001,
  "dateDossier": "2024-02-02",
  "racineCompte": "123456",
  "objet": "Notification Dossier N° ",
  "message": "Votre dossier a été traité avec succès",
  "senderEmail": "noreply@ava.com.tn"
}
```

**Response (201):** `EmailQueueDTO`

```json
{
  "id": 1,
  "toEmail": "client@example.com",
  "fromEmail": "noreply@ava.com.tn",
  "subject": "Notification Dossier N° 2024001",
  "body": "<html>...</html>",
  "status": "PENDING",
  "createdAt": "2026-03-15T10:30:00",
  "sentAt": null,
  "retryCount": 0,
  "errorMessage": null
}
```

---

### 15.2 GET `/api/notifications/recognized-email-senders`

**Récupérer tous les emails expéditeurs reconnus.**

**Response:**

```json
[
  {
    "email": "noreply@ava.com.tn",
    "password": "***"
  }
]
```

---

## 16. Activités AVA (Référentiel)

Base path: `/api/activites`

### 16.1 GET `/api/activites`

**Récupérer toutes les activités AVA.**

**Response:** `List<AvaActivite>` or 204 No Content

```json
[
  {
    "codeActivite": 23,
    "libelleActivite": "Commerce International"
  }
]
```

---

## 17. Personnes (Référentiel)

Base path: `/api/ref/personnes`

### 17.1 GET `/api/ref/personnes/search/{typePiecePersonne}/{noPiecePersonne}`

**Rechercher une personne par type et numéro de pièce.**

- Path: `typePiecePersonne` = `1` (Short), `noPiecePersonne` = `12345678` (String)

**Response:** `Object` (structure depends on external REF API) or 404

---

## 18. Reports (PDF)

Base path: `/api/reports`

### 18.1 POST `/api/reports/exportateur`

**Générer le PDF de l'Annexe N°5 (Allocation Exportateur).**

**Content-Type Response:** `application/pdf`

**Request Body:** `ExportateurReportRequestDTO`

```json
{
  "intermediaireAgree": "Banque Nationale",
  "codeIntermediaire": "BN001",
  "agence": "Agence Tunis Centre",
  "codeAgence": "017",
  "typeAllocation": "Exportateur",
  "anneeDeFonctionnementDu": "2025-01-01",
  "anneeDeFonctionnementAu": "2025-12-31",
  "chiffreAffairesHT": "500000.000",
  "titulaireAllocation": "Société ABC SARL",
  "nomOuDenomination": "Société ABC",
  "codeIdentification": "1234567A",
  "adresse": "Zone Industrielle, Tunis",
  "numeroDateDemandeF2": "F2-2026-001 / 15-01-2026",
  "lignes": [
    {
      "date": "15/03/2026",
      "designation": "Rapatriement Export USA",
      "creditMontant": 34000.000,
      "creditOrigineFonds": "Virement SWIFT",
      "debitMontant": null,
      "debitPays": null,
      "droitsTransfertCumules": 100000.000,
      "montantsTransfertsCumules": 34000.000,
      "baseCalculDroitsTransfert": 500000.000,
      "beneficiaireCodeType": "CIN",
      "beneficiaireCodeNumero": "12345678",
      "beneficiaireNomsPrenoms": "Ahmed Ben Salah"
    }
  ]
}
```

**Response:** Binary PDF file (attachment: `annexe_5_exportateur.pdf`)

---

## 19. DTO Reference

### Standard Response Pattern (Business Rules)

```json
{
  "valide": true,
  "message": "OK",
  "alerte": false
}
```

### OperationCreationResponseDTO

```json
{
  "refOperation": 740950,
  "numDossier": 22360542,
  "status": "A",
  "message": "..."
}
```

| Status | Meaning |
|--------|---------|
| `I` | Initial (brouillon) |
| `V` | Validé |
| `A` | Appliqué (succès) |
| `E` | Erreur application |

### Finalize Flag Pattern

Many endpoints use a `finalize` parameter (boolean):

| Value | Behavior |
|-------|----------|
| `false` (default) | Creates a draft MVT (status `I`) — no impact on dossier |
| `true` | Creates MVT → Validates (I→V) → Applies to dossier → Status becomes `A` or `E` |

### Date Formats Summary

| DTO Group | Format | Example |
|-----------|--------|---------|
| InitiationOuvertureDTO, OuvertureDossierDTO | `yyyy-MM-dd` | `2026-03-15` |
| OperationFVDTO (DossierFV, MouvementFV) | `dd/MM/yyyy` | `15/03/2026` |
| OperationRCDTO (DossierRC, MouvementRC) | `dd/MM/yyyy` | `15/03/2026` |
| DeclarationCAFHTDTO | `yyyy-MM-dd` | `2026-03-15` |
| TraitementAvaDTO | `yyyy-MM-dd` | `2026-03-15` |
| NotificationClientRequest | `yyyy-MM-dd` | `2026-03-15` |
| EmailQueueDTO (datetime) | `yyyy-MM-dd'T'HH:mm:ss` | `2026-03-15T10:30:00` |
