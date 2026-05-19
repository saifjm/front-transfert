# ⚡ Référence rapide - Frais de Voyage

## 📌 Fichier modifié

```
/components/AVAFraisVoyage.tsx
```

---

## 🔑 Changements clés

### 1. Mode de paiement
```diff
- mode: 'BBA'
+ mode: 'BB'
```

### 2. Format JSON API
```javascript
// ✅ Format correct
{
  "dossier": {
    "numeroDossier": 5340226,        // Number, sans "AVA-"
    "dateDossier": "15/02/2026",     // Format français
    "typeDossier": 1                 // Number
  },
  "mouvement": {
    "devise": 840,
    "montantDvs": 350,
    "beneficiaire": {
      "code": 1,                     // Number, pas String
      "numero": "1695881M"
    },
    "mode": "BB",                    // "BB" pas "BBA"
    "pays": 250,
    "type": "FV",
    "montant": 1050,
    "dateDepart": "20/02/2026",
    "dateRetour": "28/02/2026"
  },
  "documentsScannes": [
    {
      "ligne": 1,                    // Commence à 1, pas 0
      "nomImage": "doc.jpg",
      "cheminFichier": "/path/doc.jpg",
      "typeDocument": 1
    }
  ]
}
```

### 3. Gestion erreurs
```typescript
if (result.valide) {
  setShowSuccessDialog(true);
} else {
  toast.error(result.message, {
    description: `${result.nombreErreurs} erreur(s) :\n• ${result.erreurs.join('\n• ')}`,
    duration: 10000
  });
}
```

---

## 🗺️ Mapping données

```javascript
// Agences
17  → "Agence Tunis Centre"
104 → "Agence Sfax"

// Types dossier
1 → "EXPORTATEUR"
3 → "AUTRES ACTIVITES (ANNEXE N.2)"

// Noms null
null → "N/A"
```

---

## ✅ Checklist validation

- [x] `mode` = "BB"
- [x] `numeroDossier` = Number
- [x] `beneficiaire.code` = Number
- [x] `documentsScannes[].ligne` ≥ 1
- [x] Pas de champs extra (agence, montants, etc.)
- [x] Toast erreur avec détails
- [x] Mapping agences 17 et 104

---

## 🧪 Test rapide

```bash
1. Sélectionner dossier AVA-5340226
2. Remplir formulaire (mode = BB)
3. Soumettre
4. Vérifier payload dans Network tab
5. Confirmer tous les points ci-dessus ✅
```

---

## 📚 Documentation complète

Voir : `/README_FRAIS_VOYAGE.md`

---

**Date** : 16 février 2026 | **Statut** : ✅ Validé
