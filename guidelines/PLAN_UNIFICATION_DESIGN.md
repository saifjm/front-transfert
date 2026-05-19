# 🎨 Plan d'Unification du Design - Tous les Modules AVA

## Date : 15 Février 2026

---

## 🎯 Objectif

Appliquer **exactement le même design** que `AVAMiseAJourBeneficiaires` à **TOUS** les modules AVA pour une cohérence totale.

---

## ✅ Design de Référence : AVAMiseAJourBeneficiaires

### **ÉTAPE 1 : RECHERCHE**

```tsx
<div className="p-6 max-w-7xl mx-auto space-y-6">
  {/* En-tête simple */}
  <div>
    <h1 className="text-3xl font-bold">Titre Module</h1>
    <p className="text-muted-foreground mt-1">Description</p>
  </div>

  {/* Card Recherche */}
  <Card>
    <CardHeader>
      <CardTitle>Rechercher un dossier</CardTitle>
      <CardDescription>Utilisez les filtres...</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Grille 4 colonnes */}
      <div className="grid grid-cols-4 gap-4">
        {/* 4 filtres */}
      </div>
      {/* Bouton Réinitialiser */}
      <div className="flex justify-end">
        <Button variant="outline">Réinitialiser les filtres</Button>
      </div>
    </CardContent>
  </Card>

  {/* Card Liste */}
  <Card>
    <CardHeader>
      <CardTitle>Dossiers valides ({count})</CardTitle>
      <CardDescription>Sélectionnez un dossier...</CardDescription>
    </CardHeader>
    <CardContent>
      {/* Tableau 8 colonnes */}
      <table>
        {/* Bouton Sélectionner avec icône <Search> */}
      </table>
    </CardContent>
  </Card>
</div>
```

### **ÉTAPE 2 : FORMULAIRE**

```tsx
<div className="p-6 max-w-7xl mx-auto space-y-6">
  {/* En-tête avec actions */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <Button variant="outline" size="icon" onClick={retourListe}>
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Titre Module</h1>
        <p className="text-muted-foreground mt-1">
          Dossier : {numeroDossier} - {prenom} {nom}
        </p>
      </div>
    </div>
    <Button onClick={handleSubmit}>
      <Save className="w-4 h-4 mr-2" />
      Enregistrer
    </Button>
  </div>

  {/* Card Informations du dossier */}
  <Card>
    <CardHeader>
      <CardTitle>Informations du dossier</CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Section 1 : Informations générales */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Informations générales
        </h3>
        {/* Grille 5 colonnes */}
        <div className="grid grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Code Agence</p>
            <p className="font-medium">{codeAgence}</p>
          </div>
          {/* ... 4 autres colonnes */}
        </div>
        {/* Grille 2 colonnes */}
        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <p className="text-muted-foreground">N° Pièce Client</p>
            <p className="font-medium">{noPieceClient}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nom du client</p>
            <p className="font-medium">{prenom} {nom}</p>
          </div>
        </div>
      </div>

      {/* Séparateur */}
      <div className="border-t"></div>

      {/* Section 2 : Montants de référence */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Montants de référence
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {/* 3 Cards vertes */}
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-muted-foreground">Montant autorisé</p>
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">
              {mntAutorise?.toLocaleString('fr-FR', { 
                minimumFractionDigits: 3, 
                maximumFractionDigits: 3 
              })} TND
            </p>
          </div>
          {/* ... 2 autres */}
        </div>
      </div>

      {/* Séparateur */}
      <div className="border-t"></div>

      {/* Section 3 : Montants utilisés */}
      <div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {/* 2 Cards violettes + 1 conditionnelle */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-muted-foreground">Montant utilisé</p>
            <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
              {mntUtilise?.toLocaleString('fr-FR', { 
                minimumFractionDigits: 3, 
                maximumFractionDigits: 3 
              })} TND
            </p>
          </div>
          {/* ... */}
          <div className={`p-3 rounded-lg border ${
            (solde ?? 0) >= 0 
              ? 'bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <p className="text-muted-foreground">Solde disponible</p>
            <p className={`text-lg font-semibold ${
              (solde ?? 0) >= 0 
                ? 'text-green-800 dark:text-green-300' 
                : 'text-red-700 dark:text-red-400'
            }`}>
              {solde?.toLocaleString('fr-FR', { 
                minimumFractionDigits: 3, 
                maximumFractionDigits: 3 
              })} TND
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Cards spécifiques au module */}
  {/* ... */}

  {/* Card Actions finale (optionnelle) */}
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">* Champs obligatoires</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={retourListe}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## 📊 État des Modules

