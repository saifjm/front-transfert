# 📦 Alimentation Dossier Exportateur - Documentation

## Date : 14 Février 2026

---

## 🎯 Vue d'Ensemble

Le composant **Alimentation Dossier Exportateur** permet de gérer les opérations d'augmentation et de restitution de montant pour les dossiers exportateurs actifs.

---

## 📋 Fonctionnalités

### 1. **Liste des Dossiers Exportateurs**

- ✅ Affichage de tous les dossiers exportateurs valides
- ✅ Colonnes détaillées : N° Dossier, Date, Client, Montants, Statut
- ✅ Calcul automatique du solde
- ✅ Badge coloré selon le statut (Actif/Suspendu/Clôturé)
- ✅ Recherche en temps réel par numéro, client ou pièce

### 2. **Types d'Opérations**

#### **Augmentation**
- Augmente le montant autorisé du dossier
- Permet d'ajouter du crédit supplémentaire
- Pas de limite maximale

#### **Restitution**
- Restitue une partie du montant utilisé
- Validation : Le montant ne peut pas dépasser le montant utilisé
- Libère du crédit utilisé

### 3. **Validation Automatique**

- ✅ Montant obligatoire et > 0
- ✅ Type d'opération obligatoire
- ✅ Date obligatoire
- ✅ Référence obligatoire
- ✅ Contrôle spécifique pour restitution

### 4. **Interface Utilisateur**

- 🔍 Recherche instantanée
- 📊 Tableau responsive
- 🎨 Mise en évidence du dossier sélectionné
- ✅ Formulaire contextuel
- 🔄 Actualisation des données

---

## 🗂️ Structure des Données

### DossierExportateur

```typescript
interface DossierExportateur {
  numeroDossier: string;         // Ex: "EXP-2026-001"
  dateOuverture: string;         // Format: "YYYY-MM-DD"
  nomClient: string;             // Nom du client
  noPieceClient: string;         // N° pièce d'identité
  montantAutorise: number;       // Montant total autorisé
  montantUtilise: number;        // Montant déjà utilisé
  solde: number;                 // Solde disponible
  devise: string;                // EUR, USD, etc.
  statut: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  banqueProvenance?: string;     // Code banque
}
```

### AlimentationDTO

```typescript
interface AlimentationDTO {
  numeroDossier?: string;
  montantAlimentation?: number;
  typeOperation?: 'AUGMENTATION' | 'RESTITUTION';
  dateOperation?: string;
  reference?: string;
  observations?: string;
}
```

---

## 🎨 Interface Utilisateur

### Vue Principale

```
╔═══════════════════════════════════════════════════════════════════╗
║ Alimentation Dossier Exportateur                    [🔄 Actualiser]║
║ Augmentation ou restitution du montant d'un dossier exportateur  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Dossiers Exportateurs Valides                [🔍 Rechercher...]  ║
║  5 dossier(s) disponible(s)                                       ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ N° Dossier  │ Date       │ Client      │ Autorisé │ Solde  │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ EXP-2026-001│ 15/01/2026 │ TUNISIA...  │ 500,000  │350,000 │ ║
║  │ [Sélectionner]                                   ✓ Actif    │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ EXP-2026-002│ 20/01/2026 │ EXPORT...   │ 300,000  │ 20,000 │ ║
║  │ [Sélectionner]                                   ✓ Actif    │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Vue Formulaire (Après Sélection)

```
╔═══════════════════════════════════════════════════════════════════╗
║ 📈 Alimentation du Dossier EXP-2026-001                           ║
║ Augmentation ou restitution du montant autorisé                  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ℹ️ Informations du Dossier                                       ║
║  ┌───────────────┬────────────────┬──────────────┬──────────────┐║
║  │ Client        │ Montant        │ Montant      │ Solde        │║
║  │ TUNISIA...    │ Autorisé       │ Utilisé      │ Disponible   │║
║  │               │ 500,000 EUR    │ 150,000 EUR  │ 350,000 EUR  │║
║  └───────────────┴────────────────┴──────────────┴──────────────┘║
║                                                                   ║
║  Type d'Opération *         │  Montant *                         ║
║  [Augmentation ▼]           │  [___________] EUR                 ║
║                             │                                    ║
║  Date Opération *           │  Référence *                       ║
║  [14/02/2026]               │  [___________]                     ║
║                                                                   ║
║  Observations                                                     ║
║  [_________________________________________________________]      ║
║                                                                   ║
║                                    [Annuler] [✓ Enregistrer]     ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 🔍 Recherche et Filtrage

