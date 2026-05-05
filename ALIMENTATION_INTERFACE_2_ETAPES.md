# 🔄 Alimentation Dossier Exportateur - Interface 2 Étapes

## Date : 14 Février 2026

---

## 🎯 Architecture en 2 Étapes

Le composant utilise maintenant une architecture identique à "Mise à jour Bénéficiaires" avec **2 étapes distinctes** :

### **ÉTAPE 1 : Recherche** (`recherche`)
- Liste des dossiers valides
- Filtres de recherche
- Sélection d'un dossier

### **ÉTAPE 2 : Alimentation** (`alimentation`)
- Informations du dossier sélectionné
- Montants de référence
- Formulaire d'alimentation

---

## 📋 ÉTAPE 1 : Interface de Recherche

### Vue d'ensemble

```
╔═══════════════════════════════════════════════════════════════════════════╗
║ Alimentation Dossier Exportateur                                         ║
║ Rechercher et sélectionner un dossier exportateur pour l'alimenter       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║ ┌─────────────────────────────────────────────────────────────────────┐ ║
║ │ Rechercher un dossier                                                │ ║
║ │ Utilisez les filtres ci-dessous pour rechercher un dossier          │ ║
║ ├─────────────────────────────────────────────────────────────────────┤ ║
║ │                                                                      │ ║
║ │ Numéro dossier  │ Type dossier   │ Client         │ Agence         │ ║
║ │ [EXP-2026-...]  │ [Tous types ▼] │ [Nom/N°pièce] │ [Toutes ▼]    │ ║
║ │                                                                      │ ║
║ │                                      [Réinitialiser les filtres]    │ ║
║ └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║ ┌─────────────────────────────────────────────────────────────────────┐ ║
║ │ Dossiers valides (7)                                                 │ ║
║ │ Sélectionnez un dossier pour l'alimenter                            │ ║
║ ├─────────────────────────────────────────────────────────────────────┤ ║
║ │                                                                      │ ║
║ │ Code │ Agence      │ Type         │ N° Dossier  │ Date  │ Client  │ ║
║ │ Agce │             │ Dossier      │             │       │         │ ║
║ │──────┼─────────────┼──────────────┼─────────────┼───────┼─────────│ ║
║ │ 001  │ Tunis Centre│ 1-AVA Import │ EXP-2026-001│15/01  │ TUNISIA │ ║
║ │                                              [Sélectionner]         │ ║
║ │ 002  │ Sousse      │ 2-AVA Export │ EXP-2026-002│20/01  │ EXPORT  │ ║
║ │                                              [Sélectionner]         │ ║
║ └─────────────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Composants de l'Interface

#### 1. **En-tête**
```
Alimentation Dossier Exportateur
Rechercher et sélectionner un dossier exportateur pour l'alimenter
```

#### 2. **Card Recherche**
- **Titre** : "Rechercher un dossier"
- **Description** : "Utilisez les filtres ci-dessous pour rechercher un dossier exportateur"
- **4 filtres en grille** :
  1. Numéro de dossier (Input)
  2. Type de dossier (Select)
  3. Client (Input)
  4. Agence (Select)
- **Bouton** : "Réinitialiser les filtres" (en bas à droite)

#### 3. **Card Liste Dossiers**
- **Titre** : "Dossiers valides (X)" avec compteur
- **Description** : "Sélectionnez un dossier pour l'alimenter"
- **Tableau avec 8 colonnes** :
  1. Code Agence (Badge outline)
  2. Agence
  3. Type Dossier (Badge secondary)
  4. Numéro Dossier (gras)
  5. Date Dossier
  6. N° Pièce Client
  7. Client
  8. Action (Bouton "Sélectionner")

---

## 📝 ÉTAPE 2 : Interface d'Alimentation

### Vue d'ensemble

```
╔═══════════════════════════════════════════════════════════════════════════╗
║ [← Retour à la recherche]                                                 ║
║                                                                           ║
║ ┌─────────────────────────────────────────────────────────────────────┐ ║
║ │ 📈 Alimentation du Dossier EXP-2026-001                (Fond bleu)  │ ║
║ │ Dossier sélectionné pour alimentation                               │ ║
║ ├─────────────────────────────────────────────────────────────────────┤ ║
║ │                                                                      │ ║
║ │ 🏢 Agence        │ 📄 Type Dossier │ 👤 Client       │ 📅 Date      │ ║
║ │ Tunis Centre     │ AVA Import      │ TUNISIA EXPORT  │ 15/01/2026   │ ║
║ │ 001              │ Type 1          │ 1234567A        │              │ ║
║ └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║ ┌─────────────────────────────────────────────────────────────────────┐ ║
║ │ Montants de Référence                                                │ ║
║ │ Informations financières du dossier                                 │ ║
║ ├─────────────────────────────────────────────────────────────────────┤ ║
║ │                                                                      │ ║
║ │ 💰 Montant Autorisé    │ 📊 Montant Utilisé    │ ✓ Solde Disponible│ ║
║ │ 500,000 EUR (bleu)     │ 150,000 EUR (orange)  │ 350,000 EUR (vert)│ ║
║ │                                                                      │ ║
║ └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║ ┌─────────────────────────────────────────────────────────────────────┐ ║
║ │ Formulaire d'Alimentation                                            │ ║
║ │ Renseignez les informations de l'opération d'alimentation          │ ║
║ ├─────────────────────────────────────────────────────────────────────┤ ║
║ │                                                                      │ ║
║ │ Type d'Opération *          │ Montant *                             │ ║
║ │ [Augmentation ▼]            │ [________] EUR                        │ ║
║ │                                                                      │ ║
║ │ Date Opération *            │ Référence *                           │ ║
║ │ [14/02/2026]                │ [________]                            │ ║
║ │                                                                      │ ║
║ │ Observations                                                         │ ║
║ │ [_______________________________________________________]            │ ║
║ │                                                                      │ ║
║ │                                      [Annuler] [💾 Enregistrer]     │ ║
║ └─────────────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Composants de l'Interface