| Module | Statut | Interface Adaptée | Montants Complets |
|--------|--------|-------------------|-------------------|
| AVAMiseAJourBeneficiaires | ✅ **Modèle** | ✅ | ✅ |
| AlimentationDossierExportateur | ✅ Fait | ✅ | ✅ |
| AVAFraisVoyage | 🔧 À refaire | ❌ | ❌ |
| AVARetrocession | 🔧 À refaire | ❌ | ❌ |
| AVAReservation | 🔧 À refaire | ❌ | ❌ |
| AVASuspension | 🔧 À refaire | ❌ | ❌ |
| AVALeveeSuspension | 🔧 À refaire | ❌ | ❌ |
| AVAClotureDossier | 🔧 À refaire | ❌ | ❌ |

---

## 🔧 Modifications à Appliquer

### **1. Interface DossierAVA**

Ajouter les champs manquants :

```typescript
interface DossierAVA {
  codeAgence: string | number;
  libelleAgence: string;
  typeDossier: string | number;
  codeTypeDossier?: string | number;
  libelleTypeDossier: string;
  numeroDossier: string;
  dateDossier: string;
  noPieceClient: string;
  nomClient: string;
  prenomClient?: string;
  
  // NOUVEAUX champs pour montants détaillés
  montantAutorise: number;
  mntAutorise?: number;
  montantUtilise: number;
  mntUtilise?: number;
  mntAvance?: number;
  mntAutorisationBct?: number;
  mntReserve?: number;
  mntBlocage?: number;
  solde: number;
  
  devise: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  echeance?: string;
  typePieceClient?: number;
}
```

### **2. Données Mock**

Ajouter tous les montants :

```typescript
const mockDossiers: DossierAVA[] = [
  {
    codeAgence: '001',
    libelleAgence: 'Agence Tunis Centre',
    // ...
    montantAutorise: 500000,
    mntAutorise: 500000,
    montantUtilise: 150000,
    mntUtilise: 150000,
    mntAvance: 250000,
    mntAutorisationBct: 100000,
    mntReserve: 50000,
    mntBlocage: 0,
    solde: 350000,
    devise: 'TND'
  }
];
```

### **3. En-tête Étape Formulaire**

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-4">
    <Button variant="outline" size="icon" onClick={retourRecherche}>
      <ArrowLeft className="w-4 h-4" />
    </Button>
    <div>
      <h1 className="text-3xl font-bold">Titre Module</h1>
      <p className="text-muted-foreground mt-1">
        Dossier : {dossierSelectionne?.numeroDossier} - {dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}
      </p>
    </div>
  </div>
  <Button onClick={handleSubmit} disabled={isSubmitting}>
    <Save className="w-4 h-4 mr-2" />
    Enregistrer
  </Button>
</div>
```

### **4. Remplacer les Cards Dossier**

Supprimer les anciennes Cards et remplacer par la Card unique "Informations du dossier" avec les 3 sections.

---

## 🎨 Palette de Couleurs Unifiée

### **Classes Tailwind à Utiliser**

#### **Vert (Montants de référence)**
```css
bg-green-50 dark:bg-green-900/20
border-green-200 dark:border-green-800
text-green-700 dark:text-green-400
```

#### **Violet (Montants utilisés/réservés)**
```css
bg-purple-50 dark:bg-purple-900/20
border-purple-200 dark:border-purple-800
text-purple-700 dark:text-purple-400
```

#### **Vert/Rouge Conditionnel (Solde)**
```tsx
// Solde positif
className="bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900"
// Texte
className="text-green-800 dark:text-green-300"

