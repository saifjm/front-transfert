import { authenticatedFetch } from './api';

export const WF_OPERATION_KEY = 'operations_agence_service_central';

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
  const response = await authenticatedFetch(
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
  const response = await authenticatedFetch(
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
