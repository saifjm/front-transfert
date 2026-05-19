# 📚 Modules AVA - Liste Complète des Composants

## Date : 14 Février 2026

---

## ✅ Composants Créés (10 au total)

### 1. **AVAForm** ✓
- Module : Ouverture de dossier AVA
- Fichier : `/components/AVAForm.tsx`
- Statut : **Complété**

### 2. **AVAMiseAJourBeneficiaires** ✓
- Module : Mise à jour des bénéficiaires
- Fichier : `/components/AVAMiseAJourBeneficiaires.tsx`
- Statut : **Complété**
- Architecture : 2 étapes (Recherche → Mise à jour)

### 3. **AlimentationDossierExportateur** ✓
- Module : Alimentation dossier exportateur
- Fichier : `/components/AlimentationDossierExportateur.tsx`
- Statut : **Complété**
- Architecture : 2 étapes (Recherche → Alimentation)

### 4. **AVAFraisVoyage** ✓
- Module : Frais de voyage
- Fichier : `/components/AVAFraisVoyage.tsx`
- Statut : **Complété**
- Architecture : 2 étapes (Recherche → Frais)
- Champs spécifiques :
  - Type de frais (Billet avion, Hébergement, Transport, Repas, Autres)
  - Montant
  - Destination
  - Date départ / Date retour
  - Justificatif
  - Observations

### 5. **AVARetrocession** ✓
- Module : Rétrocession
- Fichier : `/components/AVARetrocession.tsx`
- Statut : **Complété**
- Architecture : 2 étapes (Recherche → Rétrocession)
- Champs spécifiques :
  - Montant (≤ Montant utilisé)
  - Bénéficiaire
  - Motif
  - Date opération
  - Référence
  - Observations

### 6. **AVAReservation** ✓
- Module : Réservation
- Fichier : `/components/AVAReservation.tsx`
- Statut : **Complété**
- Architecture : 2 étapes (Recherche → Réservation)
- Champs spécifiques :
  - Montant à réserver (≤ Solde disponible)
  - Motif de réservation
  - Date début / Date fin
  - Référence
  - Observations

### 7. **AVASuspension** 🔄
- Module : Suspension de dossier
- Fichier : `/components/AVASuspension.tsx`
- Statut : **À créer**
- Architecture : 2 étapes (Recherche → Suspension)
- Champs spécifiques :
  - Motif de suspension
  - Date début suspension
  - Date fin prévue (optionnel)
  - Référence décision
  - Observations

### 8. **AVALeveeSuspension** 🔄
- Module : Levée de suspension
- Fichier : `/components/AVALeveeSuspension.tsx`
- Statut : **À créer**
- Architecture : 2 étapes (Recherche → Levée)
- Filtres : Seuls les dossiers SUSPENDUS
- Champs spécifiques :
  - Date levée
  - Référence décision
  - Observations

### 9. **AVAAlimentationAccordBCT** 🔄
- Module : Alimentation suite accord BCT
- Fichier : `/components/AVAAlimentationAccordBCT.tsx`
- Statut : **À créer**
- Architecture : 2 étapes (Recherche → Alimentation BCT)
- Champs spécifiques :
  - Numéro accord BCT
  - Date accord BCT
  - Montant accordé BCT
  - Montant alimentation
  - Date opération
  - Référence
  - Observations

### 10. **AVAClotureDossier** 🔄
- Module : Clôture de dossier
- Fichier : `/components/AVAClotureDossier.tsx`
- Statut : **À créer**
- Architecture : 2 étapes (Recherche → Clôture)
- Filtres : Seuls les dossiers ACTIF avec solde = 0
- Champs spécifiques :
  - Motif clôture
  - Date clôture
  - Type clôture (Normale, Anticipée)
  - Référence
  - Observations
  - ⚠️ Confirmation obligatoire (action irréversible)

---

## 🏗️ Architecture Commune (Tous les modules)

### ÉTAPE 1 : Recherche
```
┌─────────────────────────────────────────────┐
│ Titre du Module                             │
│ Description                                 │
├─────────────────────────────────────────────┤
│ Card "Rechercher un dossier"                │
│ - 4 filtres en grille                       │
│   • Numéro dossier                          │
│   • Type dossier                            │
│   • Client                                  │
│   • Agence                                  │
│ - Bouton "Réinitialiser"                    │
├─────────────────────────────────────────────┤
│ Card "Dossiers valides (X)"                 │
│ - Tableau 8 colonnes                        │
│ - Bouton "Sélectionner" par ligne           │
└─────────────────────────────────────────────┘
```

### ÉTAPE 2 : Formulaire
```
┌─────────────────────────────────────────────┐
│ Bouton "← Retour à la recherche"            │
├─────────────────────────────────────────────┤
│ Card Informations Dossier (en-tête bleu)    │
│ - Grille 4 colonnes                         │
│   • Agence                                  │
│   • Type Dossier                            │
│   • Client                                  │
│   • Date Dossier                            │
├─────────────────────────────────────────────┤
│ Card "Montants de Référence"                │
│ - Grille 3 colonnes                         │
│   • Montant Autorisé (bleu)                 │
│   • Montant Utilisé (orange)                │
│   • Solde Disponible (vert)                 │
├─────────────────────────────────────────────┤
│ Card "Formulaire [Module]"                  │
│ - Champs spécifiques au module              │
│ - Boutons :                                 │
│   • Annuler                                 │
│   • Enregistrer                             │
└─────────────────────────────────────────────┘
```

