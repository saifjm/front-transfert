import { authenticatedFetch } from './api';

export const WF_OPERATION_KEY = 'operations_agence_service_central';

async function wfFetch(url: string, options: RequestInit): Promise<Response> {
  const response = await authenticatedFetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${response.status}`);
  }
  return response;
}

// ─── Types mirroring backend DTOs ────────────────────────────────────────────

export interface DecisionRequest {
  payload: Record<string, unknown>;
  comment?: string;
  justification?: string;
  manualTargetNodeKey?: string;
}

export type DecisionResult =
  | 'OK'
  | 'REJECTED'
  | 'WARN_REQUIRED'
  | 'MANUAL_TARGET_REQUIRED'
  | 'ERROR';

export interface OperationState {
  status: string;
  currentNodeKey: string;
  businessKey: string;
}

export interface DecisionResponse {
  result: DecisionResult;
  errorMessage?: string;
  state?: OperationState;
  warnings?: { message: string }[];
  requiresJustification?: boolean;
  manualTargets?: { nodeKey: string; label: string }[];
}

export interface DecisionInfo {
  tag: string;
  label: string;
  requiresComment: boolean;
  behavior: string;
}

export interface WfTask {
  taskId: string;
  currentNodeKey: string;
  nodeLabel: string;
  claimEnabled: boolean;
  assignee: string | null;
  candidates: string[];
  decisions: DecisionInfo[];
  businessKey?: string;
  createdAt?: string;
}

// ─── User context headers ─────────────────────────────────────────────────────

function wfHeaders(): Record<string, string> {
  const userId = sessionStorage.getItem('wf_user_id') ?? '1';
  const orgNodeId = sessionStorage.getItem('wf_org_node_id');
  const roleCode = sessionStorage.getItem('wf_role_code') ?? 'ADMIN';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    'X-Role-Code': roleCode,
  };
  if (orgNodeId) headers['X-Org-Node-Id'] = orgNodeId;
  return headers;
}

// ─── API functions ────────────────────────────────────────────────────────────

/** First decision on a new operation (no businessKey yet — generates TEMP-* key). */
export async function startDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

/** Subsequent decision on an existing operation (businessKey known). */
export async function continueDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
  justification?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment, justification };
  const response = await wfFetch(
    `/api/wf/operations/${WF_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

/** Fetch the current task info for a running operation. */
export async function getWfTask(businessKey: string): Promise<WfTask> {
  const response = await authenticatedFetch(
    `/api/wf/operations/${WF_OPERATION_KEY}/${businessKey}/task`,
    { method: 'GET', headers: wfHeaders() },
  );
  return response.json();
}

/** Fetch all pending tasks for this workflow (for validators). */
export async function getWfTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  // Handle both plain array and Spring Page<> wrapper
  return Array.isArray(data) ? data : (data.content ?? []);
}

// ─── Frais Voyage workflow ────────────────────────────────────────────────────

export const WF_FV_OPERATION_KEY = 'operations_frais_voyage';

export async function startFvDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_FV_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continueFvDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_FV_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function getWfFvTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_FV_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  return Array.isArray(data) ? data : (data.content ?? []);
}

// ─── Clôture Dossier workflow ─────────────────────────────────────────────────
// numDossier is always known upfront so we only need continueDecision (no TEMP key).

export const WF_CLOTURE_OPERATION_KEY = 'operations_cloture';

export async function continueClotureDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_CLOTURE_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

// ─── Suspension workflow ──────────────────────────────────────────────────────

export const WF_SUSPENSION_OPERATION_KEY = 'operations_suspension';

export async function startSuspensionDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_SUSPENSION_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continueSuspensionDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_SUSPENSION_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function getWfSuspensionTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_SUSPENSION_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  return Array.isArray(data) ? data : (data.content ?? []);
}

// ─── Levée de Suspension workflow ────────────────────────────────────────────

export const WF_LEVEE_SUSPENSION_OPERATION_KEY = 'operations_levee';

