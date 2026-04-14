# Système de Gestion des Erreurs Techniques - IBANSYS

## Vue d'ensemble

Le système de gestion des erreurs techniques d'IBANSYS affiche automatiquement un popup professionnel à l'utilisateur lorsqu'une erreur survient, avec la possibilité de copier le message d'erreur pour le transmettre à l'administrateur système.

## Architecture

### Composants principaux

1. **ErrorDialog** (`/components/ErrorDialog.tsx`)
   - Composant UI de la modal d'erreur
   - Affichage du message d'erreur et des détails techniques
   - Bouton de copie du message complet
   - Design professionnel aligné avec la charte graphique IBANSYS

2. **ErrorContext** (`/components/ErrorContext.tsx`)
   - Context React pour la gestion globale des erreurs
   - Provider qui enveloppe toute l'application
   - Hook `useErrorHandler()` pour déclencher des erreurs depuis n'importe quel composant

3. **Utilitaires** (`/utils.ts`)
   - `showTechnicalError()` : Fonction globale pour afficher une erreur
   - `apiCall()` : Wrapper pour les appels API avec gestion d'erreur automatique
   - `setGlobalErrorHandler()` : Enregistrement du handler global (usage interne)

## Utilisation

### Option 1 : Utiliser le hook useErrorHandler (dans les composants React)

```tsx
import { useErrorHandler } from './components/ErrorContext';

function MyComponent() {
  const { showError } = useErrorHandler();

  const handleAction = async () => {
    try {
      // Opération risquée
      await someApiCall();
    } catch (error) {
      showError(
        'Impossible de charger les données',
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  };

  return <button onClick={handleAction}>Action</button>;
}
```

### Option 2 : Utiliser showTechnicalError (n'importe où)

```tsx
import { showTechnicalError } from './utils';

// Dans n'importe quelle fonction
function processData() {
  try {
    // Traitement risqué
    const result = JSON.parse(data);
  } catch (error) {
    showTechnicalError(
      'Erreur de parsing des données',
      `Données reçues: ${data}\nErreur: ${error.message}`
    );
  }
}
```

### Option 3 : Utiliser apiCall pour les appels API

```tsx
import { apiCall } from './utils';

async function loadDossier(dossierId: string) {
  // La gestion d'erreur est automatique
  const { data, error } = await apiCall(
    `/api/dossier/${dossierId}`,
    { method: 'GET' }
  );

  if (error) {
    // L'erreur a déjà été affichée à l'utilisateur
    // Utiliser des données mock en fallback
    return mockData;
  }

  return data;
}

// Pour désactiver le popup automatique (mode silencieux)
const { data, error } = await apiCall(
  '/api/check',
  { method: 'GET' },
  false // showErrorPopup = false
);
```

## Détails du Popup

Le popup d'erreur affiche :

### En-tête
- Icône d'alerte rouge
- Titre "Erreur Technique"
- Message expliquant qu'une erreur est survenue

### Corps du message
1. **Message d'erreur** (card rouge)
   - Message principal de l'erreur
   - Format monospace pour faciliter la lecture

2. **Détails techniques** (card grise, optionnelle)
   - Informations techniques supplémentaires
   - Stack trace, URL, paramètres, etc.
   - Scrollable si trop long (max 200px)

3. **Instructions** (card bleue)
   - Que faire maintenant ?
   - Instructions pour contacter l'admin
   - Guide pour copier et transmettre l'erreur

### Pied de page
- **Bouton "Copier l'erreur"**
  - Copie le message complet + détails dans le presse-papier
  - Feedback visuel "Copié !" pendant 2 secondes
  
