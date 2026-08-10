import type {
  AccountRow,
  AgencyInfo,
} from './transfer.types';
import { normalizeAgencyCode } from './transfer.session';

export interface ClientAgencyOption extends AgencyInfo {
  accountCount: number;
}

export interface ClientAgencyScopeResult {
  eligibleAgencies: ClientAgencyOption[];
  selectedAgencyCode: string;
}

function normalizeAgencyInfo(agency: AgencyInfo): AgencyInfo {
  return {
    ...agency,
    code: normalizeAgencyCode(agency.code),
  };
}

export function resolveEligibleClientAgencies(
  accounts: AccountRow[],
  authorizedAgencies: AgencyInfo[],
): ClientAgencyOption[] {
  const authorizedByCode = new Map(
    authorizedAgencies
      .map(normalizeAgencyInfo)
      .filter(agency => Boolean(agency.code))
      .map(agency => [agency.code, agency] as const),
  );

  const accountCountByAgency = new Map<string, number>();

  for (const account of accounts) {
    const agencyCode = normalizeAgencyCode(account.codeAgence);

    if (!agencyCode || !authorizedByCode.has(agencyCode)) {
      continue;
    }

    accountCountByAgency.set(
      agencyCode,
      (accountCountByAgency.get(agencyCode) ?? 0) + 1,
    );
  }

  return [...accountCountByAgency.entries()]
    .map(([code, accountCount]) => {
      const agency = authorizedByCode.get(code)!;

      return {
        ...agency,
        code,
        accountCount,
      };
    })
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function resolveDefaultClientAgencyCode(
  agencies: ClientAgencyOption[],
): string {
  return agencies.length === 1 ? agencies[0].code : '';
}

export function filterAccountsByAgency(
  accounts: AccountRow[],
  agencyCode: string,
): AccountRow[] {
  const normalizedAgencyCode = normalizeAgencyCode(agencyCode);

  if (!normalizedAgencyCode) {
    return [];
  }

  return accounts.filter(
    account => normalizeAgencyCode(account.codeAgence) === normalizedAgencyCode,
  );
}

export function agencyOptionLabel(agency: ClientAgencyOption): string {
  const base = agency.label?.trim()
    ? `${agency.code} — ${agency.label.trim()}`
    : agency.code;

  return `${base} (${agency.accountCount} compte${agency.accountCount > 1 ? 's' : ''})`;
}

export function isTndActiveAccountForAgency(
  account: AccountRow,
  agencyCode: string,
): boolean {
  const normalizedAgencyCode = normalizeAgencyCode(agencyCode);

  return Boolean(normalizedAgencyCode)
    && normalizeAgencyCode(account.codeAgence) === normalizedAgencyCode
    && account.devise.trim().toUpperCase() === 'TND'
    && account.statut === 'ACTIF';
}

export function filterTndActiveAccountsByAgency(
  accounts: AccountRow[],
  agencyCode: string,
): AccountRow[] {
  return accounts.filter(account =>
    isTndActiveAccountForAgency(account, agencyCode),
  );
}

export function isCommissionAccountValid(
  accounts: AccountRow[],
  agencyCode: string,
  accountNumber: string,
): boolean {
  if (!accountNumber.trim()) return false;

  return accounts.some(account =>
    account.numero === accountNumber
    && account.eligibleCommission
    && isTndActiveAccountForAgency(account, agencyCode),
  );
}
