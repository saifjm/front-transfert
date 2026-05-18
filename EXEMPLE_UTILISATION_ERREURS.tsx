/**
 * EXEMPLES D'UTILISATION DU SYSTÈME DE GESTION DES ERREURS
 * 
 * Ce fichier montre comment utiliser le système de gestion des erreurs techniques
 * dans différents scénarios courants de l'application IBANSYS.
 */

import React, { useState } from 'react';
import { useErrorHandler } from './components/ErrorContext';
import { showTechnicalError, apiCall } from './utils';

// ==========================================
// EXEMPLE 1: Utiliser le hook dans un composant
// ==========================================

export function ExempleHookComponent() {
  const { showError } = useErrorHandler();

  const handleSave = async () => {
    try {
      // Tentative d'opération risquée
      const result = await saveDossier();
      
      if (!result.success) {
        // Afficher l'erreur technique
        showError(
          'Erreur lors de la sauvegarde du dossier',
          `Code erreur: ${result.errorCode}\nMessage: ${result.message}`
        );
      }
    } catch (error) {
      // Erreur inattendue
      showError(
        'Erreur inattendue lors de la sauvegarde',
        error instanceof Error ? error.stack : 'Erreur inconnue'
      );
    }
  };

  return <button onClick={handleSave}>Sauvegarder</button>;
}

// ==========================================
// EXEMPLE 2: Utiliser la fonction globale (hors composant React)
// ==========================================

export async function processData(data: any) {
  try {
    // Validation des données
    if (!validateData(data)) {
      showTechnicalError(
        'Données invalides',
        `Structure reçue: ${JSON.stringify(data)}\nValidation échouée`
      );
      return null;
    }

    // Traitement
    return transformData(data);
  } catch (error) {
    showTechnicalError(
      'Erreur lors du traitement des données',
      `Données: ${JSON.stringify(data)}\nErreur: ${error instanceof Error ? error.message : 'Inconnue'}`
    );
    return null;
  }
}

// ==========================================
// EXEMPLE 3: Utiliser apiCall pour les appels API
// ==========================================

export async function loadDossierAVA(dossierId: string) {
  // La gestion d'erreur est automatique
  const { data, error } = await apiCall<DossierAVA>(
    `/api/ava/dossier/${dossierId}`,
    { method: 'GET' }
  );

  if (error) {
    // L'erreur a déjà été affichée à l'utilisateur
    // Retourner des données mock en fallback
    return MOCK_DOSSIER;
  }

  return data;
}

// ==========================================
// EXEMPLE 4: Appel API avec POST et données
// ==========================================

export async function saveBeneficiaires(dossier: string, beneficiaires: any[]) {
  const { data, error } = await apiCall(
    '/api/ava/beneficiaires',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dossierId: dossier,
        beneficiaires: beneficiaires,
      }),
    }
  );

  if (error) {
    // L'erreur est déjà affichée
    // On peut ajouter des actions supplémentaires ici
    console.log('Sauvegarde échouée, passage en mode mock');
    return { success: false };
  }

  return { success: true, data };
}

// ==========================================
// EXEMPLE 5: Désactiver le popup pour certains appels
// ==========================================

export async function checkServerHealth() {
  // Appel silencieux sans popup d'erreur
  const { data, error } = await apiCall(
    '/api/health',
    { method: 'GET' },
    false // showErrorPopup = false
  );

  if (error) {
    // Gérer l'erreur manuellement sans popup
    console.warn('Le serveur ne répond pas');
    return { online: false };
  }

  return { online: true, status: data };
}

// ==========================================
// EXEMPLE 6: Gestion d'erreur dans un formulaire
// ==========================================

