# 🎯 API Frais de Voyage (FV) - Guide des Endpoints

## 📋 Vue d'ensemble

Le module **Frais de Voyage (FV)** gère les opérations de frais de voyage pour les dossiers AVA existants. Il implémente le pattern "finalize" permettant de créer des brouillons ou d'appliquer directement les opérations.

**Base URL** : `http://localhost:8080/api/operations-fv`

---

## 🔗 Endpoints disponibles

### 1. Créer une opération FV

**Endpoint** : `POST /api/operations-fv`

**Paramètres** :
- `finalize` (query param, optionnel) : `true` ou `false` (défaut: `false`)

**Comportement** :
- `finalize=false` : Crée un brouillon (status **I**) sans modifier le dossier
- `finalize=true` : Crée et applique immédiatement (status **I** → **V** → **A** ou **E**)

#### Exemple de requête (finalize=true)

```http
POST http://localhost:8080/api/operations-fv?finalize=true
Content-Type: application/json

{
  "dossier": {
    "numeroDossier": 123456,
    "dateDossier": "2026-03-03",
    "agence": 17,
    "compteRib": {
      "ribComplet": "12345678901234567890"
    }
  },
  "montants": {
    "solde": 50000.00,
    "avance": 10000.00,
    "autorise": 60000.00,
    "utilise": 0.00,
    "caFiscalHT": 500000.00,
    "devise": 788
  },
  "mouvement": {
    "montant": 5000.00,
    "montantDvs": 500.00,
    "mode": "BB",
    "pays": "FRA",
    "dateDepart": "2026-03-10",
    "dateRetour": "2026-03-20",
    "beneficiaire": {
      "typePiece": 1,
      "numeroPiece": "12345678",
      "nomPrenom": "DUPONT Jean"
    }
  },
  "documentScanne": {
    "typeDocument": 1,
    "referenceFichierJoint": "DOC_FV_2026_001",
    "extension": "pdf"
  }
}
```

#### Réponse (succès avec finalize=true)

```json
HTTP/1.1 201 Created
{
  "refOperation": 789456,
  "numDossier": 123456,
  "status": "A",
  "message": "Opération Frais de Voyage appliquée avec succès"
}
```

#### Réponse (brouillon avec finalize=false)

```json
HTTP/1.1 201 Created
{
  "refOperation": 789456,
  "numDossier": 123456,
  "status": "I",
  "message": null
}
```

---

### 2. Valider un brouillon existant

**Endpoint** : `PUT /api/operations-fv/validate/{refOperation}`

**Description** : Valide et applique un mouvement FV en status **I** (brouillon) au dossier.

#### Exemple de requête

```http
PUT http://localhost:8080/api/operations-fv/validate/789456
```

#### Réponse (succès)

```json
HTTP/1.1 200 OK
{
  "refOperation": 789456,
  "numDossier": 123456,
  "status": "A",
  "message": "Opération Frais de Voyage appliquée avec succès"
}
```

#### Réponse (erreur)

```json
HTTP/1.1 200 OK
{
  "refOperation": 789456,
  "numDossier": 123456,
  "status": "E",
  "message": "Erreur lors de l'application de l'opération FV au dossier"
}
```

---

### 3. Récupérer une opération FV

**Endpoint** : `GET /api/operations-fv/{refOperation}`

**Description** : Récupère les détails complets d'une opération FV par sa référence.

#### Exemple de requête

```http
GET http://localhost:8080/api/operations-fv/789456
```

#### Réponse

```json
HTTP/1.1 200 OK
{
  "dossier": {
    "numeroDossier": 123456,
    "dateDossier": "2026-03-03",
    "agence": 17,
    "typeDossier": 3,
    "compteRib": {
      "ribComplet": "12345678901234567890"
    }
  },
  "montants": {
    "solde": 45000.00,
    "avance": 10000.00,
    "autorise": 60000.00,
    "utilise": 5000.00,
    "caFiscalHT": 500000.00,
    "devise": 788
  },
  "mouvement": {
    "montant": 5000.00,
    "montantDvs": 500.00,
    "mode": "BB",
    "pays": "FRA",
    "dateDepart": "2026-03-10",
    "dateRetour": "2026-03-20",
    "beneficiaire": {
      "typePiece": 1,
      "numeroPiece": "12345678",
      "nomPrenom": "DUPONT Jean"
    }
  }
}
```

---

## 🔍 Les 4 statuts d'une opération FV

| Status | Signification | Description |
|--------|--------------|-------------|
| **I** | Initial (Brouillon) | Mouvement créé mais pas encore appliqué au dossier |
| **V** | Validé | Mouvement marqué comme validé, en cours d'application |
| **A** | Appliqué | ✅ Mouvement appliqué avec succès au dossier |
| **E** | Erreur | ❌ Erreur lors de l'application (sera retenté automatiquement) |