---

## 🎨 Cohérence Visuelle

### Couleurs IBANSYS
| Élément | Couleur | Usage |
|---------|---------|-------|
| En-tête Card Dossier | `bg-[#435B7B]` | Fond bleu navy |
| Texte En-tête | `text-white` | Texte blanc sur fond bleu |
| Description En-tête | `text-blue-100` | Texte bleu clair |
| Bouton Principal | `bg-[#435B7B] hover:bg-[#2D3E54]` | Boutons d'action |
| Montant Autorisé | `text-blue-600` | Chiffre bleu |
| Montant Utilisé | `text-orange-600` | Chiffre orange |
| Solde Disponible | `text-green-600` | Chiffre vert |

### Layout
- Container : `p-6 max-w-7xl mx-auto space-y-6`
- Cards : `<Card>` avec `<CardHeader>` et `<CardContent>`
- Grilles : `grid grid-cols-2 gap-4` ou `grid grid-cols-4 gap-4`

### Icônes Lucide React
| Module | Icône | Nom |
|--------|-------|-----|
| Alimentation | `<TrendingUp>` | Tendance haut |
| Frais Voyage | `<Plane>` | Avion |
| Rétrocession | `<ArrowLeftRight>` | Flèches gauche-droite |
| Réservation | `<Lock>` | Cadenas |
| Suspension | `<Ban>` | Interdiction |
| Levée Suspension | `<CheckCircle>` | Cercle validé |
| Alimentation BCT | `<FileCheck>` | Fichier validé |
| Clôture | `<XCircle>` | Cercle X |

---

## 📋 Intégration dans Sidebar

### Ajout dans `/components/Sidebar.tsx`

Les modules doivent être ajoutés dans la section "Dossier AVA" :

```typescript
<li>
  <button
    onClick={() => setIsDossierAvaOpen(!isDossierAvaOpen)}
    className="w-full flex items-center justify-between px-3 py-2"
  >
    <span className="flex items-center gap-2">
      <Plane className="w-5 h-5" />
      Dossier AVA
    </span>
    {isDossierAvaOpen ? <ChevronDown /> : <ChevronRight />}
  </button>
  {isDossierAvaOpen && (
    <ul className="ml-6 mt-2 space-y-1">
      <li>
        <button onClick={() => onSectionChange('ava-ouverture')}>
          Ouverture dossier AVA
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-beneficiaires')}>
          Mise à jour bénéficiaires
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-alimentation')}>
          Alimentation dossier Exportateur
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-frais-voyage')}>
          Frais de voyage
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-retrocession')}>
          Rétrocession
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-reservation')}>
          Réservation
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-suspension')}>
          Suspension
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-levee-suspension')}>
          Levée de suspension
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-alimentation-bct')}>
          Alimentation suite accord BCT
        </button>
      </li>
      <li>
        <button onClick={() => onSectionChange('ava-cloture')}>
          Clôture dossier
        </button>
      </li>
    </ul>
  )}
</li>
```

### Ajout dans `/App.tsx`

```typescript
import { AVAFraisVoyage } from './components/AVAFraisVoyage';
import { AVARetrocession } from './components/AVARetrocession';
import { AVAReservation } from './components/AVAReservation';
// + 4 autres imports

const renderContent = () => {
  switch (activeSection) {
    // ... existing cases
    case 'ava-frais-voyage':
      return <AVAFraisVoyage />;
    case 'ava-retrocession':
      return <AVARetrocession />;
    case 'ava-reservation':
      return <AVAReservation />;
    // + 4 autres cases
  }
};
```

---

## 🧪 Tests Standard (Pour tous les modules)

### Test 1 : Navigation
1. Ouvrir le module
2. ✅ Étape = 'recherche'
3. Sélectionner un dossier
4. ✅ Étape = formulaire
5. Cliquer "Retour"
6. ✅ Étape = 'recherche'

### Test 2 : Filtres
1. Saisir un numéro de dossier
2. ✅ Liste filtrée
3. Réinitialiser
4. ✅ Tous les dossiers affichés

### Test 3 : Validation
1. Sélectionner un dossier
2. Soumettre formulaire vide
3. ✅ Erreurs affichées
4. Remplir les champs
5. ✅ Soumission réussie

### Test 4 : Toast
1. Soumettre un formulaire valide
2. ✅ Toast de succès
3. ✅ Retour automatique à la recherche

---

## 📊 Résumé

| Statut | Nombre | Modules |
|--------|--------|---------|
| ✅ Complété | 6 | Ouverture, Bénéficiaires, Alimentation, Frais, Rétrocession, Réservation |
| 🔄 À créer | 4 | Suspension, Levée Suspension, Alimentation BCT, Clôture |
| **Total** | **10** | **Tous les modules AVA** |

---

## 🎯 Prochaines Étapes

1. ✅ Créer **AVASuspension**
2. ✅ Créer **AVALeveeSuspension**
3. ✅ Créer **AVAAlimentationAccordBCT**
4. ✅ Créer **AVAClotureDossier**
5. ✅ Mettre à jour **Sidebar.tsx**
6. ✅ Mettre à jour **App.tsx**
7. ✅ Tester tous les modules
8. ✅ Documentation finale

---

*Document généré le 14 février 2026 - IBANSYS v1.0*
*Modules AVA - Liste Complète*
*Société le Monde Informatique*
