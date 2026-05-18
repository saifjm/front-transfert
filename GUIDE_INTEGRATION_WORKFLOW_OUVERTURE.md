# Guide d'Intégration Frontend : Workflow d'Ouverture (MS-WF)

Ce document détaille les étapes nécessaires pour intégrer le processus d'ouverture (création) d'un dossier AVA via le moteur de workflow centralisé (MS-WF). 

---

## 1. Changement de Paradigme

*   **AVANT** : Le frontend appelait directement l'API métier AVA1 (ex: `POST /api/dossiers/ouverture`).
*   **MAINTENANT** : Le frontend interagit **uniquement avec MS-WF**. C'est le moteur de workflow qui orchestre la création en mode "brouillon" (Saisie) puis la validation définitive par un superviseur.

### Headers requis pour toutes les requêtes MS-WF
Pour garantir la séparation des tâches (SoD) et l'assignation correcte, les headers suivants doivent être inclus :
*   `X-User-Id` : L'ID de l'utilisateur connecté (requis)
*   `X-Role-Code` : Le rôle de l'utilisateur (`AGENT_SAISIE`, `SUPERVISEUR`, etc.)
*   `X-Org-Node-Id` : L'ID de l'agence (optionnel mais recommandé)

---

## 2. Étape 1 : Saisie et Création (Par l'Agent)

Lorsqu'un agent initie un nouveau dossier, il n'y a pas encore de `businessKey` (numéro de dossier). On utilise donc l'API de **démarrage (start)** d'une nouvelle opération.

**Endpoint MS-WF :**
`POST /api/wf/operations/AVA_OUVERTURE/start`
*(Note : Remplacez `AVA_OUVERTURE` par la clé d'opération exacte configurée côté MS-WF, par exemple `operations_agence_service_central` si applicable).*

**Exemple de requête :**

```typescript
const startOuverture = async (formData: any, comment: string) => {
  const url = `http://<API_GATEWAY>/api/wf/operations/AVA_OUVERTURE/start`;
  
  const payload = {
    // Le payload métier complet nécessaire à la création du dossier
    payload: formData,
    // Commentaire de l'agent
    comment: comment
  };

  const headers = {
    'X-User-Id': currentUser.id,
    'X-Role-Code': currentUser.role, // ex: 'AGENT_SAISIE'
    'Content-Type': 'application/json'
  };

  const response = await axios.post(url, payload, { headers });
  // La réponse devrait contenir le processInstanceId et potentiellement la businessKey générée
  return response.data;
};
```
*Action : Le workflow démarre, MS-WF contacte AVA1 pour créer le dossier avec `finalize=false`, et la tâche passe à l'étape de VALIDATION.*

---

## 3. Étape 2 : Récupérer les tâches en attente (Dashboard Superviseur)

Le superviseur consulte la liste des dossiers d'ouverture en attente de sa validation.

**Endpoint MS-WF :**
`GET /api/wf/tasks?operationKey=AVA_OUVERTURE`

**Exemple de requête :**

```typescript
const getPendingOuvertures = async (page = 0, size = 20) => {
  const url = `http://<API_GATEWAY>/api/wf/tasks?operationKey=AVA_OUVERTURE&page=${page}&size=${size}`;
  
  const headers = {
    'X-User-Id': currentUser.id,
    'X-Role-Code': currentUser.role // ex: 'SUPERVISEUR'
  };

  const response = await axios.get(url, { headers });
  // Contient la liste des tâches { taskId, businessKey, createTime, ... }
  return response.data;
};
```

---

## 4. Étape 3 : Prise en charge de la tâche (Claim)

Avant de rendre sa décision, le superviseur s'assigne la tâche.

**Endpoint MS-WF :**
`POST /api/wf/tasks/{taskId}/claim`

**Exemple :**
```typescript
const claimTask = async (taskId: string) => {
  const url = `http://<API_GATEWAY>/api/wf/tasks/${taskId}/claim`;
  
  await axios.post(url, {}, {
    headers: { 'X-User-Id': currentUser.id }
  });
};
```

---

## 5. Étape 4 : Valider ou Rejeter (Par le Superviseur)

Le superviseur examine les données de l'ouverture et décide d'approuver ou de rejeter le dossier. L'ID du dossier créé (businessKey) est maintenant utilisé.

**Endpoint MS-WF :**
`POST /api/wf/operations/AVA_OUVERTURE/{businessKey}/decide/{decisionTag}`

*   `businessKey` : L'ID du dossier (souvent retourné via l'endpoint de tâches).
*   `decisionTag` : `APPROUVER` ou `REJETER`.

**Exemple : Approbation**
```typescript
const approveOuverture = async (businessKey: string, formData: any, comment: string) => {
  const url = `http://<API_GATEWAY>/api/wf/operations/AVA_OUVERTURE/${businessKey}/decide/APPROUVER`;
  
  const payload = {
    // Si nécessaire, on peut repasser le payload ou des modifications
    payload: formData,
    comment: comment
  };

  const response = await axios.post(url, payload, {
    headers: {
      'X-User-Id': currentUser.id,
      'X-Role-Code': currentUser.role // 'SUPERVISEUR'
    }
  });
  
  return response.data;
};
```
*Si `APPROUVER` est appelé, MS-WF informera AVA1 pour finaliser (`finalize=true`) le dossier d'ouverture.*

---

## Gestion des erreurs à prévoir

1. **Erreurs JSON/500 (comme mentionné dans vos logs précédents)** : Assurez-vous que l'URL construite `businessKey` est correctement formatée et non l'alias de l'opération parente. (ex: `/decide/APPROUVER` doit cibler un dossier précis comme `1234` et non `operations_agence_service_central` en tant qu'ID).
2. **Droits / 403** : Vérifiez que les Headers (`X-Role-Code` et `X-User-Id`) correspondent aux politiques MS-WF pour l'action appelée.
3. **Erreurs métier 400 (Validation AVA1)** : MS-WF relaiera les erreurs métiers bloquantes retournées par AVA1.
