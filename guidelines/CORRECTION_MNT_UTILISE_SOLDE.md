# ✅ CORRECTION - MISE À JOUR MNT_UTILISE ET SOLDE

## 🔴 Problème identifié

Lors de la finalisation d'une opération FV (`finalize=true`), les champs **`mnt_utilise`** et **`solde`** dans la table `OPERATIONS_DELEGUEES` **n'étaient PAS mis à jour**.

### ❌ Comportement erroné (AVANT)

```java
// applyMvtToDossier() - VERSION INCORRECTE
OperationsDeleguee dossier = mapper.fromMvt(mvt);
dossier.setSolde(calculerSolde(..., dossier.getMntUtilise(), ...));  // ← Utilise l'ancien mntUtilise !
```

**Résultat** :
- ✅ `dernierNumMvtAva` était mis à jour
- ❌ `mntUtilise` restait inchangé
- ❌ `solde` était recalculé avec l'ANCIEN `mntUtilise` → **FAUX**

---

## ✅ Solution implémentée

### Logique métier FV correcte

Pour chaque opération FV validée :

```
mntUtilise (nouveau) = mntUtilise (ancien) + mntMvtAva (du MVT FV actuel)
solde (nouveau) = mntAutorise + mntAvance - mntUtilise (nouveau)
```

### Code corrigé

**Fichier** : `OperationsDelegueeServiceImpl.java`

```java
@Override
public void applyMvtToDossier(Integer numDossier) {
    // 1. Récupérer le MVT FV
    OperationsDelegueesMvt mvt = mvtRepository.findByNumDossier(numDossier)...;
    
    BigDecimal mntMvtAva = mvt.getMntMvtAva() != null ? mvt.getMntMvtAva() : BigDecimal.ZERO;
    
    // 2. Récupérer l'ancien mntUtilise du dossier
    BigDecimal ancienMntUtilise = BigDecimal.ZERO;
    Optional<OperationsDeleguee> existing = operationsDelegueeRepository.findById(numDossier);
    if (existing.isPresent()) {
        ancienMntUtilise = existing.get().getMntUtilise() != null ? 
            existing.get().getMntUtilise() : BigDecimal.ZERO;
    }
    
    // 3. ⚠️ IMPORTANT : Cumuler le montant utilisé
    BigDecimal nouveauMntUtilise = ancienMntUtilise.add(mntMvtAva);
    dossier.setMntUtilise(nouveauMntUtilise);
    
    log.info("Mise à jour mntUtilise pour dossier {}: ancien={}, mvtAva={}, nouveau={}",
            numDossier, ancienMntUtilise, mntMvtAva, nouveauMntUtilise);

    // 4. Recalculer le solde AVEC le nouveau mntUtilise
    dossier.setSolde(businessRulesService.calculerSolde(
            dossier.getMntAutorise(),
            dossier.getMntAvance(),
            dossier.getMntAutoriseBct(),
            nouveauMntUtilise,  // ← Utiliser le NOUVEAU montant
            dossier.getMntReserve(),
            dossier.getMntBlocage()
    ));
    
    // 5. Sauvegarder
    if (existingOpt.isPresent()) {
        OperationsDeleguee existing = existingOpt.get();
        // ...
        existing.setMntUtilise(nouveauMntUtilise);  // ← IMPORTANT
        existing.setSolde(dossier.getSolde());
        operationsDelegueeRepository.save(existing);
    }
}
```

---

## 📊 Exemple concret

### Données initiales (dossier 6110226)

| Champ | Valeur initiale |
|-------|----------------|
| `mnt_autorise` | 10 000 TND |
| `mnt_avance` | 0 TND |
| `mnt_utilise` | 1 600 TND |
| **`solde`** | **8 400 TND** |

### Opération FV : Voyage à 3 320 TND

**MVT créé** :
- `ref_operation` = 740910
- `mnt_mvt_ava` = **3 320 TND**
- `status` = I → V (après finalisation)

### ✅ Résultat APRÈS correction

