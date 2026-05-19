# Workflow Integration Guide — AVA Operations

All operations use the **same 2-node flux** as Frais Voyage:

```
SAISIE_AGENCE  →(SOUMETTRE)→  SERVICE_CENTRAL  →(APPROUVER)→  END
                                               →(RETOUR_AGENCE)→  SAISIE_AGENCE
```

---

## Operations Reference

| # | Operation | Component | Submit Endpoint | Response bk field |
|---|-----------|-----------|----------------|-------------------|
| ✅ | Ouverture Dossier | `AVAForm.tsx` | `POST /api/operations-deleguees-mvt/initialisation?finalize={finalize}` | `$.refOperation` |
| ✅ | Frais Voyage (FV) | `AVAFraisVoyage.tsx` | `POST /api/operations-fv?finalize={finalize}` | `$.refOperation` |
| ⬜ | Rétrocession (RC) | `AVARetrocession.tsx` | `POST /api/operations-rc?finalize={finalize}` | `$.refOperation` |
| ⬜ | Réservation | `AVAReservation.tsx` | `POST /api/reservation-operations?finalize={finalize}` | `$.referenceRes` |
| ⬜ | Annulation Réservation | `AVAAnnulationReservation.tsx` | `POST /api/reservation-operations/annulation?finalize={finalize}` | `$.referenceRes` |
| ⬜ | Suspension | `AVASuspension.tsx` | `POST /api/suspension/{finalize}` | `$.numDossier` |
| ⬜ | Levée Suspension | `AVALeveeSuspension.tsx` | `POST /api/levee-suspension/{finalize}` | `$.numDossier` |
| ⬜ | Alimentation BCT | `AVAAlimentationAccordBCT.tsx` | `POST /api/alimentation-bct/{numDossier}/{finalize}` | `$.numDossier` |
| ⬜ | Clôture Dossier | `AVAClotureDossier.tsx` | `POST /api/cloture/{numDossier}/{finalize}` | `$.numDossier` |

---

## For Each Operation: 3 Steps

### Step 1 — Database (MSWF schema)

Replace `{OP_KEY}` and `{ENDPOINT}` for each operation using the table above.

