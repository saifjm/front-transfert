# AVA REF Service API Documentation

This document provides a comprehensive list of all exposed endpoints in the `ref-service` application, along with examples of their expected JSON requests and/or responses.

---

## 1. Activite API (`/api/ref/activites`)

### `GET /api/ref/activites`
Returns a list of all activities.
**Response (200 OK):**
```json
[
  {
    "codeActivite": 1,
    "libActivite": "Commerce"
  }
]
```

### `GET /api/ref/activites/{codeActivite}`
Returns a specific activity by its ID.
**Response (200 OK):**
```json
{
  "codeActivite": 1,
  "libActivite": "Commerce"
}
```

### `GET /api/ref/activites/search/byCode/{codeActivite}`
Returns an activity by its specific code.
**Response (200 OK):**
```json
{
  "codeActivite": 1,
  "libActivite": "Commerce"
}
```

### `POST /api/ref/activites`
Creates a new activity.
**Request:**
```json
{
  "codeActivite": 3,
  "libActivite": "Industrie"
}
```

### `PUT /api/ref/activites/{codeActivite}`
Updates an existing activity.
**Request:**
```json
{
  "libActivite": "Commerce de gros"
}
```

### `DELETE /api/ref/activites/{codeActivite}`
Deletes an activity.
**Response (204 No Content):** (Empty Body)

---

## 2. Agence API (`/api/ref/agences`)

### `GET /api/ref/agences`
Returns a list of all bank agencies.
**Response:**
```json
[
  {
    "id": { "codeBanque": 1, "codeAgenceBct": 100 },
    "libAgence": "Agence Centrale"
  }
]
```

### `GET /api/ref/agences/{codeBanque}/{codeAgenceBct}`
Returns a specific agency.
**Response:**
```json
{
  "id": { "codeBanque": 1, "codeAgenceBct": 100 },
  "libAgence": "Agence Centrale"
}
```

### `GET /api/ref/agences/by-codes/{codeBanque}/{codeAgenceBct}`
Alternative endpoint to get a specific agency by codes.

### `GET /api/ref/agences/lib-agence/{codeBanque}/{codeAgenceBct}`
Returns only the agency name (string).
**Response:** `Agence Centrale`

### `POST /api/ref/agences` & `PUT /api/ref/agences/{codeBanque}/{codeAgenceBct}`
Create or update an agency.
**Request / Response:**
```json
{
  "id": { "codeBanque": 1, "codeAgenceBct": 100 },
  "libAgence": "Agence Centrale"
}
```

### `DELETE /api/ref/agences/{codeBanque}/{codeAgenceBct}`
Deletes an agency.

---

## 3. Banque API (`/api/ref/banques`)

### `GET /api/ref/banques`
Returns all banks.
**Response:**
```json
[
  {
    "codeBanque": 1,
    "libBanque": "Banque A"
  }
]
```

### `GET /api/ref/banques/{id}`
**Response:**
```json
{
  "codeBanque": 1,
  "libBanque": "Banque A"
}
```

### `GET /api/ref/banques/search/byCode/{codeBanque}`
Finds bank by code.

### `POST /api/ref/banques` & `PUT /api/ref/banques/{id}`
**Request:**
```json
{
  "codeBanque": 3,
  "libBanque": "Banque C"
}
```

### `DELETE /api/ref/banques/{id}`
Deletes a bank.

---

## 4. Central Bank Agreement API (`/api/ref/central-bank-agreements`)

### `GET /api/ref/central-bank-agreements/getall`
Returns all agreements.
**Response:**
```json
{
  "agreements": [
    {
      "typeAccordBct": "A",
      "numAccordBct": "12345",
      "dateAccordBct": "2023-01-01T00:00:00Z",
      "typePieceClient": 1,
      "noPieceClient": "12345678",
      "dateDebApplication": "2023-01-01T00:00:00Z",
      "dateFinApplication": "2024-01-01T00:00:00Z",
      "observation": "Test obs",
      "numContratCom": "C123",
      "dateContratCom": "2023-01-01T00:00:00Z",
      "sens": "R",
      "etat": "V"
    }
  ]
}
```

### `GET /api/ref/central-bank-agreements?noPieceClient=12345678`
Returns agreements for a client.

### `GET /api/ref/central-bank-agreements/mvt?noPieceClient=12345678`
Returns movements of agreements for a client.
**Response:**
```json
{
  "ok": true,
  "noPieceClient": "12345678",
  "total": 1,
  "records": [
    {
      "codeProduitService": "P1",
      "codeOperation": "O1",
      "dateOperation": "2023-10-10",
      "refOperation": "R1",
      "typeAccordBct": "A",
      "numAccordBct": "12345",
      "status": "VALID",
      "etat": "V"
    }
  ]
}
```