### Critères de Recherche

La recherche s'effectue en temps réel sur :
- **Numéro de dossier** : EXP-2026-001
- **Nom du client** : TUNISIA EXPORT
- **Numéro de pièce** : 1234567A

### Exemples

```
Recherche : "EXP-2026"    → Trouve tous les dossiers 2026
Recherche : "TUNISIA"     → Trouve le client TUNISIA EXPORT
Recherche : "1234"        → Trouve par n° de pièce
```

---

## ✅ Validation

### Règles Obligatoires

| Champ | Règle | Message d'Erreur |
|-------|-------|------------------|
| Montant | > 0 | "Le montant doit être supérieur à 0" |
| Type Opération | Obligatoire | "Le type d'opération est obligatoire" |
| Date | Obligatoire | "La date est obligatoire" |
| Référence | Non vide | "La référence est obligatoire" |

### Règles Spécifiques

#### Pour RESTITUTION
```typescript
if (montantRestitution > montantUtilise) {
  Error: "Le montant ne peut pas dépasser le montant utilisé"
}
```

#### Pour AUGMENTATION
- Aucune limite maximale
- Le montant s'ajoute au montant autorisé

---

## 🎯 Cas d'Usage

### Scénario 1 : Augmentation de Crédit

**Contexte :**
- Dossier EXP-2026-001
- Montant autorisé : 500,000 EUR
- Client demande 200,000 EUR supplémentaires

**Actions :**
1. Rechercher et sélectionner EXP-2026-001
2. Type : Augmentation
3. Montant : 200,000
4. Référence : "AVENANT-2026-02-14"
5. Enregistrer

**Résultat :**
- Nouveau montant autorisé : 700,000 EUR
- Nouveau solde : 550,000 EUR (si utilisé inchangé)

### Scénario 2 : Restitution après Export

**Contexte :**
- Dossier EXP-2026-002
- Montant utilisé : 280,000 USD
- Export réalisé : 100,000 USD à restituer

**Actions :**
1. Sélectionner EXP-2026-002
2. Type : Restitution
3. Montant : 100,000
4. Référence : "EXPORT-2026-45"
5. Enregistrer

**Résultat :**
- Nouveau montant utilisé : 180,000 USD
- Nouveau solde : 120,000 USD (au lieu de 20,000)

---

## 🚨 Gestion des Erreurs

### Erreurs Affichées

#### Montant Invalide
```
❌ Montant invalide
Le montant doit être supérieur à 0
```

#### Restitution Excessive
```
❌ Montant de restitution invalide
Le montant de restitution ne peut pas dépasser 
le montant utilisé (280,000 USD)
```

#### Champ Obligatoire
```
❌ Champ obligatoire
La référence est obligatoire
```

---

## 🎨 Badges de Statut

### Actif
```
✓ Actif     (Vert - Badge bg-green-500)
```
- Dossier opérationnel
- Peut être alimenté
- Bouton "Sélectionner" activé

### Suspendu
```
⚠ Suspendu  (Orange - Badge bg-orange-500)
```
- Dossier temporairement bloqué
- Ne peut pas être alimenté
- Bouton "Sélectionner" désactivé

### Clôturé
```
✗ Clôturé   (Gris - Badge bg-gray-500)
```
- Dossier fermé définitivement
- Ne peut pas être alimenté
- Bouton "Sélectionner" désactivé

---

## 🔄 API Endpoints

### GET /api/dossiers/exportateurs/valides

**Description :** Récupère la liste des dossiers exportateurs valides

**Réponse :**
```json
[
  {
    "numeroDossier": "EXP-2026-001",
    "dateOuverture": "2026-01-15",
    "nomClient": "ENTREPRISE TUNISIA EXPORT",
    "noPieceClient": "1234567A",
    "montantAutorise": 500000,
    "montantUtilise": 150000,
    "solde": 350000,
    "devise": "EUR",
    "statut": "ACTIF",
    "banqueProvenance": "STB"
  }
]
```

