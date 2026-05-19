# Guide d'Intégration Frontend - Clôture d'un Dossier (Microservice AVA1)

Ce document décrit comment l'application Web/App Frontend doit intégrer l'endpoint de clôture de dossier pour l'API AVA1.

---

## 1. Description Globale de l'Action

- **Cas d'usage** : L'utilisateur souhaite clôturer un dossier (`Dossier` / `OperationsDeleguee`).
- **Endpoint HTTP** : `POST /api/cloture/{numDossier}/{finalize}`
- **Concept "Finalize"** : L'API prend en compte le format `FinalizeFlag`. 
    - `false` : Ne fait que tester les règles métiers (simulation / mode "brouillon"). Utile pour vérifier si le DTO est complet.
    - `true` : **Exécute l'action définitivement** et persiste en base de données.

---

## 2. Définition de l'URL et du Payload (JSON)

**Méthode** : `POST`  
**Path (URI)** : `/api/cloture/{numDossier}/{finalize}`  
**Content-Type** : `application/json`

### Path Parameters

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `numDossier` | `number` | Oui | L'ID primaire de `OperationsDeleguee` à clôturer |
| `finalize` | `boolean` | Oui | Valider (`true`) ou tester (`false`) les règles de gestion |

### Request Body: `ClotureDTO`

Voici le JSON attendu en corps de la requête.

```json
{
  "motif": "Demande de l'exportateur",  // (Obligatoire) String : Le motif de clôture
  "dateCloture": "2026-04-15",          // (Obligatoire) Format YYYY-MM-DD
  "reference": "REF-89028",             // (Obligatoire) String : La référence
  "observations": "Pas de reliquat."    // (Optionnel) String : Un commentaire libre
}
```

**Règles de validation Frontend (Formulaire UI)** :
1. Le champ `motif` ne doit pas être nul ou vide (`NotBlank`).
2. Le champ `dateCloture` doit obligatoirement être renseigné.
3. Le champ `reference` ne doit pas être nul ni vide (`NotBlank`).

---

## 3. Comportements des Codes HTTP attendus (Réponses)

### Succès (200 OK)
L'API retournera un objet complexe **OuvertureDossierDTO** (qui correspond au dossier mis à jour).
L'*UI Frontend* peut par exemple rafraîchir son tableau de bord avec les nouvelles données du dossier.

### Formulaire Invalide (422 Unprocessable Entity ou 400 Bad Request)
- Se produit si le JSON manque d'attributs (comme le Motif/Reference manquants).
- Message attendu (dans l'objet d'erreur) :  
  `"VALIDATION_ERROR: motif : Le motif est obligatoire..."`
- Comportement Frontend attendu : Afficher les erreurs rouges sur le formulaire de l'utilisateur.

### Erreurs "Business" (422 Unprocessable Entity ou 409 Conflict)
- Se produit à cause de violations de règles métiers (ex: `L'état du dossier est "C" => Déjà clôturé`).
- Message attendu : Les messages précis du métier ex: *"Le dossier portant le numDossier: 1234 est déjà C"*
- Comportement Frontend attendu : Afficher une Modal ou un Toast (Snack-bar) d'alerte pour bloquer l'utilisateur.

### Introuvable (404 Not Found)
- Message : *"Operation déléguée non trouvée..."*
- Comportement Frontend attendu : Rediriger l'utilisateur vers la page principale de la liste d'attente/dossiers.