---

## ✅ Validations effectuées

Le service FV effectue les validations suivantes :

### 1. Validation de l'état du dossier
- Le dossier doit exister
- L'état du dossier doit être exactement **'V'** (Valide)

### 2. Validation du compte RIB
- Le RIB doit contenir exactement **20 chiffres**
- Format : `[CodeBanque(2)][CodeAgence(3)][RacineCompte(13)][CléRIB(2)]`

### 3. Validation de la devise
- La devise doit exister dans le référentiel (via API REF)

### 4. Validation financière
- Le solde est calculé : `solde = mntAutorise + mntAvance - mntUtilise - mntReserve - mntBlocage`
- Le montant demandé doit être ≤ solde disponible

### 5. Validation du mode de paiement
- Le mode doit exister dans le référentiel
- Pour les modes **BB**, **CH**, **TC** : montant maximum = **30 000 TND**

### 6. Validation des dates de voyage
- `dateDepart` doit être < `dateRetour`

### 7. Validation du bénéficiaire
- Le bénéficiaire doit exister dans la table `BENEFICIAIRE` pour ce dossier

---

## 📊 Exemples de cas d'usage

### Cas 1 : Workflow en 2 étapes (brouillon puis validation)

```http
# Étape 1 : Créer un brouillon
POST /api/operations-fv?finalize=false
→ Response: { "status": "I", "refOperation": 789456 }

# Étape 2 : Valider le brouillon plus tard
PUT /api/operations-fv/validate/789456
→ Response: { "status": "A" }
```

**Cas d'usage** : Interface avec validation humaine, possibilité de modifier avant validation.

---

### Cas 2 : Workflow en 1 étape (direct)

```http
POST /api/operations-fv?finalize=true
→ Response: { "status": "A", "refOperation": 789456 }
```

**Cas d'usage** : API automatique, intégration système, pas besoin de brouillon.

---

## ⚠️ Codes d'erreur courants

| Code HTTP | Erreur Business | Description |
|-----------|----------------|-------------|
| 422 | `DOSSIER_INEXISTANT` | Le numéro de dossier n'existe pas |
| 422 | `ETAT_DOSSIER_INVALIDE` | Le dossier n'est pas en état 'V' (Valide) |
| 422 | `COMPTE_RIB_INVALIDE` | Le RIB n'a pas 20 chiffres |
| 422 | `DEVISE_INVALIDE` | La devise n'existe pas |
| 422 | `SOLDE_INSUFFISANT` | Montant demandé > solde disponible |
| 422 | `MONTANT_DEPASSE_LIMITE` | Montant > 30 000 TND pour mode BB/CH/TC |
| 422 | `DATES_VOYAGE_INVALIDES` | Date départ >= date retour |
| 422 | `BENEFICIAIRE_INEXISTANT` | Le bénéficiaire n'existe pas pour ce dossier |
| 404 | `MVT_NOT_FOUND` | Mouvement introuvable (lors du validate) |

---

## 🔧 Configuration

**application.properties** :
```properties
# API externe pour la validation des devises et modes de paiement
api.ref.base-url=http://localhost:8090
```

---

## 📝 Notes importantes

1. **Code opération FV** : `250`
2. **Code produit service** : `108`
3. **Pattern finalize** : Toutes les opérations FV utilisent le pattern 2-phases
4. **Récupération automatique** : Les opérations en status **E** sont retentées automatiquement par le scheduler
5. **Lock pessimiste** : L'application au dossier utilise un lock pour éviter les conflits concurrents

---

## 🚀 Tester avec cURL

### Créer et appliquer directement

```bash
curl -X POST "http://localhost:8080/api/operations-fv?finalize=true" \
  -H "Content-Type: application/json" \
  -d '{
    "dossier": {
      "numeroDossier": 123456,
      "compteRib": {"ribComplet": "12345678901234567890"}
    },
    "montants": {
      "solde": 50000,
      "devise": 788
    },
    "mouvement": {
      "montant": 5000,
      "mode": "BB",
      "pays": "FRA",
      "dateDepart": "2026-03-10",
      "dateRetour": "2026-03-20",
      "beneficiaire": {
        "typePiece": 1,
        "numeroPiece": "12345678"
      }
    }
  }'
```

### Récupérer une opération

```bash
curl -X GET "http://localhost:8080/api/operations-fv/789456"
```

---

## 📚 Documentation complémentaire

- **Guide FV complet** : `BusinessRulesFV_Recreation_Guide.md`
- **Guide pattern finalize** : `FINALIZE_PATTERN_SIMPLIFIED_GUIDE.md`
- **Documentation projet** : `DOCUMENTATION_PROJET.md`