export async function startLeveeSuspensionDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_LEVEE_SUSPENSION_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continueLeveeSuspensionDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_LEVEE_SUSPENSION_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function getWfLeveeSuspensionTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_LEVEE_SUSPENSION_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  return Array.isArray(data) ? data : (data.content ?? []);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAJ BENEFICIAIRE WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════

export const WF_MAJ_BENEFICIAIRE_OPERATION_KEY = 'operations_beneficiaire';

export async function startMajBeneficiaireDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_MAJ_BENEFICIAIRE_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continueMajBeneficiaireDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_MAJ_BENEFICIAIRE_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function getWfMajBeneficiaireTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_MAJ_BENEFICIAIRE_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  return Array.isArray(data) ? data : (data.content ?? []);
}

// ═══════════════════════════════════════════════════════════════════════════
// RAPATRIEMENT EXPORTATEUR WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════

export const WF_RAPATRIEMENT_OPERATION_KEY = 'operations_exportateur';

export async function startRapatriementDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_RAPATRIEMENT_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continueRapatriementDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_RAPATRIEMENT_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function getWfRapatriementTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_RAPATRIEMENT_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  return Array.isArray(data) ? data : (data.content ?? []);
}

// ─── Réservation workflow ─────────────────────────────────────────────────────

export const WF_RESERVATION_OPERATION_KEY = 'operations_reservation';

export async function startReservationDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_RESERVATION_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continueReservationDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_RESERVATION_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function getWfReservationTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_RESERVATION_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  return Array.isArray(data) ? data : (data.content ?? []);
}

// ─── Annulation Réservation workflow ─────────────────────────────────────────

export const WF_ANNULATION_RESERVATION_OPERATION_KEY = 'operations_annulation_reservation';

export async function startAnnulationReservationDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_ANNULATION_RESERVATION_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function continueAnnulationReservationDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_ANNULATION_RESERVATION_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

export async function getWfAnnulationReservationTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_ANNULATION_RESERVATION_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  return Array.isArray(data) ? data : (data.content ?? []);
}

// ─── Alimentation BCT workflow ───────────────────────────────────────────────

export const WF_ALIMENTATION_BCT_OPERATION_KEY = 'operations_alimentationbct';

/**
 * Démarre une nouvelle opération d'alimentation BCT via le workflow
 * @param decisionTag - Tag de la décision (généralement 'SOUMETTRE')
 * @param payload - Données de l'alimentation BCT
 * @param comment - Commentaire optionnel
 * @returns Réponse du workflow
 */
export async function startAlimentationBctDecision(
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_ALIMENTATION_BCT_OPERATION_KEY}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

/**
 * Continue une opération d'alimentation BCT existante via le workflow
 * @param businessKey - Clé métier (numDossier)
 * @param decisionTag - Tag de la décision
 * @param payload - Données de l'alimentation BCT
 * @param comment - Commentaire optionnel
 * @returns Réponse du workflow
 */
export async function continueAlimentationBctDecision(
  businessKey: string,
  decisionTag: string,
  payload: Record<string, unknown>,
  comment?: string,
): Promise<DecisionResponse> {
  const body: DecisionRequest = { payload, comment };
  const response = await wfFetch(
    `/api/wf/operations/${WF_ALIMENTATION_BCT_OPERATION_KEY}/${businessKey}/decide/${decisionTag}`,
    { method: 'POST', headers: wfHeaders(), body: JSON.stringify(body) },
  );
  return response.json();
}

/**
 * Récupère la liste des tâches d'alimentation BCT en attente
 * @returns Liste des tâches workflow
 */
export async function getWfAlimentationBctTaskList(): Promise<WfTask[]> {
  const response = await authenticatedFetch(
    `/api/wf/tasks?operationKey=${WF_ALIMENTATION_BCT_OPERATION_KEY}`,
    { method: 'GET', headers: wfHeaders() },
  );
  const data = await response.json();
  return Array.isArray(data) ? data : (data.content ?? []);
}
