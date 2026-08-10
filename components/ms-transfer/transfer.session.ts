import { getWfUserContext } from '../../utils/api';
import { UserMessageError } from './transfer.errors';

interface SessionUser {
  agencyCode?: unknown;
  codeAgence?: unknown;
  codeAgenceBct?: unknown;
  agency?: { code?: unknown };
  agence?: { code?: unknown };
  wfInstanceId?: unknown;
  workflowInstanceId?: unknown;
  instanceId?: unknown;
  wfTaskId?: unknown;
  workflowTaskId?: unknown;
  taskId?: unknown;
}

interface RawWfContext {
  userId?: string | number | null;
  roleCode?: string | null;
  agencyCode?: string | number | null;
  orgNodeId?: string | number | null;
  wfInstanceId?: string | null;
  workflowInstanceId?: string | null;
  instanceId?: string | null;
  wfTaskId?: string | null;
  workflowTaskId?: string | null;
  taskId?: string | null;
}

const DIRECT_AGENCY_KEYS = [
  'wf_agency_code',
  'agency_code',
  'code_agence',
  'codeAgence',
] as const;

const USER_OBJECT_KEYS = ['wf_user_context', 'auth_user'] as const;

const WF_INSTANCE_KEYS = [
  'wf_instance_id',
  'wfInstanceId',
  'workflow_instance_id',
  'workflowInstanceId',
] as const;

const WF_TASK_KEYS = [
  'wf_task_id',
  'wfTaskId',
  'workflow_task_id',
  'workflowTaskId',
] as const;

/** Normalize the branch/agency code expected by MS-TR and the BNA mock. */
export function normalizeAgencyCode(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (!/^\d+$/.test(raw)) {
    return raw.toUpperCase();
  }

  return String(Number(raw)).padStart(3, '0');
}

function readObject(raw: string): SessionUser | null {
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function readAgencyFromObject(raw: string): string {
  const user = readObject(raw);
  if (!user) return '';

  return normalizeAgencyCode(
    user.agencyCode
      ?? user.codeAgence
      ?? user.codeAgenceBct
      ?? user.agency?.code
      ?? user.agence?.code,
  );
}

function firstSessionValue(keys: readonly string[]): string {
  for (const key of keys) {
    const value = String(sessionStorage.getItem(key) ?? '').trim();
    if (value) return value;
  }
  return '';
}

function firstWorkflowValueFromObjects(
  selector: (value: SessionUser) => unknown,
): string {
  for (const key of USER_OBJECT_KEYS) {
    const raw = sessionStorage.getItem(key);
    if (!raw) continue;

    const parsed = readObject(raw);
    if (!parsed) continue;

    const value = String(selector(parsed) ?? '').trim();
    if (value) return value;
  }

  return '';
}

function createUuid(): string {
  if (
    typeof crypto !== 'undefined'
    && typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateDevelopmentWorkflowId(
  storageKey: string,
  environmentValue: unknown,
): string {
  const configured = String(environmentValue ?? '').trim();
  if (configured) return configured;

  const existing = String(sessionStorage.getItem(storageKey) ?? '').trim();
  if (existing) return existing;

  if (!import.meta.env.DEV) return '';

  const generated = createUuid();
  sessionStorage.setItem(storageKey, generated);
  return generated;
}

export function getSessionAgencyCode(): string {
  const wfContext = getWfUserContext() as RawWfContext;
  const contextAgency = normalizeAgencyCode(wfContext.agencyCode);
  if (contextAgency) return contextAgency;

  for (const key of DIRECT_AGENCY_KEYS) {
    const value = normalizeAgencyCode(sessionStorage.getItem(key));
    if (value) return value;
  }

  for (const key of USER_OBJECT_KEYS) {
    const raw = sessionStorage.getItem(key);
    if (!raw) continue;

    const value = readAgencyFromObject(raw);
    if (value) return value;
  }

  const developmentAgency = String(
    import.meta.env.VITE_DEV_AGENCY_CODE || '',
  ).trim();

  return import.meta.env.DEV
    ? normalizeAgencyCode(developmentAgency)
    : '';
}

export function requireSessionAgencyCode(): string {
  const agencyCode = getSessionAgencyCode();

  if (!agencyCode) {
    throw new UserMessageError(
      "Aucune agence courante n'est associée à votre session. Veuillez vous reconnecter.",
    );
  }

  return agencyCode;
}

export interface TransferRequestContext {
  userId: string;
  roleCode: string;
  orgNodeId?: string;
  agencyCode: string;
}

export interface AgencyInitiationRequestContext
  extends TransferRequestContext {
  wfInstanceId: string;
  wfTaskId: string;
}

export function getTransferRequestContext(): TransferRequestContext {
  const wfContext = getWfUserContext() as RawWfContext;
  const developmentUserId = String(
    import.meta.env.VITE_DEV_USER_ID || '',
  ).trim();

  const userId = String(
    wfContext.userId
      ?? (import.meta.env.DEV ? developmentUserId : ''),
  ).trim();

  if (!userId) {
    throw new UserMessageError(
      "L'identifiant de l'utilisateur connecté est indisponible. Veuillez vous reconnecter.",
    );
  }

  const agencyCode = normalizeAgencyCode(
    wfContext.agencyCode ?? requireSessionAgencyCode(),
  );

  return {
    userId,
    roleCode: String(wfContext.roleCode || 'AGENT'),
    orgNodeId: wfContext.orgNodeId
      ? String(wfContext.orgNodeId)
      : undefined,
    agencyCode,
  };
}

export function getAgencyInitiationRequestContext(): AgencyInitiationRequestContext {
  const base = getTransferRequestContext();
  const wfContext = getWfUserContext() as RawWfContext;

  const wfInstanceId =
    String(
      wfContext.wfInstanceId
        ?? wfContext.workflowInstanceId
        ?? wfContext.instanceId
        ?? '',
    ).trim()
    || firstSessionValue(WF_INSTANCE_KEYS)
    || firstWorkflowValueFromObjects(
      value => value.wfInstanceId
        ?? value.workflowInstanceId
        ?? value.instanceId,
    )
    || getOrCreateDevelopmentWorkflowId(
      'ms_tr_direct_wf_instance_id',
      import.meta.env.VITE_MS_TR_WF_INSTANCE_ID,
    );

  const wfTaskId =
    String(
      wfContext.wfTaskId
        ?? wfContext.workflowTaskId
        ?? wfContext.taskId
        ?? '',
    ).trim()
    || firstSessionValue(WF_TASK_KEYS)
    || firstWorkflowValueFromObjects(
      value => value.wfTaskId
        ?? value.workflowTaskId
        ?? value.taskId,
    )
    || getOrCreateDevelopmentWorkflowId(
      'ms_tr_direct_wf_task_id',
      import.meta.env.VITE_MS_TR_WF_TASK_ID,
    );

  if (!wfInstanceId || !wfTaskId) {
    throw new UserMessageError(
      "Le contexte workflow est absent. Renseignez les identifiants d'instance et de tâche avant l'initiation agence.",
    );
  }

  return {
    ...base,
    wfInstanceId,
    wfTaskId,
  };
}
