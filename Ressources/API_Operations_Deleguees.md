# API Operations Déléguées - Liste des Dossiers

## API Endpoint

**URL**: `GET /api/operations-deleguees`  
**Description**: Récupère la liste de toutes les opérations déléguées (dossiers) enregistrées dans le système AVA.  
**Méthode**: GET  
**Content-Type**: application/json  

### Réponse
- **Status Code**: 200 OK  
- **Body**: Array of `OuvertureDossierDTO`  

Exemple de réponse :
```json
[
  {
    "numDossier": 123456,
    "typeDossierAva": 1,
    "dateDossier": "2026-04-08",
    "codeAgence": 123,
    "noPieceClient": "CLIENT001",
    "numeroCompte": "ACC123456",
    // ... autres champs
  }
]
```

## Champs à Récupérer

Pour chaque opération déléguée, extraire les champs suivants :

- **Code Agence**: `codeAgence` (Short)  
- **Agence**: Nom de l'agence (à récupérer via API externe ou mapping interne si disponible)  
- **Type Dossier**: `typeDossierAva` (Integer)  
- **Numéro Dossier**: `numDossier` (Integer)  
- **Date Dossier**: `dateDossier` (LocalDate, format "dd/MM/yyyy")  
- **N° Pièce Client**: `noPieceClient` (String)  
- **Client**: Nom du client (à récupérer via API externe ou mapping interne si disponible)  

## Intégration des Données dans React

### 1. Configuration de l'API
Utilisez Axios ou Fetch pour appeler l'API :

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api'; // Adapter selon votre environnement

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### 2. Fetcher les Données
Utilisez un hook ou une fonction pour récupérer la liste :

```javascript
const fetchOperationsDeleguees = async () => {
  try {
    const response = await apiClient.get('/operations-deleguees');
    return response.data; // Array of operations
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    throw error;
  }
};
```

### 3. Intégration dans un Hook ou Composant
Appelez `fetchOperationsDeleguees()` pour obtenir les données. Parcourez le tableau pour extraire les champs requis (codeAgence, agence, typeDossierAva, numDossier, dateDossier, noPieceClient, client).

Pour les champs supplémentaires comme "Agence" et "Client", effectuez des appels API externes si nécessaire :
- Pour "Agence" : `apiClient.get('/ref/agences/' + codeAgence)` pour obtenir le nom.
- Pour "Client" : `apiClient.get('/ref/clients/' + noPieceClient)` pour obtenir le nom.

Formatez la date avec `new Date(dateDossier).toLocaleDateString('fr-FR')`.

### 4. Gestion d'Erreurs
Gérez les erreurs réseau lors des appels API.

## Notes
- Assurez-vous que le backend est accessible depuis le frontend (CORS configuré).  
- Les dates sont au format ISO (yyyy-MM-dd), formatez-les pour l'affichage.  
- Pour les environnements de prod, remplacez `localhost:8080` par l'URL appropriée.