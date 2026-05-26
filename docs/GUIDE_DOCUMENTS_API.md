# Guide — Documents AVA : consultation et envoi

## Vue d'ensemble

Le flux est en deux étapes :

```
1. GET /api/business-rules/documents-requis   → savoir quels documents fournir
2. POST /api/operations-deleguees-mvt         → créer le dossier en incluant les documents
```

---

## Étape 1 — Consulter les documents requis

### Endpoint

```
GET /api/business-rules/documents-requis
```

### Paramètres

| Paramètre          | Obligatoire | Type      | Description                                              |
|--------------------|-------------|-----------|----------------------------------------------------------|
| `codeTypeDosAva`   | Oui         | Integer   | Type de dossier AVA (1 à 5)                              |
| `naturePieceClient`| Oui         | String    | `"P"` = personne physique · `"M"` = personne morale     |
| `codeActivite`     | Non         | Integer   | Si fourni, inclut les règles liées à cette activité      |
| `codeOperation`    | Non         | Integer   | Défaut : `200`                                           |

### Exemples Postman

**Personne physique — type dossier 3, sans activité**
```
GET http://localhost:8080/api/business-rules/documents-requis?codeTypeDosAva=3&naturePieceClient=P
Authorization: Bearer <token>
X-Session-Id: <session-id>
```

**Personne morale — type dossier 3, avec activité 10**
```
GET http://localhost:8080/api/business-rules/documents-requis?codeTypeDosAva=3&naturePieceClient=M&codeActivite=10
Authorization: Bearer <token>
X-Session-Id: <session-id>
```

### Réponse

```json
[
  {
    "codePiece": 1,
    "codeOperation": 200,
    "codeTypeDosAva": 3,
    "codeActivite": null,
    "naturePieceClient": "P",
    "obligatoire": "O",
    "estObligatoire": true
  },
  {
    "codePiece": 2,
    "codeOperation": 200,
    "codeTypeDosAva": 3,
    "codeActivite": null,
    "naturePieceClient": "P",
    "obligatoire": "O",
    "estObligatoire": true
  },
  {
    "codePiece": 5,
    "codeOperation": 200,
    "codeTypeDosAva": 3,
    "codeActivite": null,
    "naturePieceClient": "P",
    "obligatoire": "N",
    "estObligatoire": false
  }
]
```

### Lecture du résultat

| Champ           | Signification                                                          |
|-----------------|------------------------------------------------------------------------|
| `codePiece`     | Code du document — c'est ce que vous mettez dans `typeDocument` à l'envoi |
| `estObligatoire`| `true` → doit être présent dans le tableau `documents` du dossier     |
| `obligatoire`   | Valeur brute en base : `"O"` = obligatoire · `"N"` = facultatif       |
| `codeActivite`  | `null` = règle commune · valeur = règle spécifique à l'activité       |

> **Règle de validation** : tous les `codePiece` où `estObligatoire = true`
> doivent apparaître dans `documents[].typeDocument` lors de la création du dossier,
> sinon le back retourne `AVA-DOC-MANQUANT`.

---

## Étape 2 — Créer le dossier avec les documents

### Endpoint

```
POST /api/operations-deleguees-mvt?finalize=true
```

### Structure du body

```json
{
  "codeProduitService": 1,
  "codeOperation": 200,
  "codeTypeDosAva": 3,
  "numDossier": 9580426,
  "codeAgenceAva": 1,
  "typePieceClient": 1,
  "noPieceClient": "12345678M",
  "numeroCompte": "10006000123456789012",
  "codeActivite": 10,

  "documents": [
    {
      "typeDocument": 1,
      "referenceFichierJoint": "registre_commerce.pdf",
      "extention": "pdf",
      "codeProduitService": 1,
      "codeOperation": 200
    },
    {
      "typeDocument": 2,
      "referenceFichierJoint": "statuts_societe.pdf",
      "extention": "pdf",
      "codeProduitService": 1,
      "codeOperation": 200
    },
    {
      "typeDocument": 3,
      "referenceFichierJoint": "contrat_importation.pdf",
      "extention": "pdf",
      "codeProduitService": 1,
      "codeOperation": 200
    }
  ]
}
```

### Champs du DocumentDTO