#### 1. **Bouton Retour**
```tsx
<Button variant="outline" onClick={handleRetourRecherche}>
  <ArrowLeft className="w-4 h-4 mr-2" />
  Retour à la recherche
</Button>
```

#### 2. **Card Informations Dossier**
- **En-tête bleu** avec fond `bg-[#435B7B]`
- **Titre** : "📈 Alimentation du Dossier {numeroDossier}"
- **Grille 4 colonnes** :
  1. **Agence** : Libellé + Code
  2. **Type Dossier** : Libellé + Type
  3. **Client** : Nom + N° pièce
  4. **Date Dossier** : Date formatée

#### 3. **Card Montants de Référence**
- **Titre** : "Montants de Référence"
- **Description** : "Informations financières du dossier"
- **Grille 3 colonnes avec icônes et couleurs** :
  1. **Montant Autorisé** (💰 bleu) : Gros chiffre en bleu
  2. **Montant Utilisé** (📊 orange) : Gros chiffre en orange
  3. **Solde Disponible** (✓ vert) : Gros chiffre en vert

#### 4. **Card Formulaire**
- **Titre** : "Formulaire d'Alimentation"
- **5 champs** :
  1. Type d'Opération (Select) *
  2. Montant (Input number) *
  3. Date Opération (Input date) *
  4. Référence (Input text) *
  5. Observations (Input text)
- **2 boutons** :
  - Annuler (outline)
  - Enregistrer (bleu avec icône Save)

---

## 🔄 Flux de Navigation

### Navigation Complète

```
┌─────────────────┐
│  ÉTAPE 1        │
│  Recherche      │
│                 │
│  [Liste]        │
│  [Filtres]      │
└────────┬────────┘
         │
         │ Clic [Sélectionner]
         ▼
┌─────────────────┐
│  ÉTAPE 2        │
│  Alimentation   │
│                 │
│  [Infos]        │
│  [Montants]     │
│  [Formulaire]   │
└────────┬────────┘
         │
         │ Clic [← Retour] ou [Annuler]
         ▼
┌─────────────────┐
│  ÉTAPE 1        │
│  Recherche      │
└─────────────────┘
         │
         │ Clic [Enregistrer]
         ▼
      (Success)
         │
         ▼
┌─────────────────┐
│  ÉTAPE 1        │
│  Recherche      │
│  (Rechargement) │
└─────────────────┘
```

