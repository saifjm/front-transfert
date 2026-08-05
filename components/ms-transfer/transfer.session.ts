import { getWfUserContext } from '../../utils/api';
import { UserMessageError } from './transfer.errors';

interface SessionUser {
  agencyCode?: unknown;
  codeAgence?: unknown;
  codeAgenceBct?: unknown;
  agency?: { code?: unknown };
  agence?: { code?: unknown };
}

const DIRECT_AGENCY_KEYS = [
  'wf_agency_code',
  'agency_code',
  'code_agence',
  'codeAgence',
] as const;

const USER_OBJECT_KEYS = ['wf_user_context', 'auth_user'] as const;

/** Normalize the BCT agency code expected by the bank mock to three digits. */
export function normalizeAgencyCode(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (!/^\d+$/.test(raw)) {
    return raw.toUpperCase();
  }

  return String(Number(raw)).padStart(3, '0');
}

function readAgencyFromObject(raw: string): string {
  try {
    const user = JSON.parse(raw) as SessionUser;
    const value =
      user.agencyCode
      ?? user.codeAgence
      ?? user.codeAgenceBct
      ?? user.agency?.code
      ?? user.agence?.code;

    return normalizeAgencyCode(value);
  } catch {
    return '';
  }
}

export function getSessionAgencyCode(): string {
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

export function getTransferRequestContext(): TransferRequestContext {
  const wfContext = getWfUserContext();
  const developmentUserId = String(
    import.meta.env.VITE_DEV_USER_ID || '',
  ).trim();

  const userId = wfContext.userId || (
    import.meta.env.DEV ? developmentUserId : ''
  );

  if (!userId) {
    throw new UserMessageError(
      "L'identifiant de l'utilisateur connecté est indisponible. Veuillez vous reconnecter.",
    );
  }

  return {
    userId,
    roleCode: wfContext.roleCode || 'AGENT',
    orgNodeId: wfContext.orgNodeId || undefined,
    agencyCode: requireSessionAgencyCode(),
  };
}