| Champ                 | Obligatoire | Type        | Description                                            |
|-----------------------|-------------|-------------|--------------------------------------------------------|
| `typeDocument`        | Oui         | Long        | Code pièce — doit correspondre à un `codePiece` de la table |
| `referenceFichierJoint` | Oui       | String      | Nom ou référence du fichier                            |
| `extention`           | Oui         | String      | Extension du fichier : `"pdf"`, `"jpg"`, `"png"`…     |
| `codeProduitService`  | Oui         | Short       | Code produit/service                                   |
| `codeOperation`       | Oui         | Integer     | Code opération (même valeur que dans le dossier)       |
| `numLigne`            | Non         | Long        | Auto-incrémenté par le back (1, 2, 3…)                |
| `refOperation`        | Non         | Long        | Rempli automatiquement depuis le MVT                  |
| `dateOperation`       | Non         | LocalDate   | Rempli automatiquement (SYSDATE)                      |
| `numDossier`          | Non         | Integer     | Rempli automatiquement depuis le MVT                  |
| `dateDossier`         | Non         | LocalDate   | Rempli automatiquement (SYSDATE)                      |
| `pathAnnee`           | Non         | String      | Rempli automatiquement — année en cours ex: `"2026"`  |
| `pathMois`            | Non         | String      | Rempli automatiquement — mois en cours ex: `"05"`     |

---

## Flux complet — exemple pas à pas

### Contexte
- Type dossier : 3
- Client : personne morale (`M`)
- Activité : non spécifiée

### 1. Récupérer les documents requis

```
GET http://localhost:8080/api/business-rules/documents-requis?codeTypeDosAva=3&naturePieceClient=M
Authorization: Bearer eyJhbGc...
X-Session-Id: session-123
```

Réponse (extrait) :
```json
[
  { "codePiece": 1,  "estObligatoire": true  },
  { "codePiece": 2,  "estObligatoire": true  },
  { "codePiece": 3,  "estObligatoire": true  },
  { "codePiece": 7,  "estObligatoire": true  },
  { "codePiece": 9,  "estObligatoire": true  },
  { "codePiece": 11, "estObligatoire": true  },
  { "codePiece": 14, "estObligatoire": true  },
  { "codePiece": 22, "estObligatoire": true  },
  { "codePiece": 23, "estObligatoire": true  }
]
```

### 2. Préparer et envoyer le dossier

Inclure **tous** les `codePiece` avec `estObligatoire: true` dans le tableau `documents` :

```
POST http://localhost:8080/api/operations-deleguees-mvt?finalize=true
Authorization: Bearer eyJhbGc...
X-Session-Id: session-123
Content-Type: application/json
```

```json
{
  "codeProduitService": 1,
  "codeOperation": 200,
  "codeTypeDosAva": 3,
  "numDossier": 9580426,
  "noPieceClient": "12345678M",
  "numeroCompte": "10006000123456789012",

  "documents": [
    { "typeDocument": 1,  "referenceFichierJoint": "doc_piece_1.pdf",  "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 },
    { "typeDocument": 2,  "referenceFichierJoint": "doc_piece_2.pdf",  "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 },
    { "typeDocument": 3,  "referenceFichierJoint": "doc_piece_3.pdf",  "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 },
    { "typeDocument": 7,  "referenceFichierJoint": "doc_piece_7.pdf",  "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 },
    { "typeDocument": 9,  "referenceFichierJoint": "doc_piece_9.pdf",  "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 },
    { "typeDocument": 11, "referenceFichierJoint": "doc_piece_11.pdf", "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 },
    { "typeDocument": 14, "referenceFichierJoint": "doc_piece_14.pdf", "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 },
    { "typeDocument": 22, "referenceFichierJoint": "doc_piece_22.pdf", "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 },
    { "typeDocument": 23, "referenceFichierJoint": "doc_piece_23.pdf", "extention": "pdf", "codeProduitService": 1, "codeOperation": 200 }
  ]
}
```

---

## Erreurs possibles

| Code erreur            | Cause                                                               | Solution                                                    |
|------------------------|---------------------------------------------------------------------|-------------------------------------------------------------|
| `AVA-DOC-PARAM-MANQUANT` | `codeTypeDosAva` ou `naturePieceClient` absent dans le GET        | Ajouter les deux paramètres obligatoires                    |
| `AVA-DOC-PARAMS-ABSENTS` | Aucune règle trouvée en base pour les paramètres fournis          | Vérifier que la table `TYPOLOGIE_PIECE_OPERATION` est alimentée |
| `AVA-DOC-MANQUANT`     | Un ou plusieurs documents obligatoires manquants dans le POST      | Ajouter les `typeDocument` manquants listés dans le message |
| `401 Unauthorized`     | Token absent, expiré ou `X-Session-Id` manquant/incorrect          | Se reconnecter via `POST /auth/login` avec `X-Session-Id`  |
| `403 Forbidden`        | Rôle insuffisant                                                   | Vérifier les rôles de l'utilisateur dans SWF-Auth           |