```sql
-- 1. Register the operation
INSERT INTO MSWF.WF_DEFINITION (WF_DEF_ID, OPERATION_KEY, VERSION, ACTIVE, LABEL, BASE_URL, ENDPOINT_TEMPLATE, HTTP_METHOD, RESP_BK_PATH, PAYLOAD_BK_FIELD)
VALUES (SEQ_WF_DEFINITION.NEXTVAL, '{OP_KEY}', 1, 1, '{Label}', 'http://localhost:8080', '{ENDPOINT}', 'POST', '{$.bkField}', NULL);

-- 2. Nodes
INSERT INTO MSWF.WF_NODE (NODE_ID, WF_DEF_ID, NODE_KEY, LABEL, NODE_TYPE, FINALIZE_POLICY, CLAIM_ENABLED)
VALUES (SEQ_WF_NODE.NEXTVAL, (SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}'), 'SAISIE_AGENCE', 'Saisie Agence', 'HUMAN', 'BY_DECISION', 0);

INSERT INTO MSWF.WF_NODE (NODE_ID, WF_DEF_ID, NODE_KEY, LABEL, NODE_TYPE, FINALIZE_POLICY, CLAIM_ENABLED)
VALUES (SEQ_WF_NODE.NEXTVAL, (SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}'), 'SERVICE_CENTRAL', 'Service Central', 'HUMAN', 'BY_DECISION', 0);

-- 3. Decisions
INSERT INTO MSWF.WF_DECISION (DECISION_ID, NODE_ID, TAG, LABEL, BEHAVIOR, REQUIRES_COMMENT, SOD_MODE)
VALUES (SEQ_WF_DECISION.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SAISIE_AGENCE' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}')),
  'SOUMETTRE', 'Soumettre', 'GO_TO_NODE', 0, 'DEFAULT');

INSERT INTO MSWF.WF_DECISION (DECISION_ID, NODE_ID, TAG, LABEL, BEHAVIOR, REQUIRES_COMMENT, SOD_MODE)
VALUES (SEQ_WF_DECISION.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SERVICE_CENTRAL' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}')),
  'APPROUVER', 'Approuver', 'END_PROCESS', 0, 'DEFAULT');

INSERT INTO MSWF.WF_DECISION (DECISION_ID, NODE_ID, TAG, LABEL, BEHAVIOR, REQUIRES_COMMENT, SOD_MODE)
VALUES (SEQ_WF_DECISION.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SERVICE_CENTRAL' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}')),
  'RETOUR_AGENCE', 'Retour Agence', 'GO_TO_NODE', 1, 'DEFAULT');

-- 4. Transition rules
INSERT INTO MSWF.WF_TRANSITION_RULE (RULE_ID, DECISION_ID, PRIORITY, CONDITION_EXPR, TARGET_NODE_KEY, FINALIZE, WF_FINALIZE)
VALUES (SEQ_WF_TRANSITION_RULE.NEXTVAL,
  (SELECT D.DECISION_ID FROM MSWF.WF_DECISION D JOIN MSWF.WF_NODE N ON D.NODE_ID=N.NODE_ID WHERE D.TAG='SOUMETTRE' AND N.NODE_KEY='SAISIE_AGENCE' AND N.WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}')),
  1, NULL, 'SERVICE_CENTRAL', 0, 1);

INSERT INTO MSWF.WF_TRANSITION_RULE (RULE_ID, DECISION_ID, PRIORITY, CONDITION_EXPR, TARGET_NODE_KEY, FINALIZE, WF_FINALIZE)
VALUES (SEQ_WF_TRANSITION_RULE.NEXTVAL,
  (SELECT D.DECISION_ID FROM MSWF.WF_DECISION D JOIN MSWF.WF_NODE N ON D.NODE_ID=N.NODE_ID WHERE D.TAG='APPROUVER' AND N.NODE_KEY='SERVICE_CENTRAL' AND N.WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}')),
  1, NULL, NULL, 1, 1);

INSERT INTO MSWF.WF_TRANSITION_RULE (RULE_ID, DECISION_ID, PRIORITY, CONDITION_EXPR, TARGET_NODE_KEY, FINALIZE, WF_FINALIZE)
VALUES (SEQ_WF_TRANSITION_RULE.NEXTVAL,
  (SELECT D.DECISION_ID FROM MSWF.WF_DECISION D JOIN MSWF.WF_NODE N ON D.NODE_ID=N.NODE_ID WHERE D.TAG='RETOUR_AGENCE' AND N.NODE_KEY='SERVICE_CENTRAL' AND N.WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}')),
  1, NULL, 'SAISIE_AGENCE', 0, 0);

-- 5. Assignment rules (adjust role codes to match your MSWF.ROLE table)
INSERT INTO MSWF.WF_ASSIGNMENT_RULE (ASSIGN_RULE_ID, NODE_ID, PRIORITY, CONDITION_EXPR, CANDIDATE_ROLE_CODE, CANDIDATE_USER_ID)
VALUES (SEQ_WF_ASSIGNMENT_RULE.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SAISIE_AGENCE' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}')),
  1, NULL, 'AGENT', NULL);

INSERT INTO MSWF.WF_ASSIGNMENT_RULE (ASSIGN_RULE_ID, NODE_ID, PRIORITY, CONDITION_EXPR, CANDIDATE_ROLE_CODE, CANDIDATE_USER_ID)
VALUES (SEQ_WF_ASSIGNMENT_RULE.NEXTVAL,
  (SELECT NODE_ID FROM MSWF.WF_NODE WHERE NODE_KEY='SERVICE_CENTRAL' AND WF_DEF_ID=(SELECT WF_DEF_ID FROM MSWF.WF_DEFINITION WHERE OPERATION_KEY='{OP_KEY}')),
  1, NULL, 'ADMIN', NULL);
```

---

### Step 2 — `utils/workflowApi.ts`

Add 2 functions per operation at the bottom of the file (copy the FV block and rename):

