import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, Bug, Network, Database, Code } from 'lucide-react';
import { useErrorHandler } from './ErrorContext';
import { showTechnicalError, apiCall } from '../utils';

/**
 * Composant de test pour le système de gestion des erreurs
 * À utiliser pour tester les différents scénarios d'erreur
 */
export function ErrorTestComponent() {
  const { showError } = useErrorHandler();

  const testErrorSimple = () => {
    showError('Erreur de test simple');
  };

  const testErrorAvecDetails = () => {
    showError(
      'Erreur lors du chargement des données',
      `URL: /api/test/data
Méthode: GET
Statut: 500
Message: Internal Server Error
Timestamp: ${new Date().toISOString()}`
    );
  };

  const testErrorReseau = () => {
    showTechnicalError(
      'Erreur de connexion au serveur',
      `Type: NetworkError
URL: https://api.ibansys.com/dossiers
Message: Failed to fetch
Code: ERR_NETWORK_FAILURE
Stack trace:
  at fetch (browser-api.js:123)
  at loadDossiers (AVAForm.tsx:456)
  at onClick (Button.tsx:89)`
    );
  };

  const testErrorAPI = async () => {
    // Tester avec une URL qui n'existe pas
    const { data, error } = await apiCall('/api/test/inexistant');
    
    if (error) {
      console.log('L\'erreur a été affichée automatiquement');
    }
  };

  const testErrorParsing = () => {
    showTechnicalError(
      'Erreur de parsing JSON',
      `Données reçues: {invalid json format
Position: ligne 1, colonne 23
Erreur: Unexpected token 'i'
Content-Type: application/json
URL: /api/dossier/12345`
    );
  };

  const testErrorMetier = () => {
    showTechnicalError(
      'Validation RNE échouée',
      `Règle: Solde insuffisant
Montant demandé: 15000.000 TND
Solde disponible: 12500.000 TND
Dossier: AVA-2024-001234
Client: SOCIETE EXEMPLE SARL
Date: ${new Date().toLocaleDateString('fr-FR')}`
    );
  };

  const testErrorLongMessage = () => {
    const longDetails = `
=== INFORMATIONS DE CONTEXTE ===
Utilisateur: admin@ibansys.com
Session ID: 8a7b6c5d-4e3f-2g1h-0i9j-8k7l6m5n4o3p
Timestamp: ${new Date().toISOString()}
Module: Mise à jour Bénéficiaires
Action: Sauvegarde

=== ÉTAT DE L'APPLICATION ===
Dossier sélectionné: AVA-2024-001234
Type de dossier: Voyage d'affaires
Montant autorisé: 50000.000 TND
Montant utilisé: 35000.000 TND
Solde: 15000.000 TND

=== DONNÉES DU FORMULAIRE ===
Nombre de bénéficiaires: 3
Bénéficiaire 1: {
  type: "Passeport",
  numero: "P12345678",
  nom: "DUPONT Jean",
  adresse: "123 Rue de la Paix, Tunis"
}
Bénéficiaire 2: {
  type: "CIN",
  numero: "01234567",
  nom: "MARTIN Marie",
  adresse: "456 Avenue Habib Bourguiba, Sfax"
}

=== ERREUR TECHNIQUE ===
Type: DatabaseException
Message: Timeout during database operation
Code: DB_TIMEOUT_ERROR
Query: UPDATE t_beneficiaires_ava SET etat='A' WHERE id_dossier=?
Duration: 30000ms (timeout à 30s)
Connection pool: 8/10 actives

=== STACK TRACE ===
DatabaseException: Timeout during database operation
    at DatabaseConnection.executeQuery (db.js:234)
    at BeneficiairesRepository.updateBeneficiaires (repository.ts:567)
    at BeneficiairesService.saveBeneficiaires (service.ts:123)
    at AVAMiseAJourBeneficiaires.handleSubmit (AVAMiseAJourBeneficiaires.tsx:890)
    at onClick (Button.tsx:45)

=== RECOMMANDATIONS ===
1. Vérifier la connexion à la base de données
2. Consulter les logs serveur pour plus de détails
3. Contacter l'administrateur système si le problème persiste
4. Réessayer l'opération dans quelques minutes
`;

    showTechnicalError(
      'Erreur de base de données - Timeout',
      longDetails
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bug className="w-8 h-8 text-[#435B7B]" />
            <div>
              <CardTitle>Test du Système de Gestion des Erreurs</CardTitle>
              <CardDescription>
                Cliquez sur les boutons ci-dessous pour tester différents scénarios d'erreur
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tests basiques */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tests basiques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={testErrorSimple}
                variant="outline"
                className="justify-start"
              >
                <Bug className="w-4 h-4 mr-2" />
                Erreur simple
              </Button>
              <Button
                onClick={testErrorAvecDetails}
                variant="outline"
                className="justify-start"
              >
                <Code className="w-4 h-4 mr-2" />
                Erreur avec détails
              </Button>
            </div>
          </div>

          {/* Tests erreurs réseau/API */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Network className="w-4 h-4" />
              Erreurs réseau et API
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={testErrorReseau}
                variant="outline"
                className="justify-start"
              >
                <Network className="w-4 h-4 mr-2" />
                Erreur réseau
              </Button>
              <Button
                onClick={testErrorAPI}
                variant="outline"
                className="justify-start"
              >
                <Database className="w-4 h-4 mr-2" />
                Erreur API (vraie requête)
              </Button>
              <Button
                onClick={testErrorParsing}
                variant="outline"
                className="justify-start"
              >
                <Code className="w-4 h-4 mr-2" />
                Erreur parsing JSON
              </Button>
            </div>
          </div>

          {/* Tests erreurs métier */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Erreurs métier et base de données
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={testErrorMetier}
                variant="outline"
                className="justify-start"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Erreur validation métier
              </Button>
              <Button
                onClick={testErrorLongMessage}
                variant="outline"
                className="justify-start"
              >
                <Database className="w-4 h-4 mr-2" />
                Erreur avec message long
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-sm text-blue-900 mb-2">
              Instructions d'utilisation
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Chaque bouton déclenche un type d'erreur différent</li>
              <li>Le popup d'erreur s'affiche automatiquement</li>
              <li>Testez le bouton "Copier l'erreur" pour vérifier le presse-papier</li>
              <li>Vérifiez que le message complet est bien copié (message + détails)</li>
              <li>Ce composant est uniquement pour les tests (à retirer en production)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Documentation rapide */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisation dans le code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Option 1: Hook useErrorHandler</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`const { showError } = useErrorHandler();

showError(
  'Message d\\'erreur',
  'Détails techniques optionnels'
);`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Option 2: Fonction globale</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`import { showTechnicalError } from '../utils';

showTechnicalError(
  'Message d\\'erreur',
  'Détails techniques'
);`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Option 3: Wrapper API</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`import { apiCall } from '../utils';

const { data, error } = await apiCall('/api/endpoint');
if (error) {
  // L'erreur a déjà été affichée
  return mockData;
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
