# Intégration de l'API Bénéficiaires dans AVAMiseAJourBeneficiaires.tsx

## Vue d'ensemble

Ce document décrit l'intégration de l'API Bénéficiaires dans le composant `AVAMiseAJourBeneficiaires.tsx`. L'API permet de créer, mettre à jour et récupérer les bénéficiaires associés à un dossier AVA.

## Spécification API

### Endpoints

1. **POST /api/beneficiaires/{finalize}**
   - Crée ou met à jour un bénéficiaire
   - `finalize=true` : opération finale avec changements en base
   - `finalize=false` : création d'un brouillon uniquement

2. **GET /api/beneficiaires/{numDossier}**
   - Récupère tous les bénéficiaires d'un dossier

### Payload exemple

```json
{
  "numDossier": 10002,
  "dateDossier": "2026-01-19",
  "typePieceBenef": 1,
  "noPieceBenef": "AB654321",
  "codeTypeDos": 3,
  "nomBenef": "Karim Trabelsi",
  "adresseBenef": "45 Avenue Habib Bourguiba, Sfax",
  "qualite": "Dirigeant",
  "datePiece": "2025-12-01",
  "etat": "A"
}
```

## Modifications requises

### 1. Remplacement des données mock pour le chargement

**Fichier :** `components/AVAMiseAJourBeneficiaires.tsx`

**Ligne actuelle (~360) :**
```typescript
// Bénéficiaires mock par défaut
const mockBeneficiaires: BeneficiaireExistant[] = [
  // ... données mock
];
```

**Remplacement par :**
```typescript
// Charger les bénéficiaires depuis l'API
const fetchBeneficiaires = async (numDossier: number) => {
  try {
    const response = await fetch(`/api/beneficiaires/${numDossier}`);
    if (!response.ok) {
      throw new Error(`HTTP_ERROR_${response.status}`);
    }
    
    const data = await safeJsonParse<BeneficiaireDTO[]>(response);
    if (!data) {
      throw new Error('NO_DATA');
    }
    
    // Transformer les données API vers le format interne
    const beneficiairesTransformes: BeneficiaireExistant[] = data.map(benef => ({
      id: `${benef.numDossier}-${benef.noPieceBenef}`, // ID composite
      typePieceBenef: benef.typePieceBenef,
      noPieceBenef: benef.noPieceBenef,
      nomBenef: benef.nomBenef,
      adresseBenef: benef.adresseBenef,
      qualite: benef.qualite,
      datePiece: benef.datePiece,
      etat: benef.etat as 'AA' | 'AD' | 'A' | 'N',
      isNew: false // Les bénéficiaires chargés sont existants
    }));
    
    return beneficiairesTransformes;
  } catch (error) {
    console.error('Erreur chargement bénéficiaires:', error);
    return []; // Retourner tableau vide en cas d'erreur
  }
};
```

### 2. Modification de la fonction selectionnerDossier

**Ligne actuelle (~350) :**
```typescript
setBeneficiaires(mockBeneficiaires);
setBeneficiairesInitiaux(mockBeneficiaires);
```

**Remplacement par :**
```typescript
// Charger les bénéficiaires réels
const beneficiairesCharges = await fetchBeneficiaires(dossierComplet.numDossier!);
setBeneficiaires(beneficiairesCharges);
setBeneficiairesInitiaux(beneficiairesCharges);
```

### 3. Remplacement de la simulation de soumission

**Ligne actuelle (~570) :**
```typescript
// Simulation d'appel API
await new Promise(resolve => setTimeout(resolve, 1000));
```