```typescript
export const WF_{OP}_OPERATION_KEY = '{OP_KEY}';

export async function start{Op}Decision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await authenticatedFetch(
    `/api/wf/operations/${WF_{OP}_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continue{Op}Decision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await authenticatedFetch(
    `/api/wf/operations/${WF_{OP}_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}
```

**Naming convention:**

| Operation | `{OP}` | `{OP_KEY}` |
|-----------|--------|------------|
| Rétrocession | `Rc` | `operations_retrocession` |
| Réservation | `Reservation` | `operations_reservation` |
| Annulation Réservation | `AnnulationReservation` | `operations_annulation_reservation` |
| Suspension | `Suspension` | `operations_suspension` |
| Levée Suspension | `LeveeSuspension` | `operations_levee_suspension` |
| Alimentation BCT | `AlimentationBct` | `operations_alimentation_bct` |
| Clôture Dossier | `Cloture` | `operations_cloture` |

---

### Step 3 — Component (`AVA*.tsx`)

**3 changes in each component:**

#### A. Add import at the top
```typescript
import { start{Op}Decision, continue{Op}Decision } from '../utils/workflowApi';
```

#### B. Add WF state
```typescript
const [wf{Op}BusinessKey, setWf{Op}BusinessKey] = useState<string | null>(null);
```
Reset it when the user picks a different dossier:
```typescript
const handleSelectDossier = async (dossier) => {
  setWf{Op}BusinessKey(null);   // ← add this line
  // ... rest unchanged
};
```

#### C. Replace the submit function's direct API call

Find the block that calls `authenticatedFetch(...)` with `method: 'POST'` and replace it:

```typescript
// BEFORE
const response = await authenticatedFetch('/api/...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
if (response.ok) { /* success */ }

// AFTER
toast.info('Soumission au Service Central...', { description: 'Communication avec le moteur de workflow...' });

const wfResponse = wf{Op}BusinessKey
  ? await continue{Op}Decision(wf{Op}BusinessKey, 'SOUMETTRE', payload as unknown as Record<string, unknown>)
  : await start{Op}Decision('SOUMETTRE', payload as unknown as Record<string, unknown>);

if (wfResponse.result === 'OK') {
  const newKey = wfResponse.state?.businessKey;
  if (newKey) setWf{Op}BusinessKey(newKey);
  // mark files as persisted, set skipDraftCleanup, show success dialog/toast
  toast.success('Opération soumise avec succès', {
    description: newKey ? `Référence: ${newKey}` : undefined,
    duration: 5000,
  });
  setShowSuccessDialog(true);  // or whatever the success trigger is
} else if (wfResponse.result === 'REJECTED') {
  toast.error('Opération rejetée', { description: wfResponse.errorMessage });
} else if (wfResponse.result === 'ERROR') {
  toast.error('Erreur workflow', { description: wfResponse.errorMessage });
}
```

---

## Special Cases

### Endpoints with `{numDossier}` or `{finalize}` in the path (not query string)

For **Suspension**, **Levée Suspension**, **Alimentation BCT**, **Clôture** — the endpoint uses path params not query params. Use this `ENDPOINT_TEMPLATE` format in `WF_DEFINITION`:

| Operation | `ENDPOINT_TEMPLATE` |
|-----------|---------------------|
| Suspension | `/api/suspension/{finalize}` |
| Levée Suspension | `/api/levee-suspension/{finalize}` |
| Alimentation BCT | `/api/alimentation-bct/{businessKey}/{finalize}` |
| Clôture | `/api/cloture/{businessKey}/{finalize}` |

For Alimentation BCT and Clôture, `{businessKey}` in the template is replaced by the WF engine with the operation's current `businessKey` (which is the `numDossier`). Set `PAYLOAD_BK_FIELD = NULL` since the key goes in the URL, not the payload.

### Réservation `referenceRes`

The Réservation response uses `referenceRes` (a String) instead of `refOperation` (a Long). Set:
- `RESP_BK_PATH = '$.referenceRes'`
- The business key stored in WF will be the string reference (e.g. `"RES-2026-001"`)

---

## Checklist per Operation

- [ ] SQL inserts committed and DB accessible from WF engine
- [ ] WF engine restarted after DB changes
- [ ] `workflowApi.ts` — new start/continue functions added
- [ ] Component — import added
- [ ] Component — WF state (`wf*BusinessKey`) added
- [ ] Component — `handleSelectDossier` resets business key
- [ ] Component — submit function routes through WF instead of direct fetch
- [ ] Test: submit → check browser console for `[WF] Réponse: { result: "OK" }`
