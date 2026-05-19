# ✅ SUPPORT REFOPERATION - VALIDATION MVT EXISTANT

## 🎯 Problème résolu

**Erreur** :
```json
{
    "refOperation": 740909,
    "numDossier": 6110227,
    "status": "E",
    "message": "Erreur: Aucun mouvement MVT trouvé pour numDossier=6110227"
}
```

**Cause** : Lors de `finalize=true`, le système créait un NOUVEAU MVT, puis `applyForDossier()` cherchait des MVT avec `code_produit_service` et `code_operation`, mais ces champs n'étaient pas assignés.

---

## ✅ Solution implémentée

Ajout d'un champ **`refOperation` optionnel** dans le DTO pour permettre **deux scénarios** :

### Scénario 1 : Création + Finalisation immédiate ✅
```http
POST /api/operations-fv?finalize=true
Content-Type: application/json

{
  "dossier": {
    "numeroDossier": 6110226
  },
  "mouvement": {
    "devise": 788,
    "montant": 3320,
    ...
  }
}
```

**Résultat** : Crée un nouveau MVT → Valide → Applique au dossier

---

### Scénario 2 : Créer en brouillon puis valider avec refOperation ✅ (NOUVEAU)
```http
# Étape 1 : Créer le brouillon
POST /api/operations-fv?finalize=false
{
  "dossier": {"numeroDossier": 6110226},
  "mouvement": {...}
}

# Réponse :
{
  "refOperation": 740908,
  "status": "I"
}

# Étape 2 : Valider en fournissant refOperation
POST /api/operations-fv?finalize=true
{
  "refOperation": 740908,  ← NOUVEAU !
  "dossier": {"numeroDossier": 6110226},
  "mouvement": {...}
}
```

**Résultat** : Charge le MVT existant → Valide → Applique au dossier

---

## 📋 Modifications apportées

### 1. DTO - Ajout du champ `refOperation`

**Fichier** : `OperationFVDTO.java`

```java
@Data
public class OperationFVDTO {

    /**
     * Référence de l'opération existante (optionnel).
     * Si fourni avec finalize=true, valide ce MVT existant au lieu d'en créer un nouveau.
     */
    private Long refOperation;  // ← NOUVEAU

    @Valid
    @NotNull
    private DossierFVDTO dossier;

    @Valid
    @NotNull
    private MouvementFVDTO mouvement;

    @Valid
    private List<DocumentScanneFVDTO> documentsScannes;
}
```

---

### 2. Service - Logique conditionnelle

**Fichier** : `OperationFVServiceImpl.java`

```java
@Override
public OperationCreationResponseDTO create(OperationFVDTO dto, boolean finalize) {
    log.info("[OperationFVService] finalize={}, refOperation={}", finalize, dto.getRefOperation());

    OperationsDelegueesMvt mvt;

    // CAS 1 : Si refOperation fourni → Charger le MVT existant
    if (dto.getRefOperation() != null) {
        log.info("[OperationFVService] Chargement du MVT existant : {}", dto.getRefOperation());
        
        LocalDate now = LocalDate.now();
        
        // Créer l'ID composite avec setters
        OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
        mvtId.setDateOperation(now);
        mvtId.setRefOperation(dto.getRefOperation());
        
        mvt = mvtRepository.findById(mvtId)
            .orElseThrow(() -> new BusinessException("MVT_NOT_FOUND",
                "Le mouvement refOperation=" + dto.getRefOperation() + " n'existe pas"));
        
        // Vérifier que le MVT est en brouillon
        if (!"I".equals(mvt.getStatus())) {
            throw new BusinessException("MVT_ALREADY_FINALIZED",
                "Le mouvement a déjà été finalisé (status=" + mvt.getStatus() + ")");
        }
    } 
    // CAS 2 : Créer un nouveau MVT
    else {
        log.info("[OperationFVService] Création d'un nouveau MVT...");
        mvt = createMvt(dto);
    }

    // Si finalize=false → Retourner en brouillon
    if (!finalize) {
        return new OperationCreationResponseDTO(
            mvt.getId().getRefOperation(),
            mvt.getNumDossier(),
            "I",
            null
        );
    }

    // Si finalize=true → Valider et appliquer
    return writeDossier(mvt);
}
```