### Actions Utilisateur

| Action | Depuis | Vers | Effet |
|--------|--------|------|-------|
| Sélectionner | Recherche | Alimentation | Charge le dossier sélectionné |
| Retour à la recherche | Alimentation | Recherche | Réinitialise le formulaire |
| Annuler | Alimentation | Recherche | Réinitialise le formulaire |
| Enregistrer | Alimentation | Recherche | Enregistre + recharge |

---

## 🎨 Styles et Couleurs

### Palette de Couleurs

| Élément | Couleur | Usage |
|---------|---------|-------|
| En-tête Card Dossier | `bg-[#435B7B]` | Fond bleu navy |
| Bouton Principal | `bg-[#435B7B] hover:bg-[#2D3E54]` | Boutons d'action |
| Montant Autorisé | `text-blue-600` | Chiffre principal |
| Montant Utilisé | `text-orange-600` | Chiffre utilisé |
| Solde Disponible | `text-green-600` | Chiffre disponible |
| Badge Outline | `variant="outline"` | Code agence |
| Badge Secondary | `variant="secondary"` | Type dossier |

### Icônes

| Icône | Contexte | Taille |
|-------|----------|--------|
| `<ArrowLeft>` | Bouton retour | `w-4 h-4` |
| `<TrendingUp>` | Titre alimentation | `w-5 h-5` |
| `<Building>` | Agence | `w-4 h-4` |
| `<FileText>` | Type dossier | `w-4 h-4` |
| `<User>` | Client | `w-4 h-4` |
| `<Calendar>` | Date | `w-4 h-4` |
| `<DollarSign>` | Montants | `w-5 h-5` |
| `<Save>` | Enregistrer | `w-4 h-4` |

---

## 💡 États de l'Application

### État Principal : `etape`

```typescript
const [etape, setEtape] = useState<'recherche' | 'alimentation'>('recherche');
```

**Valeurs possibles :**
- `'recherche'` : Affiche l'interface de recherche
- `'alimentation'` : Affiche l'interface d'alimentation

### États Secondaires

```typescript
const [dossierSelectionne, setDossierSelectionne] = useState<DossierExportateur | null>(null);
const [loading, setLoading] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
```

### Transitions d'État

```
INITIAL
  etape = 'recherche'
  dossierSelectionne = null
  
  ↓ [Sélectionner dossier]
  
ALIMENTATION
  etape = 'alimentation'
  dossierSelectionne = {dossier}
  
  ↓ [Retour / Annuler]
  
RETOUR RECHERCHE
  etape = 'recherche'
  dossierSelectionne = null
  
  ↓ [Enregistrer]
  
SOUMISSION
  isSubmitting = true
  
  ↓ [Succès]
  
RETOUR + REFRESH
  etape = 'recherche'
  dossierSelectionne = null
  Recharge les dossiers
```

---

## 🧪 Tests de l'Interface

### Test 1 : Navigation Recherche → Alimentation

1. Ouvrir la page
2. ✅ Étape = 'recherche'
3. ✅ Liste des dossiers affichée
4. Cliquer "Sélectionner" sur EXP-2026-001
5. ✅ Étape = 'alimentation'
6. ✅ Informations dossier affichées
7. ✅ Montants de référence affichés
8. ✅ Formulaire vide avec valeurs par défaut

### Test 2 : Bouton Retour

1. Être en étape 'alimentation'
2. Cliquer "← Retour à la recherche"
3. ✅ Étape = 'recherche'
4. ✅ Liste des dossiers réaffichée
5. ✅ Formulaire réinitialisé

### Test 3 : Affichage des Montants

1. Sélectionner un dossier
2. ✅ Montant Autorisé en bleu
3. ✅ Montant Utilisé en orange
4. ✅ Solde Disponible en vert
5. ✅ Icônes appropriées
6. ✅ Devise affichée

