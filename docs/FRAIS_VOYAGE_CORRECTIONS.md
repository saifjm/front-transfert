# 🎯 Corrections Frais de Voyage - IBANSYS

## 📋 Résumé des corrections

Correction du module "Frais de Voyage" pour l'intégration avec l'API `/api/business-rules-fv/valider` selon les spécifications.

---

## ✅ Fichiers TSX modifiés

### **1. `/components/AVAFraisVoyage.tsx`**

#### **Changement 1 : Mode de paiement par défaut**
- **Ancien** : `mode: 'BBA'` (BILLETS DE BANQUE)
- **Nouveau** : `mode: 'BB'` (BILLETS DE BANQUE)
- **Lignes modifiées** : 
  - Ligne 166 : État initial du mouvement
  - Ligne 560 : Initialisation lors de la sélection d'un dossier
  - Ligne 577 : Réinitialisation lors du retour à la recherche
  - Ligne 1177 : Option du menu déroulant

#### **Changement 2 : Format JSON envoyé à l'API**
- **Structure simplifiée** conforme aux spécifications :

```json
{
  "dossier": {
    "numeroDossier": 22360542,  // Number (sans préfixe "AVA-")
    "dateDossier": "02/01/2026",  // Format français dd/MM/yyyy
    "typeDossier": 3  // Number
  },
  "mouvement": {
    "devise": 840,
    "montantDvs": 350,
    "beneficiaire": {
      "code": 1,  // Number (pas string)
      "numero": "2357804R"
    },
    "mode": "BB",
    "pays": 250,
    "type": "FV",
    "montant": 223,
    "dateDepart": "01/02/2026",
    "dateRetour": "15/02/2026"
  },
  "documentsScannes": [
    {
      "ligne": 1,  // Index + 1 (commence à 1)
      "nomImage": "DOC_2026001_003.jpg",
      "cheminFichier": "/documents/2026/01/passport_scan.pdf",
      "typeDocument": 1
    }
  ]
}
```

**Champs supprimés** :
- ❌ `codeTypeDosAva` au niveau racine
- ❌ `dossier.agence`
- ❌ `dossier.echeance`
- ❌ `dossier.pieceClient`
- ❌ `dossier.compteRib`
- ❌ `dossier.nomClientBanque`
- ❌ `dossier.nomClientPassager`
- ❌ Section `montants`

**Champs corrigés** :
- ✅ `dossier.numeroDossier` : Converti en `Number` (suppression du préfixe "AVA-")
- ✅ `mouvement.beneficiaire.code` : Converti en `Number` (au lieu de `String`)
- ✅ `documentsScannes[].ligne` : Commence à 1 (index + 1)

#### **Changement 3 : Gestion des erreurs de validation**

**Format de réponse d'erreur de l'API** :
```json
{
  "nombreErreurs": 7,
  "erreurs": [
    "NUMERO_DOSSIER_NUMERIQUE : Le numéro de dossier doit être uniquement numérique",
    "COMPTE_RIB_OBLIGATOIRE : Le compte RIB est obligatoire",
    "NET_AUTORISE_OBLIGATOIRE : Le net autorisé est obligatoire",
    "NUMERO_MOUVEMENT_OBLIGATOIRE : Le numéro de mouvement est obligatoire",
    "BENEFICIAIRE_INVALIDE : Impossible d'utiliser le numéro de dossier",
    "MODE_INVALIDE : Le code mode paiement 'VIR' n'existe pas",
    "DOCUMENT[1] : LIGNE_INVALIDE : Le numéro de ligne doit être positif"
  ],
  "valide": false,
  "message": "L'opération FV contient des erreurs"
}
```

**Affichage amélioré** :
- ✅ Affichage du nombre d'erreurs (`nombreErreurs`)
- ✅ Affichage du message global (`message`)
- ✅ Liste détaillée des erreurs (`erreurs[]`) avec puces
- ✅ Toast avec durée de 10 secondes pour lire les erreurs
- ✅ Console warning pour le débogage

**Code de gestion des erreurs** :
```typescript
if (result.valide) {
  setShowSuccessDialog(true);
} else {
  console.warn('⚠️ API business-rules-fv/valider - Validation échouée:', result.erreurs);
  
  const messageErreur = result.message || 'Validation échouée';
  const listeErreurs = result.erreurs?.join('\n• ') || 'Erreurs de validation';
  
  toast.error(messageErreur, {
    description: `${result.nombreErreurs} erreur(s) détectée(s) :\n• ${listeErreurs}`,
    duration: 10000
  });
}
```