| Champ | Calcul | Valeur finale |
|-------|--------|--------------|
| `mnt_utilise` | 1 600 + 3 320 | **4 920 TND** ✅ |
| `solde` | 10 000 + 0 - 4 920 | **5 080 TND** ✅ |
| `dernier_num_mvt_ava` | - | 1 ✅ |

---

## 🎯 Champs mis à jour dans OPERATIONS_DELEGUEES

| Champ | Type de mise à jour | Formule |
|-------|-------------------|---------|
| `dernier_num_mvt_ava` | Remplacement | Copié depuis le MVT |
| `mnt_utilise` | **Cumul** ⬆️ | `ancien + mntMvtAva` |
| `solde` | **Recalcul** ⬇️ | `autorisé + avance - utilisé` |
| `etat_dossier` | Remplacement | `V` |

---

## 🔍 Logs de débogage

Après correction, les logs afficheront :

```
INFO  OperationsDelegueeServiceImpl : Mise à jour mntUtilise pour dossier 6110226: 
      ancien=1600, mvtAva=3320, nouveau=4920
INFO  OperationsDelegueeServiceImpl : Solde recalculé : 5080 pour dossier 6110226
```

---

## ⚠️ Points critiques

### 1. Ordre des opérations

```java
// ✅ BON ORDRE
BigDecimal nouveauMntUtilise = ancienMntUtilise.add(mntMvtAva);
dossier.setMntUtilise(nouveauMntUtilise);  // ← D'abord mettre à jour mntUtilise
dossier.setSolde(calculer(..., nouveauMntUtilise, ...));  // ← Puis recalculer le solde

// ❌ MAUVAIS ORDRE
dossier.setSolde(calculer(..., dossier.getMntUtilise(), ...));  // ← Utilise l'ancien !
dossier.setMntUtilise(nouveauMntUtilise);  // ← Trop tard
```

### 2. Cumul vs Remplacement

- `mntUtilise` : **CUMUL** (addition)
- `solde` : **RECALCUL** (formule)
- `dernierNumMvtAva` : **REMPLACEMENT** (assignation)

### 3. Gestion des NULL

```java
BigDecimal ancienMntUtilise = existing.getMntUtilise() != null ? 
    existing.get().getMntUtilise() : BigDecimal.ZERO;
```

Toujours vérifier les valeurs nulles avant d'additionner.

---

## 🧪 Test de validation

### Requête de test

```http
POST http://localhost:8080/api/operations-fv?finalize=true
Content-Type: application/json

{
  "dossier": {
    "numeroDossier": 6110226
  },
  "mouvement": {
    "montant": 3320,
    "devise": 788,
    "beneficiaire": {
      "code": 1,
      "numero": "968574Y"
    },
    "mode": "BB",
    "pays": 788,
    "type": "FV"
  }
}
```

### Vérifications dans la BD

```sql
-- Avant
SELECT num_dossier, mnt_utilise, solde 
FROM operations_deleguees 
WHERE num_dossier = 6110226;
-- Résultat : mnt_utilise=1600, solde=8400

-- Après
SELECT num_dossier, mnt_utilise, solde 
FROM operations_deleguees 
WHERE num_dossier = 6110226;
-- Résultat attendu : mnt_utilise=4920, solde=5080 ✅
```

---

## ✅ Résumé de la correction

| Aspect | Avant (❌) | Après (✅) |
|--------|----------|----------|
| `mnt_utilise` | Non mis à jour | Cumulé correctement |
| `solde` | Recalculé avec ancien mntUtilise | Recalculé avec nouveau mntUtilise |
| Cohérence | **Incohérente** | **Cohérente** |
| Logs | Aucun | Affiche ancien/nouveau/mvtAva |

---

**Statut** : 🚀 **CORRIGÉ ET PRÊT POUR TESTS** ✅

**Impact** : Toutes les opérations FV finalisées mettront désormais à jour correctement `mnt_utilise` et `solde` dans `operations_deleguees`.