### Test 4 : Validation Formulaire

1. Sélectionner un dossier
2. Laisser les champs vides
3. Cliquer "Enregistrer"
4. ✅ Erreurs affichées en rouge
5. ✅ Messages explicites
6. ✅ Soumission bloquée

### Test 5 : Soumission Réussie

1. Remplir le formulaire correctement
2. Cliquer "Enregistrer"
3. ✅ Bouton "Enregistrement..." avec spinner
4. ✅ Toast de succès
5. ✅ Retour automatique à la recherche
6. ✅ Liste rechargée

### Test 6 : Filtres Persistants

1. Appliquer des filtres
2. Sélectionner un dossier
3. Cliquer "Retour"
4. ✅ Filtres conservés
5. ✅ Résultats filtrés affichés

---

## 📊 Comparaison Avant/Après

### AVANT (Interface Simple)

```
- Une seule page
- Liste + Formulaire sur la même vue
- Sélection = Affichage formulaire en bas
- Pas de navigation claire
- Informations mélangées
```

### APRÈS (Interface 2 Étapes)

```
✓ Deux étapes distinctes
✓ Séparation recherche / alimentation
✓ Navigation claire avec bouton retour
✓ Informations organisées en cards
✓ Montants mis en valeur
✓ Expérience utilisateur fluide
```

---

## 🎯 Avantages de la Nouvelle Interface

### 1. **Clarté**
- Séparation nette des actions
- Focus sur une tâche à la fois
- Moins de surcharge cognitive

### 2. **Hiérarchie Visuelle**
- En-tête bleu pour le dossier
- Cards distinctes par fonction
- Montants mis en évidence

### 3. **Navigation Intuitive**
- Bouton retour visible
- Fil d'ariane implicite (titre)
- Actions cohérentes

### 4. **Feedback Utilisateur**
- Chargement visible
- Erreurs contextuelles
- Confirmation claire

### 5. **Cohérence**
- Interface identique à "Mise à jour Bénéficiaires"
- Même logique de navigation
- Apprentissage facilité

---

## 💾 Code Clé

### Structure des États

```typescript
const [etape, setEtape] = useState<'recherche' | 'alimentation'>('recherche');
const [dossierSelectionne, setDossierSelectionne] = useState<DossierExportateur | null>(null);
```

### Navigation

```typescript
// Sélectionner un dossier
const handleSelectDossier = (dossier: DossierExportateur) => {
  setDossierSelectionne(dossier);
  setAlimentation({
    numeroDossier: dossier.numeroDossier,
    typeOperation: 'AUGMENTATION',
    dateOperation: new Date().toISOString().split('T')[0]
  });
  setErrors({});
  setEtape('alimentation'); // ← Passage à l'étape 2
};

// Retour à la recherche
const handleRetourRecherche = () => {
  setEtape('recherche'); // ← Retour à l'étape 1
  setDossierSelectionne(null);
  setAlimentation({
    typeOperation: 'AUGMENTATION',
    dateOperation: new Date().toISOString().split('T')[0]
  });
  setErrors({});
};
```

### Rendu Conditionnel

```typescript
// Interface de recherche
if (etape === 'recherche') {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Filtres + Liste */}
    </div>
  );
}

// Interface d'alimentation
return (
  <div className="p-6 max-w-7xl mx-auto space-y-6">
    {/* Bouton retour + Formulaire */}
  </div>
);
```

---

## ✨ Résultat Final

Le composant **AlimentationDossierExportateur** utilise maintenant :

✅ Architecture en 2 étapes (`recherche` → `alimentation`)
✅ Interface identique à "Mise à jour Bénéficiaires"
✅ Navigation claire avec bouton retour
✅ Cards organisées par fonction
✅ Montants mis en valeur avec couleurs
✅ Validation complète du formulaire
✅ Feedback utilisateur optimal

---

*Document généré le 14 février 2026 - IBANSYS v1.0*
*Module : Alimentation Dossier Exportateur - Interface 2 Étapes*
*Société le Monde Informatique*