// Solde négatif
className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
// Texte
className="text-red-700 dark:text-red-400"
```

### **Format des Montants**

```typescript
montant?.toLocaleString('fr-FR', { 
  minimumFractionDigits: 3, 
  maximumFractionDigits: 3 
})
```

Toujours ajouter ` TND` après.

---

## 📝 Checklist par Module

Pour chaque module, vérifier :

- [ ] ✅ Interface `DossierAVA` complète avec tous les champs
- [ ] ✅ Données mock avec tous les montants (`mntAutorise`, `mntAvance`, `mntAutorisationBct`, `mntUtilise`, `mntReserve`, `solde`)
- [ ] ✅ Étape Recherche : En-tête simple (h1 + p)
- [ ] ✅ Étape Recherche : Card Recherche (4 filtres)
- [ ] ✅ Étape Recherche : Card Liste (tableau 8 colonnes)
- [ ] ✅ Étape Recherche : Bouton "Sélectionner" avec icône `<Search>`
- [ ] ✅ Étape Formulaire : En-tête (Button icon + Titre + Button action)
- [ ] ✅ Étape Formulaire : Card "Informations du dossier" complète
  - [ ] Section "Informations générales" (grille 5 + grille 2)
  - [ ] Séparateur
  - [ ] Section "Montants de référence" (3 cards vertes)
  - [ ] Séparateur
  - [ ] Section montants utilisés (2 violettes + 1 conditionnelle)
- [ ] ✅ Format TND avec 3 décimales partout
- [ ] ✅ Couleurs exactes (vert/violet/conditionnel)
- [ ] ✅ Dark mode support
- [ ] ✅ Card Actions finale (optionnelle selon le module)

---

## 🚀 Ordre de Mise à Jour

1. ✅ **AVAMiseAJourBeneficiaires** - Modèle de référence
2. ✅ **AlimentationDossierExportateur** - Déjà fait
3. 🔧 **AVAFraisVoyage**
4. 🔧 **AVARetrocession**
5. 🔧 **AVAReservation**
6. 🔧 **AVASuspension**
7. 🔧 **AVALeveeSuspension**
8. 🔧 **AVAClotureDossier**

---

## ⚠️ Points d'Attention

### **Ne PAS Modifier**
- La logique métier spécifique à chaque module
- Les validations
- Les appels API
- Les DTO spécifiques

### **À Modifier**
- Structure visuelle uniquement
- Interface `DossierAVA`
- Données mock (ajouter montants)
- Layout des Cards
- Format des montants

---

## 📐 Template Générique

### **Interface**
```typescript
interface DossierAVA {
  codeAgence: string | number;
  libelleAgence: string;
  typeDossier: string | number;
  codeTypeDossier?: string | number;
  libelleTypeDossier: string;
  numeroDossier: string;
  dateDossier: string;
  noPieceClient: string;
  nomClient: string;
  prenomClient?: string;
  montantAutorise: number;
  mntAutorise?: number;
  montantUtilise: number;
  mntUtilise?: number;
  mntAvance?: number;
  mntAutorisationBct?: number;
  mntReserve?: number;
  mntBlocage?: number;
  solde: number;
  devise: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  echeance?: string;
  typePieceClient?: number;
}
```

### **Mock Data Template**
```typescript
{
  codeAgence: '001',
  libelleAgence: 'Agence Tunis Centre',
  typeDossier: '1',
  codeTypeDossier: '1',
  libelleTypeDossier: 'EXPORTATEUR',
  numeroDossier: 'AVA-2026-001',
  dateDossier: '2026-01-15',
  nomClient: 'Dupont',
  prenomClient: 'Jean',
  noPieceClient: '1234567A',
  montantAutorise: 150000,
  mntAutorise: 150000,
  montantUtilise: 45000,
  mntUtilise: 45000,
  mntAvance: 75000,
  mntAutorisationBct: 30000,
  mntReserve: 30000,
  mntBlocage: 0,
  solde: 75000,
  devise: 'TND',
  statut: 'ACTIF',
  echeance: '2026-12-31',
  typePieceClient: 1
}
```

---

*Document créé le 15 février 2026*  
*IBANSYS - Unification du Design des Modules AVA*  
*Basé sur AVAMiseAJourBeneficiaires comme modèle de référence*

**🎯 Objectif : 100% de cohérence visuelle sur tous les modules ! 🎯**