**Remplacement par :**
```typescript
// Préparer les données pour l'API
const beneficiairesAPayload = beneficiaires.map(benef => ({
  numDossier: dossierSelectionne?.numDossier,
  dateDossier: dossierSelectionne?.dateDossier,
  typePieceBenef: benef.typePieceBenef,
  noPieceBenef: benef.noPieceBenef,
  codeTypeDos: dossierSelectionne?.codeTypeDossier,
  nomBenef: benef.nomBenef,
  adresseBenef: benef.adresseBenef,
  qualite: benef.qualite,
  datePiece: benef.datePiece,
  etat: benef.etat
}));

// Envoyer chaque bénéficiaire à l'API
for (const benefPayload of beneficiairesAPayload) {
  const response = await fetch('/api/beneficiaires/true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(benefPayload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Erreur API bénéficiaire: ${response.status} - ${errorData.message || 'Erreur inconnue'}`);
  }
}
```

### 4. Ajout de l'interface BeneficiaireDTO

**Ajout en haut du fichier :**
```typescript
interface BeneficiaireDTO {
  numDossier: number;
  dateDossier: string;
  typePieceBenef: number;
  noPieceBenef: string;
  codeTypeDos: number;
  nomBenef: string;
  adresseBenef: string;
  qualite: string;
  datePiece: string;
  etat: string;
  codeAgenceAva?: number;
  dateCreation?: string;
  dateSuppression?: string;
}
```

## Gestion des états

### États des bénéficiaires

- **AA** : À activer (nouveau bénéficiaire)
- **A** : Actif
- **AD** : À désactiver
- **N** : Inactif

### Règles métier

1. **Nouveaux bénéficiaires** : État initial = "AA"
2. **Bénéficiaires actifs** : Peuvent être désactivés (état "AD")
3. **Bénéficiaires inactifs** : Peuvent être réactivés (état "AA")

## Validation

### Champs requis

- `numDossier` : Numéro du dossier
- `dateDossier` : Date du dossier
- `typePieceBenef` : Type de pièce (1=CIN, 4=Carte séjour, 7=Passeport)
- `noPieceBenef` : Numéro de pièce
- `codeTypeDos` : Type de dossier
- `nomBenef` : Nom du bénéficiaire
- `adresseBenef` : Adresse
- `qualite` : Qualité (Dirigeant, Conseil d'administration, Employé)
- `datePiece` : Date de délivrance de la pièce (doit être antérieure à aujourd'hui)
- `etat` : État du bénéficiaire

### Validation côté client

- **Date pièce** : Doit être dans le passé
- **Format numéro pièce** : Selon le type sélectionné
- **Qualité** : Valeurs autorisées uniquement

## Gestion des erreurs

### Codes d'erreur API

- **400** : Erreur de validation
- **404** : Dossier ou personne introuvable
- **409** : Violation de règle métier
- **500** : Erreur serveur

### Gestion côté frontend

```typescript
try {
  const response = await fetch('/api/beneficiaires/true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(benefPayload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
  }
  
  const result = await response.json();
  console.log('Bénéficiaire créé/mis à jour:', result);
} catch (error) {
  console.error('Erreur API:', error);
  toast.error('Erreur lors de la mise à jour du bénéficiaire', {
    description: error.message
  });
}
```

## Tests

### Scénarios à tester

1. **Chargement des bénéficiaires** : Vérifier que l'API GET retourne les bonnes données
2. **Création de bénéficiaire** : Nouveau bénéficiaire avec état "AA"
3. **Modification d'état** : Changement d'état actif vers "AD"
4. **Validation** : Erreurs de validation côté API
5. **Gestion d'erreurs** : Messages d'erreur appropriés

### Données de test

```json
{
  "numDossier": 10002,
  "dateDossier": "2026-01-19",
  "typePieceBenef": 1,
  "noPieceBenef": "AB654321",
  "codeTypeDos": 3,
  "nomBenef": "Karim Trabelsi",
  "adresseBenef": "45 Avenue Habib Bourguiba, Sfax",
  "qualite": "Dirigeant",
  "datePiece": "2025-12-01",
  "etat": "A"
}
```

## Migration depuis les données mock

1. **Phase 1** : Implémenter le chargement depuis l'API (GET)
2. **Phase 2** : Implémenter la création/mise à jour (POST)
3. **Phase 3** : Supprimer les données mock
4. **Phase 4** : Tests complets avec l'API réelle

## Dépendances

- `safeJsonParse` : Fonction utilitaire pour parser le JSON en sécurité
- `toast` : Bibliothèque de notifications (sonner)
- API backend disponible sur `/api/beneficiaires/*`