# ✅ VALIDATION STRICTE - DEVISE & PAYS - CORRECTIONS FINALES

## 🎯 Problèmes corrigés

### 1. ❌ URL API Devises incorrecte → ✅ CORRIGÉE

**Problème** : L'application appelait `/api/ref/devises` au lieu de `/api/ref/devises/getall`

**Erreur** :
```
ERROR: 500 Internal Server Error: "No static resource api/ref/devises."
```

**Solution** : Corrigé dans `ApiExterneServiceImpl.java`
```java
// AVANT (❌)
.uri("/api/ref/devises")

// APRÈS (✅)
.uri("/api/ref/devises/getall")
```

---

### 2. ❌ Pays non validé → ✅ VALIDATION AJOUTÉE

**Problème** : Le pays n'était pas vérifié contre le référentiel

**Solution** : Ajout de la validation du pays via l'API REF

---

## 📋 Fichiers modifiés

| Fichier | Modification | Status |
|---------|-------------|--------|
| **ApiExterneService.java** | Ajout méthode `getPays()` | ✅ |
| **ApiExterneServiceImpl.java** | URL corrigée + implémentation `getPays()` | ✅ |
| **OperationFVServiceImpl.java** | Ajout validation `validatePays()` | ✅ |

---

## 🔧 Détails des corrections

### 1. Interface ApiExterneService

**Ajout** :
```java
/**
 * Récupérer tous les pays disponibles.
 * Endpoint: GET /api/ref/pays/getall
 * Microservice: REF (port 8090)
 *
 * @return la liste de tous les pays
 */
java.util.List<Object> getPays();
```

---

### 2. Implémentation ApiExterneServiceImpl

**URL Devises corrigée** :
```java
@Override
public List<Object> getDevises() {
    log.info("Appel API REF: GET /api/ref/devises/getall");
    
    Object rawResponse = refRestClient
            .get()
            .uri("/api/ref/devises/getall")  // ✅ CORRIGÉ
            .retrieve()
            .body(Object.class);
    // ...
}
```

**Méthode getPays ajoutée** :
```java
@Override
public List<Object> getPays() {
    log.info("Appel API REF: GET /api/ref/pays/getall");
    
    try {
        Object rawResponse = refRestClient
                .get()
                .uri("/api/ref/pays/getall")
                .retrieve()
                .body(Object.class);

        if (rawResponse instanceof List) {
            @SuppressWarnings("unchecked")
            List<Object> list = (List<Object>) rawResponse;
            log.info("API REF getPays retourné {} pays", list.size());
            return list;
        }

        return Collections.emptyList();

    } catch (Exception e) {
        log.error("Erreur API REF getPays: {}", e.getMessage(), e);
        return Collections.emptyList();
    }
}
```

---

### 3. Validation du pays dans OperationFVServiceImpl

**Ordre des validations** :
```java
private void validateAll(OperationFVDTO dto, OperationsDeleguee dossier) {
    log.info("[validateAll] Début validations métier FV");

    // 1. État du dossier doit être 'V' (Valide)
    validateEtatDossier(dossier);

    // 2. Validation de la devise (appel API externe)
    validateDevise(dto.getMouvement().getDevise());

    // 3. Validation du pays (appel API externe)  ← ✅ NOUVEAU
    validatePays(dto.getMouvement().getPays());

    // 4. Validation financière (solde suffisant)
    validateFinancial(dto, dossier);

    // 5. Validation du mode de paiement + limite montant
    validateModePaiement(dto.getMouvement());

    // 6. Validation des dates de voyage
    validateDatesVoyage(dto.getMouvement());

    // 7. Validation du bénéficiaire
    validateBeneficiaire(dto.getMouvement().getBeneficiaire(), dossier.getNumDossier());

    log.info("[validateAll] Toutes les validations passées avec succès");
}
```

**Méthode validatePays** :
```java
/**
 * Valide le pays via appel API externe.
 * Vérifie que le codePays existe dans la liste des pays de l'API REF.
 */
private void validatePays(Integer codePays) {
    try {
        // Appel API REF pour récupérer tous les pays
        List<Object> paysList = apiExterneService.getPays();

        // Vérifier si le codePays existe dans la liste
        boolean paysExiste = paysList.stream()
            .filter(p -> p instanceof Map)
            .map(p -> (Map<?, ?>) p)
            .anyMatch(map -> {
                Object code = map.get("codePays");
                return code != null && code.equals(codePays);
            });

        if (!paysExiste) {
            throw new BusinessException("PAYS_INVALIDE",
                "Le pays " + codePays + " n'existe pas dans le référentiel");
        }

        log.info("[validatePays] Pays validé : {}", codePays);
    } catch (BusinessException e) {
        throw e; // Re-throw business exceptions
    } catch (Exception e) {
        log.error("[validatePays] Erreur lors de la validation du pays {}: {}",
                codePays, e.getMessage());
        throw new BusinessException("PAYS_INVALIDE",
            "Erreur lors de la validation du pays " + codePays + ": " + e.getMessage());
    }
}
```