export function ExempleFormComponent() {
  const { showError } = useErrorHandler();
  const [formData, setFormData] = useState({
    montant: '',
    beneficiaire: '',
  });

  const validateForm = () => {
    if (!formData.montant || !formData.beneficiaire) {
      // Ceci est une ERREUR MÉTIER, ne PAS utiliser showError
      // Utiliser un toast ou un message d'erreur dans le formulaire
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return; // Erreur métier gérée dans le formulaire
    }

    try {
      // Opération technique qui peut échouer
      const result = await submitForm(formData);
      
      if (!result.success) {
        // ERREUR TECHNIQUE - utiliser showError
        showError(
          'Erreur lors de la soumission du formulaire',
          `Données: ${JSON.stringify(formData)}\nErreur serveur: ${result.message}`
        );
      }
    } catch (error) {
      // ERREUR TECHNIQUE - utiliser showError
      showError(
        'Erreur inattendue lors de la soumission',
        error instanceof Error ? error.stack : 'Erreur inconnue'
      );
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input
        value={formData.montant}
        onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
      />
      <button type="submit">Soumettre</button>
    </form>
  );
}

// ==========================================
// EXEMPLE 7: Validation métier vs erreur technique
// ==========================================

export function ExempleValidationComponent() {
  const { showError } = useErrorHandler();
  const [errorMessage, setErrorMessage] = useState('');

  const validateMontant = (montant: number, solde: number) => {
    try {
      // VALIDATION MÉTIER - utiliser un état local
      if (montant <= 0) {
        setErrorMessage('Le montant doit être positif');
        return false;
      }

      if (montant > solde) {
        setErrorMessage(`Le montant ne peut pas dépasser le solde (${solde.toFixed(3)} TND)`);
        return false;
      }

      // CALCUL COMPLEXE qui peut échouer techniquement
      const result = calculRNE(montant, solde);
      
      if (!result.success) {
        // ERREUR TECHNIQUE dans le calcul
        showError(
          'Erreur lors du calcul RNE',
          `Montant: ${montant}\nSolde: ${solde}\nErreur: ${result.error}`
        );
        return false;
      }

      return true;
    } catch (error) {
      // ERREUR TECHNIQUE inattendue
      showError(
        'Erreur lors de la validation du montant',
        `Montant: ${montant}, Solde: ${solde}\nErreur: ${error instanceof Error ? error.message : 'Inconnue'}`
      );
      return false;
    }
  };

  return (
    <div>
      {errorMessage && <div className="error">{errorMessage}</div>}
      {/* ... formulaire ... */}
    </div>
  );
}

// ==========================================
// EXEMPLE 8: Gestion d'erreur dans un useEffect
// ==========================================

export function ExempleEffectComponent() {
  const { showError } = useErrorHandler();
  const [data, setData] = useState(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const { data, error } = await apiCall('/api/data');
        
        if (error) {
          // L'erreur est déjà affichée
          // Utiliser des données mock
          setData(MOCK_DATA);
          return;
        }

        setData(data);
      } catch (error) {
        // Erreur inattendue
        showError(
          'Erreur lors du chargement des données',
          error instanceof Error ? error.message : 'Erreur inconnue'
        );
        setData(MOCK_DATA);
      }
    };

    loadData();
  }, [showError]);

  return <div>{/* ... affichage des données ... */}</div>;
}

// ==========================================
// EXEMPLE 9: Erreur avec détails très complets
// ==========================================

export async function complexOperation(params: any) {
  try {
    const result = await performOperation(params);
    return result;
  } catch (error) {
    // Construire un message d'erreur détaillé
    const errorDetails = `
=== CONTEXTE ===
Utilisateur: ${getCurrentUser()}
Timestamp: ${new Date().toISOString()}
Module: Opération complexe

=== PARAMÈTRES ===
${JSON.stringify(params, null, 2)}

=== ERREUR ===
Type: ${error instanceof Error ? error.name : 'Unknown'}
Message: ${error instanceof Error ? error.message : 'Erreur inconnue'}
Stack: ${error instanceof Error ? error.stack : 'N/A'}

=== RECOMMANDATIONS ===
1. Vérifier les paramètres fournis
2. Consulter les logs serveur
3. Contacter le support technique si le problème persiste
    `.trim();

    showTechnicalError(
      'Erreur lors de l\'opération complexe',
      errorDetails
    );

    return null;
  }
}

// ==========================================
// FONCTIONS UTILITAIRES (exemples)
// ==========================================

function validateData(data: any): boolean {
  return true; // Exemple
}

function transformData(data: any): any {
  return data; // Exemple
}

async function saveDossier() {
  return { success: true }; // Exemple
}

async function submitForm(data: any) {
  return { success: true }; // Exemple
}

function calculRNE(montant: number, solde: number) {
  return { success: true }; // Exemple
}

async function performOperation(params: any) {
  return {}; // Exemple
}

function getCurrentUser() {
  return 'admin@ibansys.com'; // Exemple
}

interface DossierAVA {
  id: string;
  numero: string;
}

const MOCK_DOSSIER: DossierAVA = {
  id: '1',
  numero: 'AVA-2024-001234',
};

const MOCK_DATA = {
  items: [],
};

// ==========================================
// RÉSUMÉ DES BONNES PRATIQUES
// ==========================================

/**
 * QUAND UTILISER showError / showTechnicalError :
 * ✅ Erreurs réseau (fetch échoue)
 * ✅ Erreurs HTTP (404, 500, etc.)
 * ✅ Erreurs de parsing JSON
 * ✅ Erreurs de base de données
 * ✅ Erreurs inattendues (catch dans try/catch)
 * ✅ Timeout de requêtes
 * ✅ Erreurs de calcul complexes
 * 
 * QUAND NE PAS UTILISER :
 * ❌ Validation de formulaire (utiliser des messages d'erreur locaux)
 * ❌ Champs obligatoires manquants
 * ❌ Format de données invalide (email, téléphone, etc.)
 * ❌ Règles métier non respectées
 * ❌ Erreurs de saisie utilisateur
 * 
 * DIFFÉRENCE ERREUR MÉTIER vs ERREUR TECHNIQUE :
 * 
 * ERREUR MÉTIER :
 * - L'utilisateur peut la corriger
 * - Résulte d'une saisie ou d'un choix de l'utilisateur
 * - Exemple: "Le montant dépasse le solde"
 * - Afficher dans le formulaire avec toast ou message local
 * 
 * ERREUR TECHNIQUE :
 * - L'utilisateur ne peut PAS la corriger
 * - Résulte d'un problème système/serveur
 * - Exemple: "Impossible de se connecter au serveur"
 * - Afficher avec le popup d'erreur technique
 */