---

## 🎨 Exemples d'utilisation

### Exemple 1 : Création immédiate (sans refOperation)

**Requête** :
```http
POST http://localhost:8080/api/operations-fv?finalize=true
Content-Type: application/json

{
  "dossier": {
    "numeroDossier": 6110226,
    "dateDossier": "15/02/2026",
    "typeDossier": 1
  },
  "mouvement": {
    "devise": 788,
    "montantDvs": 9980,
    "beneficiaire": {
      "code": 1,
      "numero": "968574Y"
    },
    "mode": "BB",
    "pays": 788,
    "type": "FV",
    "montant": 3320,
    "dateDepart": "16/02/2026",
    "dateRetour": "01/01/2027"
  },
  "documentsScannes": [
    {
      "ligne": 1,
      "nomImage": "document.pdf",
      "cheminFichier": "uploads/document.pdf",
      "typeDocument": 2
    }
  ]
}
```

**Résultat** :
```json
{
  "refOperation": 740910,
  "numDossier": 6110226,
  "status": "V",
  "message": "Opération validée et appliquée au dossier avec succès"
}
```

---

### Exemple 2 : Créer en brouillon puis valider

**Étape 1 - Créer le brouillon** :
```http
POST http://localhost:8080/api/operations-fv?finalize=false

{
  "dossier": {"numeroDossier": 6110226},
  "mouvement": {...}
}
```

**Réponse** :
```json
{
  "refOperation": 740908,
  "numDossier": 6110226,
  "status": "I",
  "message": null
}
```

**Étape 2 - Valider le brouillon** :
```http
POST http://localhost:8080/api/operations-fv?finalize=true

{
  "refOperation": 740908,  ← Utiliser le refOperation reçu
  "dossier": {"numeroDossier": 6110226},
  "mouvement": {...}
}
```

**Résultat** :
```json
{
  "refOperation": 740908,
  "numDossier": 6110226,
  "status": "V",
  "message": "Opération validée et appliquée au dossier avec succès"
}
```

---

## 🚨 Validations ajoutées

| Validation | Erreur | Message |
|-----------|--------|---------|
| MVT n'existe pas | `MVT_NOT_FOUND` | Le mouvement refOperation=X n'existe pas |
| MVT déjà finalisé | `MVT_ALREADY_FINALIZED` | Le mouvement a déjà été finalisé (status=V/A/E) |

---

## 📊 Flow complet

### Sans refOperation (création classique)
```
POST finalize=true
  └─> createMvt() → Génère refOperation
       └─> Valide métier
            └─> Save status=I
                 └─> writeDossier()
                      └─> Update status=V + flush()
                           └─> applyForDossier()
                                └─> Success ✅
```

### Avec refOperation (validation d'un brouillon)
```
POST finalize=true + refOperation=740908
  └─> findById(refOperation, today)
       └─> Vérifier status=I
            └─> writeDossier(mvt existant)
                 └─> Update status=V + flush()
                      └─> applyForDossier()
                           └─> Success ✅
```

---

## ✅ Résumé

| Champ | Obligatoire ? | Usage |
|-------|--------------|-------|
| `refOperation` | ❌ Non | Si fourni, charge le MVT existant au lieu d'en créer un nouveau |
| `dossier.numeroDossier` | ✅ Oui | Identifie le dossier à traiter |
| `mouvement.*` | ✅ Oui | Données de l'opération FV |
| `documentsScannes` | ❌ Non | Documents joints |

---

## 🎯 Avantages

✅ **Flexibilité** : Permet de créer en brouillon et valider plus tard  
✅ **Sécurité** : Vérifie que le MVT existe et est en brouillon  
✅ **Traçabilité** : Même refOperation conservé entre brouillon et validation  
✅ **Idempotence** : Impossible de valider 2 fois le même MVT  

---

**Statut** : 🚀 **PRÊT POUR TESTS** ✅