---

## 📊 Mapping API - Dossiers valides

### **API** : `/api/operations-deleguees/dossiers-valides-avec-nom`

**Format retourné** :
```json
[
  {
    "codeAgence": 17,
    "dateDossier": "2026-02-15",
    "noPieceClient": "1695881M",
    "nomClient": null,
    "numDossier": 5340226,
    "typeDossierAva": 1
  }
]
```

**Mapping des codes agences** :
```typescript
const agenceLabels = {
  17: 'Agence Tunis Centre',
  104: 'Agence Sfax',
  100: 'Agence Tunis Centre',
  200: 'Agence Sfax',
  300: 'Agence Sousse',
  400: 'Agence Monastir'
};
```

**Mapping des types de dossier** :
```typescript
const typeDossierLabels = {
  1: 'EXPORTATEUR',
  2: 'MARCHE REALISABLE A L\'ETRANGER',
  3: 'AUTRES ACTIVITES (ANNEXE N.2)',
  4: 'AUTRES ACTIVITES (BANQUES)',
  5: 'A. ACT. (PROM.-NOUV. PROJ.)'
};
```

**Transformation** :
- ✅ `numDossier` → `numeroDossier: "AVA-5340226"`
- ✅ `codeAgence: 17` → `libelleAgence: "Agence Tunis Centre"`
- ✅ `typeDossierAva: 1` → `libelleTypeDossier: "1 - EXPORTATEUR"`
- ✅ `nomClient: null` → `nomClient: "N/A"`, `prenomClient: ""`

---

## 🧪 Tests de validation

### **Test 1 : Soumission valide**
```bash
✅ Mode : BB
✅ Numéro de dossier : Number (sans "AVA-")
✅ beneficiaire.code : Number
✅ documentsScannes[].ligne : Commence à 1
✅ JSON conforme aux spécifications
```

### **Test 2 : Gestion des erreurs**
```bash
✅ Affichage du toast avec message d'erreur
✅ Liste des erreurs avec puces (•)
✅ Durée d'affichage : 10 secondes
✅ Console warning pour le débogage
```

### **Test 3 : Affichage des dossiers**
```bash
✅ Agence 17 → "Agence Tunis Centre"
✅ Agence 104 → "Agence Sfax"
✅ Type 1 → "1 - EXPORTATEUR"
✅ nomClient: null → "N/A"
✅ Numéro formaté : "AVA-5340226"
```

---

## 📝 Détails techniques

### **Fonction handleSubmit (lignes 664-757)**

**Conversion du numéro de dossier** :
```typescript
const numDossier = parseInt(dossierSelectionne.numeroDossier.replace('AVA-', ''), 10);
// "AVA-5340226" → 5340226
```

**Conversion du code bénéficiaire** :
```typescript
beneficiaire: {
  code: Number(mouvement.beneficiaire?.code || 1),  // String → Number
  numero: mouvement.beneficiaire?.numero || ''
}
```

**Numérotation des documents** :
```typescript
documentsScannes: documents.map((doc, index) => ({
  ligne: index + 1,  // Commence à 1, pas 0
  nomImage: doc.nomImage || '',
  cheminFichier: doc.cheminFichier || '',
  typeDocument: doc.typeDocument || 0
}))
```

---

## ✅ Statut final

| Item | Statut | Description |
|------|--------|-------------|
| Mode de paiement | ✅ Corrigé | `BBA` → `BB` |
| Format JSON | ✅ Corrigé | Structure simplifiée conforme API |
| Gestion erreurs | ✅ Corrigé | Affichage détaillé avec toast |
| Mapping dossiers | ✅ Corrigé | Agences et types correctement mappés |
| Type de données | ✅ Corrigé | `beneficiaire.code` et `numeroDossier` en Number |
| Documents | ✅ Corrigé | Ligne commence à 1 |

---

## 📦 Fichiers modifiés (récapitulatif)

1. ✅ **`/components/AVAFraisVoyage.tsx`** - Module Frais de Voyage complet

---

**Date de mise à jour** : 16 février 2026  
**Version** : 1.0  
**Statut** : ✅ Terminé