---

## 5. Classe API (`/api/ref/classes`)

### `GET /api/ref/classes/getall`
### `GET /api/ref/classes/by-key/{codeSection}/{codeDivision}/{codeGroupe}/{codeClasse}`
**Response:**
```json
{
  "codeSection": "A",
  "codeDivision": 1,
  "codeGroupe": 1,
  "codeClasse": 1,
  "libClasse": "Agriculture"
}
```

---

## 6. Client API (`/api/ref/clients`)

### `GET /api/ref/clients/getall`
### `GET /api/ref/clients/by-piece/{noPieceClient}`
### `GET /api/ref/clients/by-type/{typePieceClient}`
**Response:**
```json
[
  {
    "noPieceClient": "12345678",
    "typePieceClient": 1,
    "taxable": "O",
    "totalementExportatrice": "N",
    "residentON": "O",
    "clientProhibe": "N",
    "activiteSection": "A",
    "activiteDivision": 1,
    "codeDouane": "D123"
  }
]
```

### `GET /api/ref/clients/search/byPiece?typePiece=1&noPiece=12345678`
**Response:**
```json
{
  "nom": "DUPONT",
  "prenom": "Jean",
  "comptes": [
    {
      "codeAgenceBct": 10,
      "racineCompte": "0001",
      "cleRib": 12,
      "codeDevise": 1
    }
  ]
}
```

---

## 7. Compte API (`/api/ref/comptes`)

### `GET /api/ref/comptes/getall`
### `GET /api/ref/comptes/by-piece-client/{noPieceClient}`
### `GET /api/ref/comptes/by-agence/{codeAgenceBct}`
### `GET /api/ref/comptes/by-matemp-ag?matEmp=100&noPieceClient=12345678`
**Response:**
```json
[
  {
    "typePieceClient": 1,
    "noPieceClient": "12345678",
    "codeAgenceBct": 10,
    "racineCompte": "0001",
    "cleRib": 12,
    "codeAgenceBna": 5,
    "compteGeneral": "CG",
    "sousCompte": "SC",
    "codeDevise": 1,
    "etatCompte": "V"
  }
]
```

### `GET /api/ref/comptes/exists-combinaison?noPieceClient=X&codeAgenceBct=Y&racineCompte=Z&cleRib=W`
**Response:** `true` / `false`

### `GET /api/ref/comptes/debug/{noPieceClient}`
**Response:**
```json
[
  "codeAgenceBct=[10], racineCompte=[0001], cleRib=[12]"
]
```

---

## 8. Cours Jours Devise API (`/api/ref/cours-devises`)

### `GET /api/ref/cours-devises/latest`
### `GET /api/ref/cours-devises/getall`
### `GET /api/ref/cours-devises/by-devise/{codeDevise}`
**Response:**
```json
[
  {
    "dateCours": "2023-10-10",
    "codeDevise": 1,
    "coursAchat": 3.2,
    "coursVente": 3.3,
    "dateValeur": "2023-10-10",
    "coursValide": "O"
  }
]
```

---

## 9. Derogation API (`/api/ref/derogations`)

### `GET /api/ref/derogations`
**Response:**
```json
[
  {
    "codeDerogationCirculaire": "D1",
    "libelleDerogationCirculaire": "Dérogation speciale",
    "typeDerogation": "T",
    "natureDerogation": "N",
    "libelleAffiche": "Dérogation Affichée"
  }
]
```

---

## 10. Devise API (`/api/ref/devises`)

### `GET /api/ref/devises/getall`
### `GET /api/ref/devises/by-code/{codeDevise}`
**Response:**
```json
[
  {
    "codeDevise": 1,
    "sigleDevise": "EUR",
    "libDevise": "Euro"
  }
]
```

---

## 11. Donnee Ngp API (`/api/ref/donnee-ngp`)

### `GET /api/ref/donnee-ngp/getall`
### `GET /api/ref/donnee-ngp/by-code/{codeNgp}`
**Response:**
```json
[
  {
    "codeNgp": 123456,
    "libNgp": "Produits divers",
    "codeProhImp": "P",
    "codeProhExp": "P",
    "dateDebut": "2023-01-01"
  }
]
```

---

## 12. Donnees Generales API (`/api/ref/donnees-generales`)

