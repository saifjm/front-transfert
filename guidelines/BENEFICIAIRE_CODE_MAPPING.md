# 🔍 Mapping Code Bénéficiaire : JSON ↔ Base de Données

## ⚠️ Problème identifié

La validation du bénéficiaire **ignorait le type de pièce** (`code`) et validait uniquement sur `numDossier` + `numero`.

### Avant (❌ INCORRECT)
```java
// Validait UNIQUEMENT numDossier + numero
boolean exists = beneficiaireRepository.existsByNumDossierAndNoPiece(
    numDossier,
    benefDTO.getNumero()
);
```

**Conséquence** : Même avec un `code` différent, la validation passait si le `numero` correspondait.

---

## ✅ Solution implémentée

### Nouveau mapping

| JSON (`BeneficiaireFVDTO`) | Base de données (`BENEFICIAIRE`) | Type |
|----------------------------|----------------------------------|------|
| `code` | `TYPE_PIECE_BENEF` | Integer → Boolean |
| `numero` | `NO_PIECE_BENEF` | String |

### Conversion code → typePieceBenef

```java
// Règle de conversion
code = 0  →  typePieceBenef = false
code ≠ 0  →  typePieceBenef = true
```

### Requête JPQL corrigée

```java
@Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Beneficiaire b " +
       "WHERE b.id.numDossier = :numDossier " +
       "AND b.id.typePieceBenef = CASE WHEN :code = 0 THEN false ELSE true END " +
       "AND b.id.noPieceBenef = :noPiece")
boolean existsByNumDossierCodeAndNoPiece(
    @Param("numDossier") Integer numDossier,
    @Param("code") Integer code,
    @Param("noPiece") String noPiece
);
```

### Service mis à jour

```java
// Maintenant vérifie les 3 critères : numDossier + code + numero
boolean exists = beneficiaireRepository.existsByNumDossierCodeAndNoPiece(
    numDossier,
    benefDTO.getCode(),      // ✅ Ajouté !
    benefDTO.getNumero()
);
```

---

## 📊 Exemple de validation

### Cas 1 : Bénéficiaire existant ✅

**JSON envoyé :**
```json
{
  "beneficiaire": {
    "code": 1,
    "numero": "1234567H"
  }
}
```

**Base de données (`BENEFICIAIRE`) :**
| NUM_DOSSIER | TYPE_PIECE_BENEF | NO_PIECE_BENEF |
|-------------|------------------|----------------|
| 6110226 | true | 1234567H |

**Conversion :** `code=1` → `true` ✅ **MATCH !**

**Résultat :** Validation réussie ✅

---

### Cas 2 : Code différent ❌

**JSON envoyé :**
```json
{
  "beneficiaire": {
    "code": 0,
    "numero": "1234567H"
  }
}
```

**Base de données (`BENEFICIAIRE`) :**
| NUM_DOSSIER | TYPE_PIECE_BENEF | NO_PIECE_BENEF |
|-------------|------------------|----------------|
| 6110226 | true | 1234567H |

**Conversion :** `code=0` → `false` ❌ **NO MATCH !**

**Résultat :** 
```json
{
  "code": "BENEFICIAIRE_INEXISTANT",
  "message": "Le bénéficiaire (code=0, numero=1234567H) n'existe pas pour le dossier 6110226"
}
```

---

### Cas 3 : Numéro différent ❌

**JSON envoyé :**
```json
{
  "beneficiaire": {
    "code": 1,
    "numero": "9999999Z"
  }
}
```

**Base de données (`BENEFICIAIRE`) :**
| NUM_DOSSIER | TYPE_PIECE_BENEF | NO_PIECE_BENEF |
|-------------|------------------|----------------|
| 6110226 | true | 1234567H |

**Résultat :** 
```json
{
  "code": "BENEFICIAIRE_INEXISTANT",
  "message": "Le bénéficiaire (code=1, numero=9999999Z) n'existe pas pour le dossier 6110226"
}
```

---

## 🎯 Validation complète

La validation vérifie maintenant **3 critères obligatoires** :

1. ✅ **`numDossier`** - Le dossier doit correspondre
2. ✅ **`code` (→ typePieceBenef)** - Le type de pièce doit correspondre
3. ✅ **`numero` (→ noPieceBenef)** - Le numéro de pièce doit correspondre

**Tous les 3 doivent correspondre** pour que la validation passe !

---

## 📝 Note sur le type Boolean

Le champ `TYPE_PIECE_BENEF` est de type **Boolean** dans la base Oracle/JPA :
- **`false`** (0 en Oracle) = Type de pièce 0
- **`true`** (1 en Oracle) = Type de pièce non-0

Si vous avez besoin d'un mapping plus précis (ex: CIN=1, Passeport=2, etc.), il faudrait :
1. Changer le type de `typePieceBenef` de **Boolean** à **Integer** dans l'entité
2. Adapter la requête JPQL

---

## 🚀 Test

### Avant le correctif
```bash
# Code=1, mais bénéficiaire avec code=0 en base
curl -X POST "http://localhost:8080/api/operations-fv?finalize=true" \
  -H "Content-Type: application/json" \
  -d '{"beneficiaire": {"code": 1, "numero": "1234567H"}}'
  
# ❌ PASSAIT (ignorait le code)
```

### Après le correctif
```bash
# Même requête
curl -X POST "http://localhost:8080/api/operations-fv?finalize=true" \
  -H "Content-Type: application/json" \
  -d '{"beneficiaire": {"code": 1, "numero": "1234567H"}}'
  
# ✅ ÉCHOUE si code ne correspond pas
# ✅ PASSE si code + numero correspondent tous les deux
```

---

## 📚 Fichiers modifiés

1. **`BeneficiaireRepository.java`**
   - ✅ Ajout de `existsByNumDossierCodeAndNoPiece()`
   - ✅ Conversion `code` (Integer) → `typePieceBenef` (Boolean)

2. **`OperationFVServiceImpl.java`**
   - ✅ Mise à jour de `validateBeneficiaire()` pour utiliser la nouvelle méthode
   - ✅ Inclut maintenant le `code` dans la validation

---

## ✅ Résultat

Maintenant la validation est **STRICTE** et vérifie bien le **code + numero**, pas seulement le numero !

