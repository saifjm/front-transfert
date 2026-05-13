# Workflow Integration Guide — Rétrocession (RC)

Ce guide détaille les étapes exactes pour intégrer le moteur de workflow (MSWF) dans l'opération de **Rétrocession** (`AVARetrocession.tsx`), en suivant le modèle standard à 2 nœuds (Saisie Agence ➔ Service Central).

---

## Étape 1 — Base de données (Schéma MSWF)

Exécutez ce script SQL pour enregistrer l'opération de Rétrocession et son flux dans la base de données du workflow.

```sql
-- 1. Register the operation
INSERT INTO MSWF.WF_DEFINITION (WF_DEF_ID, OPERATION_KEY, VERSION, ACTIVE, LABEL, BASE_URL, ENDPOINT_TEMPLATE, HTTP_METHOD, RESP_BK_PATH, PAYLOAD_BK_FIELD)
VALUES (SEQ_WF_DEFINITION.NEXTVAL, 'operations_retrocession', 1, 1, 'Rétrocession (RC)', 'http://localhost:8080', '/api/operations-rc?finalize={finalize}', 'POST', '$.refOperation', NULL);

-- 2. Nodes
INSERT INTO MSWF.WF_NODE (NODE_ID, WF_DEF_ID, NODE_KEY, LABEL, NODE_TYPE, FINALIZE_POLICY, CLAIM_ENABLED)
VALUES (SEQ_WF_NODE.NEXTVAL, (SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession'), 'SAISIE_AGENCE', 'Saisie Agence', 'HUMAN', 'BY_DECISION', 0);

INSERT INTO MSWF.WF_NODE (NODE_ID, WF_DEF_ID, NODE_KEY, LABEL, NODE_TYPE, FINALIZE_POLICY, CLAIM_ENABLED)
VALUES (SEQ_WF_NODE.NEXTVAL, (SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession'), 'SERVICE_CENTRAL', 'Service Central', 'HUMAN', 'BY_DECISION', 0);

-- 3. Decisions
INSERT INTO MSWF.WF_DECISION (DECISION_ID, NODE_ID, TAG, LABEL, BEHAVIOR, REQUIRES_COMMENT, SOD_MODE)
VALUES (SEQ_WF_DECISION.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SAISIE_AGENCE' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession')),
  'SOUMETTRE', 'Soumettre', 'GO_TO_NODE', 0, 'DEFAULT');

INSERT INTO MSWF.WF_DECISION (DECISION_ID, NODE_ID, TAG, LABEL, BEHAVIOR, REQUIRES_COMMENT, SOD_MODE)
VALUES (SEQ_WF_DECISION.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SERVICE_CENTRAL' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession')),
  'APPROUVER', 'Approuver', 'END_PROCESS', 0, 'DEFAULT');

INSERT INTO MSWF.WF_DECISION (DECISION_ID, NODE_ID, TAG, LABEL, BEHAVIOR, REQUIRES_COMMENT, SOD_MODE)
VALUES (SEQ_WF_DECISION.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SERVICE_CENTRAL' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession')),
  'RETOUR_AGENCE', 'Retour Agence', 'GO_TO_NODE', 1, 'DEFAULT');

-- 4. Transition rules
INSERT INTO MSWF.WF_TRANSITION_RULE (RULE_ID, DECISION_ID, PRIORITY, CONDITION_EXPR, TARGET_NODE_KEY, FINALIZE, WF_FINALIZE)
VALUES (SEQ_WF_TRANSITION_RULE.NEXTVAL,
  (SELECT D.DECISION_ID FROM MSWF.WF_DECISION D JOIN MSWF.WF_NODE N ON D.NODE_ID=N.NODE_ID WHERE D.TAG='SOUMETTRE' AND N.NODE_KEY='SAISIE_AGENCE' AND N.WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession')),
  1, NULL, 'SERVICE_CENTRAL', 0, 1);

INSERT INTO MSWF.WF_TRANSITION_RULE (RULE_ID, DECISION_ID, PRIORITY, CONDITION_EXPR, TARGET_NODE_KEY, FINALIZE, WF_FINALIZE)
VALUES (SEQ_WF_TRANSITION_RULE.NEXTVAL,
  (SELECT D.DECISION_ID FROM MSWF.WF_DECISION D JOIN MSWF.WF_NODE N ON D.NODE_ID=N.NODE_ID WHERE D.TAG='APPROUVER' AND N.NODE_KEY='SERVICE_CENTRAL' AND N.WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession')),
  1, NULL, NULL, 1, 1);

INSERT INTO MSWF.WF_TRANSITION_RULE (RULE_ID, DECISION_ID, PRIORITY, CONDITION_EXPR, TARGET_NODE_KEY, FINALIZE, WF_FINALIZE)
VALUES (SEQ_WF_TRANSITION_RULE.NEXTVAL,
  (SELECT D.DECISION_ID FROM MSWF.WF_DECISION D JOIN MSWF.WF_NODE N ON D.NODE_ID=N.NODE_ID WHERE D.TAG='RETOUR_AGENCE' AND N.NODE_KEY='SERVICE_CENTRAL' AND N.WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession')),
  1, NULL, 'SAISIE_AGENCE', 0, 0);

-- 5. Assignment rules
INSERT INTO MSWF.WF_ASSIGNMENT_RULE (ASSIGN_RULE_ID, NODE_ID, PRIORITY, CONDITION_EXPR, CANDIDATE_ROLE_CODE, CANDIDATE_USER_ID)
VALUES (SEQ_WF_ASSIGNMENT_RULE.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SAISIE_AGENCE' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession')),
  1, NULL, 'AGENT', NULL);

INSERT INTO MSWF.WF_ASSIGNMENT_RULE (ASSIGN_RULE_ID, NODE_ID, PRIORITY, CONDITION_EXPR, CANDIDATE_ROLE_CODE, CANDIDATE_USER_ID)
VALUES (SEQ_WF_ASSIGNMENT_RULE.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SERVICE_CENTRAL' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='operations_retrocession')),
  1, NULL, 'ADMIN', NULL);
```