### `GET /api/ref/donnees-generales`
### `GET /api/ref/donnees-generales/{codeBanque}`
**Response:**
*(Properties rely on entity mapping, example assuming usual parameters)*
```json
{
  "codeBanque": 1,
  "dateJournee": "2023-10-10"
}
```

---

## 13. Incoterm API (`/api/ref/incoterms`)

### `GET /api/ref/incoterms`
**Response:**
```json
[
  {
    "codeModLiv": "CFR",
    "libModLiv": "Cost and Freight",
    "libModLivFr": "Coût et Fret",
    "sigle": "CFR",
    "codeNatureOperation": 1
  }
]
```

---

## 14. Mode Paiement API (`/api/ref/mode-paiements`)

### `GET /api/ref/mode-paiements`
### `GET /api/ref/mode-paiements/{code}`
**Response:**
```json
{
  "codeModePaiement": "VIREMENT",
  "libelle": "Virement bancaire"
}
```

---

## 15. Nsh API (`/api/ref/nsh`)

### `GET /api/ref/nsh?mode=live`
**Response:**
```json
[
  {
    "codeNgp": 123456,
    "libReserve": "Reserve A",
    "reserveNgps": [
      {
        "codeReserve": 10,
        "natureOpe": "I",
        "dateInsertion": "2023-10-10T00:00:00Z",
        "t21": "X",
        "t22": "Y"
      }
    ]
  }
]
```

---

## 16. Payment Mode API (`/api/ref/payment-modes`)

*(Similar to Mode Paiement but mapped to generic `PaymentModeDTO`)*
### `GET /api/ref/payment-modes`
**Response:**
```json
[
  {
    "codeModReg": 1,
    "libModReg": "Chèque",
    "dom": "Local"
  }
]
```

---

## 17. Pays API (`/api/ref/pays`)

### `GET /api/ref/pays/getall`
### `GET /api/ref/pays/by-code/{codePays}`
**Response:**
```json
[
  {
    "codePays": 1,
    "libPays": "Tunisie"
  }
]
```

---

## 18. Personne API (`/api/ref/personnes`)

### `GET /api/ref/personnes`
### `GET /api/ref/personnes/by-nopiececlient/{noPiecePersonne}`
### `GET /api/ref/personnes/search/{typePiecePersonne}/{noPiecePersonne}`
**Response:**
```json
{
  "id": { "typePiecePersonne": 1, "noPiecePersonne": "12345678" },
  "nom": "DUPONT",
  "prenom": "Jean",
  "raisonSociale": "Entreprise A"
}
```

### `GET /api/ref/personnes/verif/{typePiecePersonne}/{noPiecePersonne}`
**Response:** `1` (Integer indicating validity/count/status)

---

## 19. Piece API (`/api/ref/pieces`)

### `GET /api/ref/pieces`
### `GET /api/ref/pieces/{codePiece}`
**Response:**
```json
{
  "codePiece": 1,
  "libPiece": "Facture"
}
```

---

## 20. Regime Stat Titre API (`/api/ref/regime-stat-titres`)

### `GET /api/ref/regime-stat-titres/active`
**Response:**
```json
[
  {
    "codeTitre": 10,
    "codeRegimeStat": 5,
    "dateFinApplication": "2024-12-31T00:00:00Z"
  }
]
```

---

## 21. Secteur Activite API (`/api/ref/secteur-activite`)

### `GET /api/ref/secteur-activite/controler?codeActivite=A12&activiteLabel=Principale&blocage=true`
**Response:** `"Secteur Valide"` (String representing class/label)

---

## 22. Settlement Deadline API (`/api/ref/settlement-deadlines`)

### `GET /api/ref/settlement-deadlines`
**Response:**
```json
[
  {
    "codeDelReg": 1,
    "libDelReg": "30 Jours",
    "delais": 30,
    "periode": "J",
    "modeReg": 1,
    "ordre": 1
  }
]
```

---

## 23. Stat Regime API (`/api/ref/stat-regimes`)

### `GET /api/ref/stat-regimes`
**Response:**
```json
[
  {
    "codeRegimeStat": 1,
    "libRegimeStat": "Regime Standard"
  }
]
```

---

## 24. TPiece API (`/api/ref/tpieces`)

### `GET /api/ref/tpieces`
### `GET /api/ref/tpieces/{codeTypePiece}`
**Response:**
```json
{
  "codeTypePiece": 1,
  "libelleTypePiece": "CNI"
}
```

---

## 25. Unit API (`/api/ref/units`)

### `GET /api/ref/units`
**Response:**
```json
[
  {
    "codeUnite": "KG",
    "libUnite": "Kilogramme",
    "nomForme": "Kilo"
  }
]
```