### POST /api/dossiers/exportateurs/alimenter

**Description :** Enregistre une opération d'alimentation

**Body :**
```json
{
  "numeroDossier": "EXP-2026-001",
  "montantAlimentation": 200000,
  "typeOperation": "AUGMENTATION",
  "dateOperation": "2026-02-14",
  "reference": "AVENANT-2026-02-14",
  "observations": "Augmentation suite à nouveau contrat"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Alimentation enregistrée avec succès"
}
```

---

## 🧪 Tests

### Test 1 : Liste des Dossiers

1. Ouvrir la page
2. ✅ Vérifier : Liste affichée avec 5 dossiers
3. ✅ Vérifier : Colonnes correctes
4. ✅ Vérifier : Badges de statut

### Test 2 : Recherche

1. Saisir "EXP-2026" dans la recherche
2. ✅ Vérifier : Filtrage en temps réel
3. ✅ Vérifier : Résultats correspondants
4. Effacer la recherche
5. ✅ Vérifier : Tous les dossiers réaffichés

### Test 3 : Sélection Dossier

1. Cliquer sur "Sélectionner" pour EXP-2026-001
2. ✅ Vérifier : Ligne surlignée en bleu
3. ✅ Vérifier : Formulaire affiché en bas
4. ✅ Vérifier : Informations dossier correctes

### Test 4 : Augmentation

1. Sélectionner un dossier actif
2. Type : Augmentation
3. Montant : 100000
4. Date : Aujourd'hui
5. Référence : "TEST-001"
6. Cliquer "Enregistrer"
7. ✅ Vérifier : Toast de succès
8. ✅ Vérifier : Liste actualisée

### Test 5 : Restitution Valide

1. Sélectionner EXP-2026-002 (280,000 utilisé)
2. Type : Restitution
3. Montant : 50000
4. Référence : "REST-001"
5. Enregistrer
6. ✅ Vérifier : Succès

### Test 6 : Restitution Invalide

1. Sélectionner EXP-2026-002
2. Type : Restitution
3. Montant : 300000 (> 280,000 utilisé)
4. Tenter d'enregistrer
5. ✅ Vérifier : Erreur affichée
6. ✅ Vérifier : Soumission bloquée

### Test 7 : Validation Champs

1. Sélectionner un dossier
2. Laisser montant vide
3. Enregistrer
4. ✅ Vérifier : Erreur "montant > 0"
5. Remplir montant mais pas référence
6. Enregistrer
7. ✅ Vérifier : Erreur "référence obligatoire"

### Test 8 : Annulation

1. Sélectionner un dossier
2. Remplir le formulaire
3. Cliquer "Annuler"
4. ✅ Vérifier : Formulaire fermé
5. ✅ Vérifier : Sélection effacée
6. ✅ Vérifier : Données réinitialisées

---

## 💡 Bonnes Pratiques

### Pour l'Utilisateur

1. **Vérifier le solde** avant de sélectionner
2. **Utiliser la recherche** pour trouver rapidement
3. **Vérifier le statut** (seuls les ACTIF sont sélectionnables)
4. **Doubler vérifier** le montant avant validation
5. **Renseigner une référence claire** pour traçabilité

### Pour le Développeur

1. **Validation côté client ET serveur**
2. **Messages d'erreur explicites**
3. **Feedback visuel immédiat**
4. **Gestion d'erreur silencieuse** avec fallback
5. **Actualisation automatique** après opération

---

## 🎉 Fonctionnalités Clés

✅ **Liste Interactive** : Recherche et filtrage en temps réel
✅ **Validation Robuste** : Contrôles métier automatiques
✅ **Double Opération** : Augmentation ET Restitution
✅ **Interface Intuitive** : Formulaire contextuel
✅ **Feedback Visuel** : Badges, couleurs, messages
✅ **Mode Démo** : Fonctionne sans backend
✅ **Responsive** : S'adapte à toutes les tailles d'écran

---

*Document généré le 14 février 2026 - IBANSYS v1.0*
*Module : Alimentation Dossier Exportateur*
*Société le Monde Informatique*