> [!IMPORTANT]
> N'oubliez pas de redémarrer le moteur de workflow après avoir inséré ces données pour qu'elles soient prises en compte.

---

## Étape 2 — Mise à jour de `utils/workflowApi.ts`

Ajoutez les fonctions d'appel au workflow pour l'opération de Rétrocession à la fin du fichier `src/utils/workflowApi.ts`.

```typescript
export const WF_RC_OPERATION_KEY = 'operations_retrocession';

export async function startRcDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await authenticatedFetch(
    `/api/wf/operations/${WF_RC_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continueRcDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await authenticatedFetch(
    `/api/wf/operations/${WF_RC_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}
```

---

## Étape 3 — Intégration dans le composant `AVARetrocession.tsx`

### A. Importer les fonctions workflow

En haut de `AVARetrocession.tsx`, ajoutez l'importation (ajustez le chemin si nécessaire) :

```typescript
import { startRcDecision, continueRcDecision } from '../utils/workflowApi';
```

### B. Ajouter l'état pour la Business Key Workflow

Dans le composant `AVARetrocession`, ajoutez le state `wfRcBusinessKey` avec les autres states (vers la ligne 117) :

```typescript
const [wfRcBusinessKey, setWfRcBusinessKey] = useState<string | null>(null);
```

Réinitialisez cette clé lorsqu'un autre dossier est sélectionné (dans `handleSelectDossier` et `handleRetourRecherche`) :

```typescript
  const handleSelectDossier = (dossier: DossierAVA) => {
    setWfRcBusinessKey(null); // ← Ligne à ajouter
    // ... reste du code existant
```

```typescript
  const handleRetourRecherche = () => {
    // ...
    setWfRcBusinessKey(null); // ← Ligne à ajouter
    // ... reste du code existant
```

```typescript
  const handleCloseDialog = () => {
    // ...
    setWfRcBusinessKey(null); // ← Ligne à ajouter
    // ... reste du code existant
```

### C. Remplacer les appels API directs par les appels Workflow

Dans `AVARetrocession.tsx`, il y a deux fonctions de soumission : `handleSubmit` et `handleSubmitDialog`.
Remplacez l'appel `authenticatedFetch` dans ces deux endroits par la logique ci-dessous.

**Avant (Existant) :**
```typescript
      const response = await authenticatedFetch('/api/operations-rc?finalize=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // ...
        toast.success('Rétrocession enregistrée avec succès', { ... });
```

**Après (Avec Workflow pour `handleSubmit`) :**
```typescript
      toast.info('Soumission au Service Central...', { description: 'Communication avec le moteur de workflow...' });

      const wfResponse = wfRcBusinessKey
        ? await continueRcDecision(wfRcBusinessKey, 'SOUMETTRE', payload as unknown as Record<string, unknown>)
        : await startRcDecision('SOUMETTRE', payload as unknown as Record<string, unknown>);

      if (wfResponse.result === 'OK') {
        const newKey = wfResponse.state?.businessKey;
        if (newKey) setWfRcBusinessKey(newKey);
        
        documents.forEach((d) => {
          if (d.cheminFichier) persistedFilePathsRef.current.add(d.cheminFichier);
        });
        skipDraftCleanupRef.current = true;
        
        toast.success('Opération soumise avec succès', {
          description: newKey ? `Référence: ${newKey}` : `Dossier ${dossierSelectionne.numeroDossier} - Type ${retrocession.typeMouvement}`
        });
        
        handleRetourRecherche();
        await fetchDossiers();
      } else if (wfResponse.result === 'REJECTED') {
        toast.error('Opération rejetée', { description: wfResponse.errorMessage });
        setIsSubmitting(false);
        return;
      } else if (wfResponse.result === 'ERROR') {
        toast.error('Erreur workflow', { description: wfResponse.errorMessage });
        setIsSubmitting(false);
        return;
      }
```

**Après (Avec Workflow pour `handleSubmitDialog`) :**
```typescript
      toast.info('Soumission au Service Central...', { description: 'Communication avec le moteur de workflow...' });

      const wfResponse = wfRcBusinessKey
        ? await continueRcDecision(wfRcBusinessKey, 'SOUMETTRE', payload as unknown as Record<string, unknown>)
        : await startRcDecision('SOUMETTRE', payload as unknown as Record<string, unknown>);

      if (wfResponse.result === 'OK') {
        const newKey = wfResponse.state?.businessKey;
        if (newKey) setWfRcBusinessKey(newKey);
        
        documents.forEach((d) => {
          if (d.cheminFichier) persistedFilePathsRef.current.add(d.cheminFichier);
        });
        skipDraftCleanupRef.current = true;
        
        toast.success('Opération soumise avec succès', {
          description: newKey ? `Référence: ${newKey}` : `Dossier ${dossierSelectionne.numeroDossier} - Type ${retrocession.typeMouvement}`
        });
        
        handleCloseDialog();
        await fetchOperations(dossierSelectionne.numeroDossier);
      } else if (wfResponse.result === 'REJECTED') {
        toast.error('Opération rejetée', { description: wfResponse.errorMessage });
        setIsSubmitting(false);
        return;
      } else if (wfResponse.result === 'ERROR') {
        toast.error('Erreur workflow', { description: wfResponse.errorMessage });
        setIsSubmitting(false);
        return;
      }
```

> [!NOTE]
> Appliquez bien ce remplacement dans les deux méthodes : `handleSubmit` (soumission de la vue rétrocession principale) et `handleSubmitDialog` (soumission depuis la popup d'une opération existante).

---

## Liste de vérification de l'intégration

- [ ] Script SQL de Rétrocession exécuté
- [ ] Application Back-end Workflow redémarrée
- [ ] Les fonctions `startRcDecision` et `continueRcDecision` sont dans `workflowApi.ts`
- [ ] L'état `wfRcBusinessKey` a bien été ajouté au composant et se vide correctement
- [ ] Les méthodes de soumission appellent le Workflow au lieu du fetch direct
- [ ] Test effectué : "Soumettre" depuis le Frontend affiche une popup d'info "Soumission au Service Central..." et enregistre le process côté MSWF.