- **Bouton "Fermer"**
  - Ferme le popup
  - Couleur IBANSYS (#435B7B)

## Format du message copié

Lorsque l'utilisateur clique sur "Copier l'erreur", le texte suivant est copié :

```
[Message d'erreur principal]

Détails techniques:
[Détails techniques si disponibles]
```

## Exemples d'utilisation dans le code existant

### Dans les modules AVA (recherche de dossier)

```tsx
const rechercherDossier = async () => {
  const { data, error } = await apiCall<DossierInfo>(
    `/api/ava/dossier/${numeroDossier}`,
    { method: 'GET' }
  );

  if (error) {
    // Utiliser les données mock en fallback
    setDossier(MOCK_DOSSIER);
    return;
  }

  setDossier(data);
};
```

### Dans les validations métier

```tsx
import { showTechnicalError } from '../utils';

const validerMontant = (montant: number, solde: number) => {
  try {
    if (montant > solde) {
      // Erreur métier (pas une erreur technique)
      setError('Le montant ne peut pas dépasser le solde disponible');
      return false;
    }
    
    // Validation complexe qui pourrait échouer
    const result = complexBusinessLogic(montant);
    return true;
  } catch (error) {
    // Erreur technique inattendue
    showTechnicalError(
      'Erreur lors de la validation du montant',
      `Montant: ${montant}, Solde: ${solde}\nErreur: ${error.message}`
    );
    return false;
  }
};
```

## Configuration et personnalisation

### Modifier l'apparence du popup

Éditer `/components/ErrorDialog.tsx` :

```tsx
// Changer les couleurs
className="bg-red-100" // Fond de l'icône
className="text-red-600" // Couleur de l'icône
className="bg-[#435B7B]" // Couleur du bouton principal
```

### Ajouter des actions supplémentaires

```tsx
// Dans ErrorDialog.tsx, ajouter un bouton
<Button
  variant="outline"
  onClick={() => {
    // Envoyer l'erreur à un service de monitoring
    sendToMonitoring(errorMessage, errorDetails);
  }}
>
  Envoyer au support
</Button>
```

### Désactiver globalement les popups d'erreur

```tsx
// Dans utils.ts, modifier la variable globale
let globalShowError: ((message: string, details?: string) => void) | null = null;
let enableErrorPopups = false; // Ajouter cette ligne

export function showTechnicalError(message: string, details?: string) {
  if (globalShowError && enableErrorPopups) {
    globalShowError(message, details);
  } else {
    console.error('Erreur technique:', message, details);
  }
}
```

## Bonnes pratiques

### 1. Différencier erreurs métier et erreurs techniques

```tsx
// ❌ Mauvais - Ne pas utiliser pour les erreurs métier
if (montant <= 0) {
  showTechnicalError('Le montant doit être positif');
}

// ✅ Bon - Utiliser pour les erreurs métier
if (montant <= 0) {
  setError('Le montant doit être positif');
  return;
}

// ✅ Bon - Utiliser pour les erreurs techniques
try {
  const data = await apiCall('/api/data');
} catch (error) {
  showTechnicalError('Erreur lors du chargement', error.message);
}
```

### 2. Fournir des détails techniques utiles

```tsx
// ❌ Mauvais - Pas assez d'informations
showTechnicalError('Erreur');

// ✅ Bon - Détails contextuels
showTechnicalError(
  'Erreur lors de la sauvegarde du dossier',
  `ID Dossier: ${dossierId}\nURL: /api/dossier\nErreur: ${error.message}`
);
```

### 3. Utiliser apiCall pour les appels API

```tsx
// ❌ Mauvais - Gérer manuellement chaque appel
try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    showTechnicalError(`Erreur ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  showTechnicalError('Erreur réseau');
}

// ✅ Bon - Utiliser apiCall
const { data, error } = await apiCall('/api/data');
if (error) {
  // L'erreur est déjà affichée
  return mockData;
}
```

## Intégration avec le système existant

Le système de gestion des erreurs est déjà intégré dans :

- ✅ App.tsx (ErrorProvider wrapping)
- ✅ utils.ts (fonctions utilitaires)
- ✅ Tous les composants peuvent l'utiliser via useErrorHandler

## Tests

### Tester l'affichage du popup

```tsx
// Dans n'importe quel composant
import { useErrorHandler } from './components/ErrorContext';

function TestComponent() {
  const { showError } = useErrorHandler();

  return (
    <button onClick={() => {
      showError(
        'Ceci est un test d\'erreur',
        'Détails techniques du test'
      );
    }}>
      Tester le popup d'erreur
    </button>
  );
}
```

### Tester la copie du message

1. Déclencher une erreur
2. Cliquer sur "Copier l'erreur"
3. Vérifier que le message "Copié !" apparaît
4. Coller dans un éditeur de texte pour vérifier le contenu

## Support et maintenance

Pour toute question ou problème avec le système de gestion des erreurs :

1. Vérifier que ErrorProvider enveloppe bien l'application dans App.tsx
2. Vérifier que le composant utilise useErrorHandler correctement
3. Consulter la console pour les erreurs de fallback
4. Contacter l'équipe de développement

---

**Version:** 1.0  
**Date:** Février 2026  
**Plateforme:** IBANSYS - Société le Monde Informatique