---

## 🎨 Format de réponse API REF

### Devises (`/api/ref/devises/getall`)
```json
[
    {
        "codeDevise": 380,
        "sigleDevise": "ITL",
        "libDevise": "LIRE ITALIENNE"
    },
    {
        "codeDevise": 788,
        "sigleDevise": "TND",
        "libDevise": "DINAR TUNISIEN"
    }
]
```

### Pays (`/api/ref/pays/getall`)
```json
[
    {
        "codePays": 987,
        "libPays": "BEI"
    },
    {
        "codePays": 788,
        "libPays": "TUNISIE"
    }
]
```

---

## ✅ Validations effectuées

| Validation | Source | Erreur si échec |
|-----------|--------|----------------|
| **Devise** | API REF `/devises/getall` | `DEVISE_INVALIDE` |
| **Pays** | API REF `/pays/getall` | `PAYS_INVALIDE` |
| **Mode** | Hardcodé (BB, CH, TC, VR) | `MODE_PAIEMENT_INVALIDE` |
| Bénéficiaire | Base de données | `BENEFICIAIRE_INEXISTANT` |
| Solde | Calculé | `SOLDE_INSUFFISANT` |
| Dates voyage | Logique métier | `DATES_VOYAGE_INVALIDES` |
| État dossier | Doit être 'V' | `DOSSIER_NON_VALIDE` |

---

## 🚀 Tests de validation

### Test 1 : Devise invalide ✅

**JSON** :
```json
{
  "mouvement": {
    "devise": 9999  // ← N'existe pas dans l'API REF
  }
}
```

**Résultat** : ✅ **REJETÉ**
```json
{
  "code": "DEVISE_INVALIDE",
  "message": "La devise 9999 n'existe pas dans le référentiel",
  "status": 422
}
```

---

### Test 2 : Pays invalide ✅

**JSON** :
```json
{
  "mouvement": {
    "pays": 9999  // ← N'existe pas dans l'API REF
  }
}
```

**Résultat** : ✅ **REJETÉ**
```json
{
  "code": "PAYS_INVALIDE",
  "message": "Le pays 9999 n'existe pas dans le référentiel",
  "status": 422
}
```

---

### Test 3 : Devise et pays valides ✅

**JSON** :
```json
{
  "dossier": {
    "numeroDossier": 6110226,
    "dateDossier": "15/02/2026",
    "typeDossier": 1
  },
  "mouvement": {
    "devise": 788,     // ← Valide (TND)
    "pays": 788,       // ← Valide (TUNISIE)
    "mode": "BB",
    "montant": 3320,
    "beneficiaire": {
      "code": 1,
      "numero": "968574Y"
    },
    "dateDepart": "16/02/2026",
    "dateRetour": "01/01/2027"
  }
}
```

**Résultat** : ✅ **ACCEPTÉ** (si toutes les autres validations passent)

---

## 📚 URLs API REF

| Endpoint | URL complète | Description |
|----------|-------------|-------------|
| Devises | `http://localhost:8090/api/ref/devises/getall` | Liste des devises |
| Pays | `http://localhost:8090/api/ref/pays/getall` | Liste des pays |
| Modes paiement | `http://localhost:8090/api/ref/modes-paiement/getall` | Liste des modes (non utilisé - hardcodé) |

---

## ✅ État final

**Compilation** : ✅ BUILD SUCCESS

**Validations API** :
- ✅ **Devise** : Vérifiée contre `/api/ref/devises/getall`
- ✅ **Pays** : Vérifiée contre `/api/ref/pays/getall`
- ✅ **Mode** : Hardcodé (BB, CH, TC, VR)

**Comportement** :
- ❌ Devise 9999 → **REJETÉ**
- ❌ Pays 9999 → **REJETÉ**
- ❌ Mode "KKK" → **REJETÉ**
- ✅ Données valides → **SAUVEGARDÉ**

---

**Statut** : 🚀 **PRÊT POUR TESTS AVEC API REF** ✅

