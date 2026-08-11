import { UserMessageError } from './transfer.errors';
import {
  resolveEligibleClientAgencies,
  type ClientAgencyOption,
} from './transfer.client-agency';
import type {
  AgencyWorkflowCommandResponse,
} from './transfer.agency-initiation.contracts';
import { buildAgencyInitiationCommand } from './transfer.agency-initiation.mapper';
import {
  MOCK_BCT_AUTHORIZATIONS,
  MOCK_QUOTED_CURRENCIES,
  MOCK_TCE,
} from './transfer.mock';
import type {
  BnaAccountSearchResponse,
  BnaAsyncAck,
  BnaAuthorizationResponse,
  BnaBackOfficeResult,
  BnaBankResponse,
  BnaClientProfileResponse,
  BnaDocumentCreateResponse,
  BnaDocumentListResponse,
  BnaErrorPayload,
  BnaFinancingAllocationResponse,
  BnaFinancingReleaseResponse,
  BnaFinancingSearchResponse,
  BnaFundsBlockResponse,
  BnaFundsReleaseResponse,
  BnaFxRateResponse,
  BnaNostroResponse,
} from './transfer.api.contracts';
import {
  buildAddress,
  mapClientAccounts,
  mapClientData,
  toAgencyInfo,
  toBnaCustomerIdType,
  toCurrencyAlpha,
  toCurrencyNumeric,
  toNumber,
} from './transfer.mappers';
import {
  getAgencyInitiationRequestContext,
  getTransferRequestContext,
  normalizeAgencyCode,
  requireSessionAgencyCode,
} from './transfer.session';
import type {
  AgencyInitiationResult,
  AsyncReceptionAck,
  BackOfficeResult,
  BankData,
  BctAuthorization,
  ClientAgencyEligibility,
  ClientAgencyEligibilityReason,
  ClientData,
  CountryOption,
  CounterValueResult,
  CustomerIdType,
  DocumentReference,
  FinancingAllocationRequest,
  FinancingAllocationResult,
  FinancingReleaseRequest,
  FinancingReleaseResult,
  FinancingResource,
  FinancingResourceSearchCriteria,
  FundsBlockRequest,
  FundsBlockResult,
  FundsReleaseRequest,
  FundsReleaseResult,
  NostroAccount,
  QuotedCurrency,
  TCEResult,
  TceSearchData,
  TransferSubmissionPayload,
} from './transfer.types';

const BNA_API_BASE_URL = String(
  import.meta.env.VITE_BNA_API_BASE_URL || '/api/v1/bna',
).replace(/\/+$/, '');

const MS_TR_API_BASE_URL = String(
  import.meta.env.VITE_MS_TR_API_BASE_URL || '/api/ms-tr',
).replace(/\/+$/, '');

const BNA_MOCK_USER_ID = String(
  import.meta.env.VITE_DEV_USER_ID || '',
).trim();

const BNA_ENDPOINTS = {
  verifyAuthorization: `${BNA_API_BASE_URL}/auth/verify`,
  clientProfile: `${BNA_API_BASE_URL}/clients/profile`,
  accountSearch: `${BNA_API_BASE_URL}/accounts/search`,
  fxRates: `${BNA_API_BASE_URL}/fx/rates`,
  fundsBlock: `${BNA_API_BASE_URL}/funds/block`,
  fundsRelease: `${BNA_API_BASE_URL}/funds/release`,
  financingSearch: `${BNA_API_BASE_URL}/financing/resources/search`,
  financingAllocate: `${BNA_API_BASE_URL}/financing/resources/allocate`,
  financingRelease: `${BNA_API_BASE_URL}/financing/resources/release`,
  accountingImpacts: `${BNA_API_BASE_URL}/accounting/impacts`,
  accountingCro: `${BNA_API_BASE_URL}/accounting/cro`,
  backOfficeFlows: `${BNA_API_BASE_URL}/back-office/flows`,
  backOfficeResults: `${BNA_API_BASE_URL}/back-office/results/query`,
  documents: `${BNA_API_BASE_URL}/documents`,
  bankByBic: (bicfi: string) =>
    `${BNA_API_BASE_URL}/reference/banks/${encodeURIComponent(bicfi)}`,
  nostro: (currency: string) =>
    `${BNA_API_BASE_URL}/reference/nostro?currency=${encodeURIComponent(currency)}`,
} as const;

const MS_TR_ENDPOINTS = {
  agencyWorkflowCommand: `${MS_TR_API_BASE_URL}/operations/workflow-command`,
} as const;


/**
 * Temporary country reference used by the Donneur d'ordre LOV.
 *
 * The master country source is still to be confirmed. Until then, MS-TR uses
 * ISO 3166-1 alpha-2 codes as the normalized value carried by PartyData and
 * derives the user-facing French label through Intl.DisplayNames.
 *
 * Once the master reference service is available, only getCountries() should
 * need to change; OrderSection and PartyForm remain isolated from the source.
 */
const ISO_COUNTRY_ALPHA2_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
  'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
  'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
  'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
  'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
  'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
  'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
  'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
  'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
  'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
  'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
] as const;

function buildCountryReference(): CountryOption[] {
  const DisplayNamesCtor = (
    Intl as typeof Intl & {
      DisplayNames?: new (
        locales?: string | string[],
        options?: { type: 'region' },
      ) => { of(code: string): string | undefined };
    }
  ).DisplayNames;

  const displayNames = DisplayNamesCtor
    ? new DisplayNamesCtor(['fr-FR'], { type: 'region' })
    : null;

  return ISO_COUNTRY_ALPHA2_CODES
    .map(alpha2 => ({
      alpha2,
      label: displayNames?.of(alpha2) || alpha2,
      active: true,
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, 'fr-FR', {
        sensitivity: 'base',
      }),
    );
}

interface BnaRequestOptions extends RequestInit {
  userMessage: string;
  /** Overrides the agency carried by the connected-user session. */
  agencyCode?: string;
}

interface MsTrRequestOptions extends RequestInit {
  userMessage: string;
  idempotencyKey: string;
  /** Agency explicitly selected in the Client step. */
  branchCode: string;
}

function createCorrelationId(): string {
  if (
    typeof crypto !== 'undefined'
    && typeof crypto.randomUUID === 'function'
  ) {
    return `CORR-${crypto.randomUUID()}`;
  }

  return `CORR-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildHeaders(
  extra?: HeadersInit,
  agencyCodeOverride?: string,
): Headers {
  const headers = new Headers(extra);
  const context = getTransferRequestContext();
  const agencyCode = normalizeAgencyCode(
    agencyCodeOverride
    || headers.get('X-Agency-Code')
    || context.agencyCode,
  );

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!headers.has('X-Correlation-Id')) {
    headers.set('X-Correlation-Id', createCorrelationId());
  }

  if (!headers.has('X-User-Id')) {
    headers.set(
      'X-User-Id',
      BNA_MOCK_USER_ID || context.userId,
    );
  }

  if (!headers.has('X-Role-Code')) {
    headers.set('X-Role-Code', context.roleCode);
  }

  if (agencyCode) {
    headers.set('X-Agency-Code', agencyCode);
  }

  if (context.orgNodeId && !headers.has('X-Org-Node-Id')) {
    headers.set('X-Org-Node-Id', context.orgNodeId);
  }

  return headers;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function unwrapPayload<T>(payload: unknown): T {
  if (
    payload
    && typeof payload === 'object'
    && 'data' in payload
    && (payload as { data?: unknown }).data != null
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

const ERROR_CODE_MESSAGES: Record<string, string> = {
  USER_ID_REQUIRED:
    "L'identifiant de l'utilisateur connecté est indisponible.",
  USER_NOT_FOUND:
    "L'utilisateur connecté est inconnu ou inactif.",
  AGENCY_CODE_REQUIRED:
    "Aucune agence courante n'est associée à votre session.",
  USER_NOT_AUTHORIZED_IN_CURRENT_AGENCY:
    "Vous n'êtes pas autorisé à effectuer cette opération dans l'agence courante.",
  CLIENT_NOT_ATTACHED_TO_CURRENT_AGENCY:
    "Ce client est rattaché à une autre agence. Le transfert doit être initié dans son agence de rattachement.",
  CLIENT_NOT_FOUND:
    'Aucun client ne correspond aux informations renseignées.',
  BANK_BIC_NOT_FOUND:
    'Le code BIC renseigné est introuvable.',
  NOSTRO_NOT_FOUND:
    'Aucun compte Nostro n’est configuré pour cette devise.',
  FX_RATE_NOT_FOUND:
    'Aucun cours n’est disponible à la date demandée.',
  CURRENCY_UNKNOWN:
    'La devise demandée est inconnue du référentiel bancaire.',
  IDEMPOTENCY_CONFLICT:
    'Cette référence a déjà été utilisée avec des données différentes.',
  BLOCKING_REFERENCE_NOT_FOUND:
    'La référence de blocage est introuvable.',
  BLOCK_NOT_IN_CURRENT_AGENCY:
    "Le blocage ne peut être libéré que depuis son agence d'origine.",
  FINANCING_RESOURCE_NOT_FOUND:
    'La ressource de financement est introuvable.',
};

function mapHttpError(
  response: Response,
  payload: BnaErrorPayload | null,
  fallback: string,
): UserMessageError {
  const codeMessage = payload?.codeErreur
    ? ERROR_CODE_MESSAGES[payload.codeErreur]
    : undefined;

  if (codeMessage) {
    return new UserMessageError(codeMessage);
  }

  const businessMessage = payload?.message || payload?.messageErreur;
  if (businessMessage) {
    return new UserMessageError(businessMessage);
  }

  switch (response.status) {
    case 400:
      return new UserMessageError(
        'Les informations transmises sont incomplètes ou invalides.',
      );
    case 401:
      return new UserMessageError(
        'Votre session ne permet pas d’effectuer cette opération.',
      );
    case 403:
      return new UserMessageError(
        'Vous n’êtes pas habilité à effectuer cette opération.',
      );
    case 404:
      return new UserMessageError(
        'Aucune donnée ne correspond aux critères renseignés.',
      );
    case 409:
      return new UserMessageError(
        'Les données transmises sont incompatibles avec la situation actuelle.',
      );
    case 422:
      return new UserMessageError(
        'La demande a été refusée par les contrôles bancaires.',
      );
    default:
      return new UserMessageError(fallback);
  }
}

async function requestBna<T>(
  url: string,
  {
    userMessage,
    headers,
    agencyCode,
    ...init
  }: BnaRequestOptions,
): Promise<T> {
  let response: Response;

  try {
    const finalHeaders = buildHeaders(headers, agencyCode);
    response = await window.fetch(url, {
      ...init,
      headers: Object.fromEntries(finalHeaders.entries()),
      credentials: 'same-origin',
    });
  } catch (error) {
    console.error('[BNA API] Network error', { url, error });
    throw error instanceof UserMessageError
      ? error
      : new UserMessageError(userMessage);
  }

  const rawPayload = await readJson<unknown>(response);

  if (!response.ok) {
    console.error('[BNA API] HTTP error', {
      url,
      status: response.status,
      payload: rawPayload,
    });

    throw mapHttpError(
      response,
      rawPayload as BnaErrorPayload | null,
      userMessage,
    );
  }

  if (rawPayload == null) {
    throw new UserMessageError(userMessage);
  }

  return unwrapPayload<T>(rawPayload);
}

export function createAgencyInitiationIdempotencyKey(): string {
  if (
    typeof crypto !== 'undefined'
    && typeof crypto.randomUUID === 'function'
  ) {
    return `IDEMP-${crypto.randomUUID()}`;
  }

  return `IDEMP-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildAgencyInitiationHeaders(
  idempotencyKey: string,
  branchCode: string,
  extra?: HeadersInit,
): Headers {
  const headers = new Headers(extra);
  const context = getAgencyInitiationRequestContext();
  const selectedBranchCode = normalizeAgencyCode(branchCode);

  if (!selectedBranchCode) {
    throw new UserMessageError(
      'Veuillez sélectionner une agence client avant de poursuivre.',
    );
  }

  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  headers.set('X-WF-Instance-Id', context.wfInstanceId);
  headers.set('X-WF-Task-Id', context.wfTaskId);
  headers.set('X-WF-Node-Code', 'AGENCY_INITIATION');
  headers.set('X-WF-Actor-Role', 'AGENCY_OPERATOR');
  headers.set('X-User-Id', context.userId);
  headers.set('X-Branch-Code', selectedBranchCode);
  headers.set('X-Correlation-Id', createCorrelationId());
  headers.set('Idempotency-Key', idempotencyKey);

  return headers;
}

async function requestMsTr<T>(
  url: string,
  {
    userMessage,
    headers,
    idempotencyKey,
    branchCode,
    ...init
  }: MsTrRequestOptions,
): Promise<T> {
  const finalHeaders = buildAgencyInitiationHeaders(
    idempotencyKey,
    branchCode,
    headers,
  );

  let response: Response;

  try {
    response = await window.fetch(url, {
      ...init,
      headers: Object.fromEntries(finalHeaders.entries()),
      credentials: 'same-origin',
    });
  } catch (error) {
    console.error('[MS-TR API] Network error', {
      url,
      method: init.method || 'GET',
      error,
    });

    throw error instanceof UserMessageError
      ? error
      : new UserMessageError(userMessage);
  }

  const rawPayload = await readJson<unknown>(response);

  if (!response.ok) {
    console.error('[MS-TR API] HTTP error', {
      url,
      status: response.status,
      payload: rawPayload,
    });

    throw mapHttpError(
      response,
      rawPayload as BnaErrorPayload | null,
      userMessage,
    );
  }

  if (rawPayload == null) {
    throw new UserMessageError(userMessage);
  }

  return unwrapPayload<T>(rawPayload);
}

function normalizeAgencyInitiationResponse(
  response: AgencyWorkflowCommandResponse,
): AgencyInitiationResult {
  const operationRef =
    response.operationRef
    ?? response.refOrdre
    ?? response.referenceOrdre
    ?? response.refOperation
    ?? response.id;

  if (operationRef == null || String(operationRef).trim() === '') {
    throw new UserMessageError(
      "MS-TR a accepté la demande sans retourner la référence de l'opération.",
    );
  }

  const status =
    response.status
    ?? response.operationStatus
    ?? response.statut
    ?? response.statutOperation
    ?? 'DRAFT';

  return {
    operationRef: String(operationRef),
    status: String(status),
    message: response.message,
    raw: response,
  };
}

function normalizeNoPiece(noPieceClient: string): string {
  return noPieceClient.trim().toUpperCase();
}

function mapEligibilityReason(
  codeMotifRefus: string | null,
): ClientAgencyEligibilityReason {
  if (!codeMotifRefus) return 'ELIGIBLE';

  if (
    codeMotifRefus === 'USER_NOT_AUTHORIZED_IN_CURRENT_AGENCY'
  ) {
    return 'USER_NOT_AUTHORIZED_IN_CURRENT_AGENCY';
  }

  if (
    codeMotifRefus === 'CLIENT_NOT_ATTACHED_TO_CURRENT_AGENCY'
  ) {
    return 'CLIENT_NOT_ATTACHED_TO_CURRENT_AGENCY';
  }

  if (codeMotifRefus === 'CLIENT_NOT_FOUND') {
    return 'CLIENT_NOT_FOUND';
  }

  return 'UNKNOWN_REFUSAL';
}

function eligibilityMessage(
  reason: ClientAgencyEligibilityReason,
): string {
  switch (reason) {
    case 'ELIGIBLE':
      return 'Le client est éligible à l’initiation d’un transfert dans l’agence courante.';
    case 'USER_NOT_AUTHORIZED_IN_CURRENT_AGENCY':
      return "L'utilisateur n'est pas autorisé à opérer dans l'agence courante.";
    case 'CLIENT_NOT_ATTACHED_TO_CURRENT_AGENCY':
      return 'Ce client est rattaché à une autre agence. Le transfert doit être initié dans son agence de rattachement.';
    case 'CLIENT_NOT_FOUND':
      return 'Aucun client ne correspond aux informations renseignées.';
    case 'SESSION_AGENCY_MISSING':
      return "Aucune agence courante n'est associée à votre session.";
    default:
      return 'Le client ne peut pas initier un transfert dans l’agence courante.';
  }
}

async function requestClientAuthorization(
  typePieceClient: CustomerIdType,
  noPieceClient: string,
): Promise<BnaAuthorizationResponse> {
  return requestBna<BnaAuthorizationResponse>(
    BNA_ENDPOINTS.verifyAuthorization,
    {
      method: 'POST',
      body: JSON.stringify({
        typePieceClient: toBnaCustomerIdType(typePieceClient),
        noPieceClient: normalizeNoPiece(noPieceClient),
      }),
      userMessage:
        'La vérification des habilitations agence est momentanément indisponible.',
    },
  );
}

/** BNA-AUTH-001 — strict current-agency eligibility check. */
export async function getClientAgence(
  typePieceClient: CustomerIdType,
  noPieceClient: string,
): Promise<ClientAgencyEligibility> {
  const normalizedNoPiece = normalizeNoPiece(noPieceClient);
  const sessionAgencyCode = requireSessionAgencyCode();

  const response = await requestClientAuthorization(
    typePieceClient,
    normalizedNoPiece,
  );

  const currentAgencyCode = normalizeAgencyCode(
    response.agenceCourante || sessionAgencyCode,
  );
  const authorizedAgencies = response.agencesAutorisees.map(toAgencyInfo);
  const clientAgencies = response.clientAgences.map(toAgencyInfo);
  const currentAgency = toAgencyInfo(currentAgencyCode);
  const clientAgency =
    clientAgencies.find(agency => agency.code === currentAgencyCode)
    || clientAgencies[0]
    || null;
  const reason = response.habilite
    ? 'ELIGIBLE'
    : mapEligibilityReason(response.codeMotifRefus);

  return {
    eligible: response.habilite,
    currentAgency,
    authorizedAgencies,
    clientAgencies,
    reason,
    message: eligibilityMessage(reason),
    userAgencyCode: currentAgencyCode,
    clientAgency,
  };
}


export interface ClientAgencyScopedSearchResult {
  client: ClientData | null;
  authorization: ClientAgencyEligibility;
  eligibleAgencies: ClientAgencyOption[];
}

function uniqueAgencyCodes(
  agencies: ClientAgencyEligibility['authorizedAgencies'],
): string[] {
  return agencies
    .map(agency => normalizeAgencyCode(agency.code))
    .filter(Boolean)
    .filter((code, index, all) => all.indexOf(code) === index);
}

function uniqueAccountRows(
  responses: BnaAccountSearchResponse[],
): BnaAccountSearchResponse['comptes'] {
  const seen = new Set<string>();

  return responses
    .flatMap(response => response.comptes || [])
    .filter(account => {
      const agencyCode = normalizeAgencyCode(account.codeAgenceBct);
      const key = `${agencyCode}:${account.compteRib}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * BNA-AUTH-001 + BNA-CLI-001 + BNA-ACC-001.
 *
 * New agency-selection rule:
 * eligible agencies = agencies containing at least one client account
 *                     ∩ agencies authorized for the connected user.
 *
 * The old `habilite` flag is a current-agency result and therefore must not
 * reject a client that can legitimately be processed in another authorized
 * agency. Actual account ownership is verified by probing BNA-ACC-001 with
 * each authorized agency in X-Agency-Code.
 */
export async function searchClientWithAgencyScope(
  typePieceClient: CustomerIdType,
  noPieceClient: string,
): Promise<ClientAgencyScopedSearchResult> {
  const normalizedNoPiece = normalizeNoPiece(noPieceClient);
  const sessionAgencyCode = requireSessionAgencyCode();
  const bnaTypePiece = toBnaCustomerIdType(typePieceClient);

  const authorizationResponse = await requestClientAuthorization(
    typePieceClient,
    normalizedNoPiece,
  );

  const currentAgencyCode = normalizeAgencyCode(
    authorizationResponse.agenceCourante || sessionAgencyCode,
  );
  const authorizedAgencies = authorizationResponse.agencesAutorisees
    .map(toAgencyInfo);
  const authorizedAgencyCodes = uniqueAgencyCodes(authorizedAgencies);
  const profileAgencyCode = authorizedAgencyCodes[0] || currentAgencyCode;

  const profilePromise = requestBna<BnaClientProfileResponse>(
    BNA_ENDPOINTS.clientProfile,
    {
      method: 'POST',
      agencyCode: profileAgencyCode,
      body: JSON.stringify({
        typePiecePersonne: bnaTypePiece,
        noPiecePersonne: normalizedNoPiece,
      }),
      userMessage: 'La fiche du client n’a pas pu être chargée.',
    },
  );

  const accountSearchPromise = Promise.allSettled(
    authorizedAgencyCodes.map(agencyCode =>
      requestBna<BnaAccountSearchResponse>(BNA_ENDPOINTS.accountSearch, {
        method: 'POST',
        agencyCode,
        body: JSON.stringify({
          typePieceClient: bnaTypePiece,
          noPieceClient: normalizedNoPiece,
          // The agency LOV is based on account ownership. We deliberately do
          // not apply commission-account filters at this stage.
          filtres: {},
        }),
        userMessage:
          `Les comptes du client n’ont pas pu être consultés pour l’agence ${agencyCode}.`,
      }),
    ),
  );

  const [profile, settledAccountResponses] = await Promise.all([
    profilePromise,
    accountSearchPromise,
  ]);

  const successfulAccountResponses = settledAccountResponses
    .filter(
      (result): result is PromiseFulfilledResult<BnaAccountSearchResponse> =>
        result.status === 'fulfilled',
    )
    .map(result => result.value);

  const failedAccountResponses = settledAccountResponses.filter(
    result => result.status === 'rejected',
  );

  if (
    authorizedAgencyCodes.length > 0
    && successfulAccountResponses.length === 0
    && failedAccountResponses.length > 0
  ) {
    throw failedAccountResponses[0].reason;
  }

  if (failedAccountResponses.length > 0) {
    console.warn('[BNA API] Partial account-agency lookup failure', {
      client: normalizedNoPiece,
      failedAgencies: failedAccountResponses.length,
      totalAgencies: authorizedAgencyCodes.length,
    });
  }

  const accountRows = uniqueAccountRows(successfulAccountResponses);
  const client = mapClientData(
    typePieceClient,
    profile,
    accountRows,
    '',
  );

  const eligibleAgencies = resolveEligibleClientAgencies(
    client.comptes,
    authorizedAgencies,
  );

  const clientAccountAgencyCodes = new Set(
    client.comptes
      .map(account => normalizeAgencyCode(account.codeAgence))
      .filter(Boolean),
  );
  const clientAccountAgencies = [...clientAccountAgencyCodes]
    .map(toAgencyInfo);

  const currentAgency = currentAgencyCode
    ? toAgencyInfo(currentAgencyCode)
    : null;
  const clientAgency =
    clientAccountAgencies.find(agency => agency.code === currentAgencyCode)
    || clientAccountAgencies[0]
    || null;
  const eligible = eligibleAgencies.length > 0;
  const reason: ClientAgencyEligibilityReason = eligible
    ? 'ELIGIBLE'
    : mapEligibilityReason(authorizationResponse.codeMotifRefus);

  const authorization: ClientAgencyEligibility = {
    eligible,
    currentAgency,
    authorizedAgencies,
    clientAgencies: clientAccountAgencies,
    reason,
    message: eligible
      ? 'Au moins une agence commune existe entre les comptes du client et vos habilitations.'
      : 'Aucune agence commune n’existe entre les comptes du client et votre périmètre d’habilitation.',
    userAgencyCode: currentAgencyCode,
    clientAgency,
  };

  return {
    client,
    authorization,
    eligibleAgencies,
  };
}

/**
 * BNA-ACC-001 — operational accounts for the selected client agency.
 *
 * Ticket rule:
 * - no operational account lookup before the agency is selected;
 * - selected agency is carried in X-Agency-Code;
 * - server-side filters request active (V) TND accounts;
 * - a defensive frontend filter keeps only rows that actually belong to the
 *   selected agency, are TND and active.
 *
 * Account type exclusions are intentionally not added here until the business
 * rule is confirmed. Professional accounts may therefore be returned but the
 * mapper can mark them ineligible for commission selection.
 */
export async function getClientTndActiveAccounts(
  typePieceClient: CustomerIdType,
  noPieceClient: string,
  agencyCode: string,
): Promise<ClientData['comptes']> {
  const normalizedNoPiece = normalizeNoPiece(noPieceClient);
  const normalizedAgencyCode = normalizeAgencyCode(agencyCode);

  if (!normalizedAgencyCode) {
    throw new UserMessageError(
      'Veuillez sélectionner une agence client avant de charger les comptes.',
    );
  }

  const response = await requestBna<BnaAccountSearchResponse>(
    BNA_ENDPOINTS.accountSearch,
    {
      method: 'POST',
      agencyCode: normalizedAgencyCode,
      body: JSON.stringify({
        typePieceClient: toBnaCustomerIdType(typePieceClient),
        noPieceClient: normalizedNoPiece,
        filtres: {
          etatCompte: 'V',
          codeDevise: toCurrencyNumeric('TND'),
        },
      }),
      userMessage:
        `Les comptes TND actifs du client n’ont pas pu être chargés pour l’agence ${normalizedAgencyCode}.`,
    },
  );

  const mappedAccounts = mapClientAccounts(response.comptes || []);

  return mappedAccounts.filter(account => (
    normalizeAgencyCode(account.codeAgence) === normalizedAgencyCode
    && account.devise.trim().toUpperCase() === 'TND'
    && account.statut === 'ACTIF'
  ));
}

/**
 * BNA-CLI-001 + BNA-ACC-001.
 * @deprecated Prefer searchClientWithAgencyScope() for the new Agency client
 * selection flow. This function keeps the legacy current-agency behavior.
 */
export async function getClientCompteCom(
  typePieceClient: CustomerIdType,
  noPieceClient: string,
  knownEligibility?: ClientAgencyEligibility,
): Promise<ClientData> {
  const normalizedNoPiece = normalizeNoPiece(noPieceClient);
  const eligibility = knownEligibility
    ?? await getClientAgence(typePieceClient, normalizedNoPiece);

  if (!eligibility.eligible) {
    throw new UserMessageError(eligibility.message);
  }

  const bnaTypePiece = toBnaCustomerIdType(typePieceClient);

  const [profile, accountResponse] = await Promise.all([
    requestBna<BnaClientProfileResponse>(BNA_ENDPOINTS.clientProfile, {
      method: 'POST',
      body: JSON.stringify({
        typePiecePersonne: bnaTypePiece,
        noPiecePersonne: normalizedNoPiece,
      }),
      userMessage: 'La fiche du client n’a pas pu être chargée.',
    }),
    requestBna<BnaAccountSearchResponse>(BNA_ENDPOINTS.accountSearch, {
      method: 'POST',
      body: JSON.stringify({
        typePieceClient: bnaTypePiece,
        noPieceClient: normalizedNoPiece,
        filtres: {
          etatCompte: 'V',
          codeDevise: null,
          compteProfessionnelON: 'N',
        },
      }),
      userMessage: 'Les comptes du client n’ont pas pu être chargés.',
    }),
  ]);

  const currentAgencyCode = normalizeAgencyCode(
    accountResponse.agenceCourante
    || eligibility.currentAgency?.code,
  );

  return mapClientData(
    typePieceClient,
    profile,
    accountResponse.comptes || [],
    currentAgencyCode,
  );
}

/** Internal IBANSYS reference data — not a BNA interface. */
export async function getQuotedCurrencies(): Promise<QuotedCurrency[]> {
  return Promise.resolve(MOCK_QUOTED_CURRENCIES);
}


/**
 * Country reference used by the Donneur d'ordre LOV.
 *
 * Current temporary source: local ISO 3166-1 alpha-2 reference.
 * The selected country always exposes a normalized alpha-2 code and its
 * matching label, so PartyForm can update codePays/pays atomically.
 *
 * When the master country reference is confirmed, replace the implementation
 * of this function with the real reference call while preserving the
 * CountryOption[] contract.
 */
export async function getCountries(): Promise<CountryOption[]> {
  return Promise.resolve(buildCountryReference());
}

/** BNA-FX-001 — seller rate used for an outbound currency purchase. */
export async function getCounterValueTnd(
  codeDevise: string,
  montantOrdre: number,
): Promise<CounterValueResult> {
  const normalizedCurrency = codeDevise.trim().toUpperCase();

  if (!Number.isFinite(montantOrdre) || montantOrdre <= 0) {
    throw new UserMessageError(
      'Le montant de l’ordre doit être strictement positif.',
    );
  }

  if (normalizedCurrency === 'TND') {
    return {
      codeDevise: normalizedCurrency,
      montantOrdre,
      coursConversion: 1,
      contreValeurTnd: montantOrdre,
      indicative: true,
      dateValeur: new Date().toISOString().slice(0, 10),
    };
  }

  const dateCible = new Date().toISOString().slice(0, 10);
  const rate = await requestBna<BnaFxRateResponse>(
    BNA_ENDPOINTS.fxRates,
    {
      method: 'POST',
      body: JSON.stringify({
        codeDevise: toCurrencyNumeric(normalizedCurrency),
        dateCible,
      }),
      userMessage:
        `Le cours de la devise ${normalizedCurrency} n’a pas pu être récupéré.`,
    },
  );

  const coursConversion = toNumber(rate.coursVente, 'le cours vendeur');

  if (coursConversion <= 0) {
    throw new UserMessageError(
      `Le cours retourné pour ${normalizedCurrency} est invalide.`,
    );
  }

  return {
    codeDevise: normalizedCurrency,
    montantOrdre,
    coursConversion,
    contreValeurTnd: montantOrdre * coursConversion,
    indicative: true,
    dateValeur: rate.dateValeur,
  };
}

/** Internal IBANSYS regulatory service — not a BNA interface. */
export async function getActiveClientAuthorizations(
  _typePieceClient: CustomerIdType,
  noPieceClient: string,
): Promise<BctAuthorization[]> {
  if (!noPieceClient.trim()) return [];
  return Promise.resolve(MOCK_BCT_AUTHORIZATIONS);
}

/** REF-BIC-001 — bank lookup. */
export async function getBankByBic(bicfi: string): Promise<BankData> {
  const normalizedBic = bicfi.trim().toUpperCase();

  if (!/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(normalizedBic)) {
    throw new UserMessageError(
      'Le code BIC doit contenir 8 ou 11 caractères.',
    );
  }

  const bank = await requestBna<BnaBankResponse>(
    BNA_ENDPOINTS.bankByBic(normalizedBic),
    {
      method: 'GET',
      userMessage:
        'La banque correspondante n’a pas pu être retrouvée.',
    },
  );

  return {
    bicfi: bank.bicfi.toUpperCase(),
    nom:
      bank.bankName
      || bank.nom
      || bank.name
      || bank.raisonSociale
      || '',
    codePays:
      bank.countryCode
      || bank.countryAlpha2
      || bank.codePays
      || '',
    pays: bank.countryName || bank.pays || '',
    townName:
      bank.townName
      || bank.ville
      || bank.postalAddress?.townName
      || '',
    adresse: bank.adresse || buildAddress(bank.postalAddress),
    active: bank.active,
  };
}

/** REF-BIC-001 — Nostro route lookup by alphabetic currency code. */
export async function getNostroAccount(
  currency: string,
): Promise<NostroAccount> {
  const normalizedCurrency = currency.trim().toUpperCase();

  const response = await requestBna<BnaNostroResponse>(
    BNA_ENDPOINTS.nostro(normalizedCurrency),
    {
      method: 'GET',
      userMessage:
        'Le compte de règlement correspondant n’a pas pu être récupéré.',
    },
  );

  return response;
}

/** BNA-FUND-001. Should normally be called by the MS-TR backend/BFF. */
export async function blockFunds(
  request: FundsBlockRequest,
): Promise<FundsBlockResult> {
  const response = await requestBna<BnaFundsBlockResponse>(
    BNA_ENDPOINTS.fundsBlock,
    {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        typePieceClient: toBnaCustomerIdType(request.typePieceClient),
        noPieceClient: normalizeNoPiece(request.noPieceClient),
        codeDevise: toCurrencyNumeric(request.codeDevise),
      }),
      userMessage: 'La demande de blocage des fonds n’a pas abouti.',
    },
  );

  if (response.statut === 'KO') {
    return {
      statut: 'KO',
      codeErreur: response.codeErreur || 'BLOCKING_REJECTED',
      messageErreur:
        response.messageErreur || 'La demande de blocage a été refusée.',
    };
  }

  return {
    statut: 'OK',
    referenceBlocage: response.referenceBlocage || '',
    montantEffectivementBloque:
      response.montantEffectivementBloque || 0,
    montantRestantBloque: response.montantRestantBloque || 0,
    codeDevise: toCurrencyAlpha(response.codeDevise || 0),
  };
}

/** BNA-FUND-002. Should normally be called by the MS-TR backend/BFF. */
export async function releaseFunds(
  request: FundsReleaseRequest,
): Promise<FundsReleaseResult> {
  const response = await requestBna<BnaFundsReleaseResponse>(
    BNA_ENDPOINTS.fundsRelease,
    {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        typePieceClient: toBnaCustomerIdType(request.typePieceClient),
        noPieceClient: normalizeNoPiece(request.noPieceClient),
        codeDevise: toCurrencyNumeric(request.codeDevise),
      }),
      userMessage: 'La demande de déblocage des fonds n’a pas abouti.',
    },
  );

  if (response.statut === 'KO') {
    return {
      statut: 'KO',
      motifEchec:
        response.motifEchec || 'La demande de déblocage a été refusée.',
    };
  }

  return {
    statut: 'OK',
    montantEffectivementLibere:
      response.montantEffectivementLibere || 0,
    montantRestantBloque: response.montantRestantBloque || 0,
    codeDevise: toCurrencyAlpha(response.codeDevise || 0),
    referenceDeblocage: response.referenceDeblocage,
  };
}

/** BNA-FIN-001. */
export async function searchFinancingResources(
  criteria: FinancingResourceSearchCriteria,
): Promise<FinancingResource[]> {
  const response = await requestBna<BnaFinancingSearchResponse>(
    BNA_ENDPOINTS.financingSearch,
    {
      method: 'POST',
      body: JSON.stringify({
        ...criteria,
        typePieceClient: toBnaCustomerIdType(criteria.typePieceClient),
        noPieceClient: normalizeNoPiece(criteria.noPieceClient),
        codeDevise: criteria.codeDevise
          ? toCurrencyNumeric(criteria.codeDevise)
          : undefined,
      }),
      userMessage:
        'Les ressources de financement n’ont pas pu être chargées.',
    },
  );

  return response.ressources.map(resource => ({
    ...resource,
    codeDeviseRessource: toCurrencyAlpha(
      resource.codeDeviseRessource,
    ),
  }));
}

/** BNA-FIN-002. Should normally be called by the MS-TR backend/BFF. */
export async function allocateFinancingResource(
  request: FinancingAllocationRequest,
): Promise<FinancingAllocationResult> {
  const response = await requestBna<BnaFinancingAllocationResponse>(
    BNA_ENDPOINTS.financingAllocate,
    {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        typePieceClient: toBnaCustomerIdType(request.typePieceClient),
        noPieceClient: normalizeNoPiece(request.noPieceClient),
        codeDeviseRessource: toCurrencyNumeric(
          request.codeDeviseRessource,
        ),
        codeDeviseTransfert: toCurrencyNumeric(
          request.codeDeviseTransfert,
        ),
      }),
      userMessage:
        'La ressource de financement n’a pas pu être réservée.',
    },
  );

  if (response.statut === 'KO') {
    return {
      statut: 'KO',
      codeErreur:
        response.codeErreur || 'FINANCING_ALLOCATION_REJECTED',
      messageErreur:
        response.messageErreur
        || 'La réservation de la ressource a été refusée.',
    };
  }

  return {
    statut: 'OK',
    referenceAffectation: response.referenceAffectation || '',
    montantEffectivementAffecte:
      response.montantEffectivementAffecte || 0,
    codeDeviseRessource: toCurrencyAlpha(
      response.codeDeviseRessource || 0,
    ),
    reliquatDisponible: response.reliquatDisponible,
  };
}

/** BNA-FIN-003. Should normally be called by the MS-TR backend/BFF. */
export async function releaseFinancingResource(
  request: FinancingReleaseRequest,
): Promise<FinancingReleaseResult> {
  const response = await requestBna<BnaFinancingReleaseResponse>(
    BNA_ENDPOINTS.financingRelease,
    {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        codeDeviseRessource: toCurrencyNumeric(
          request.codeDeviseRessource,
        ),
      }),
      userMessage:
        'La ressource de financement n’a pas pu être libérée.',
    },
  );

  if (response.statut === 'KO') {
    return {
      statut: 'KO',
      codeErreur: response.codeErreur,
      messageErreur: response.messageErreur,
      motifEchec: response.motifEchec,
    };
  }

  return {
    statut: 'OK',
    montantEffectivementLibere:
      response.montantEffectivementLibere || 0,
    reliquatAffecte: response.reliquatAffecte,
    message: response.message,
  };
}

/** BNA-ACC-IMPACT-001 — asynchronous reception ACK. */
export async function sendAccountImpact(
  payload: Record<string, unknown>,
): Promise<AsyncReceptionAck> {
  return requestBna<BnaAsyncAck>(BNA_ENDPOINTS.accountingImpacts, {
    method: 'POST',
    body: JSON.stringify(payload),
    userMessage: 'L’impact comptable n’a pas pu être transmis.',
  });
}

/** BNA-CRO-001 — asynchronous reception ACK. */
export async function sendCro(
  payload: Record<string, unknown>,
): Promise<AsyncReceptionAck> {
  return requestBna<BnaAsyncAck>(BNA_ENDPOINTS.accountingCro, {
    method: 'POST',
    body: JSON.stringify(payload),
    userMessage: 'Le compte rendu d’opération n’a pas pu être transmis.',
  });
}

/** BNA-BO-001 — asynchronous reception ACK. */
export async function sendBackOfficeFlow(
  payload: Record<string, unknown>,
): Promise<AsyncReceptionAck> {
  return requestBna<BnaAsyncAck>(BNA_ENDPOINTS.backOfficeFlows, {
    method: 'POST',
    body: JSON.stringify(payload),
    userMessage: 'Le flux Back-office n’a pas pu être transmis.',
  });
}

/** BNA-BO-002. */
export async function queryBackOfficeResult(
  referenceOperationIbansys: string,
): Promise<BackOfficeResult> {
  return requestBna<BnaBackOfficeResult>(
    BNA_ENDPOINTS.backOfficeResults,
    {
      method: 'POST',
      body: JSON.stringify({ referenceOperationIbansys }),
      userMessage:
        'Le résultat Back-office n’a pas pu être consulté.',
    },
  );
}

/** BNA-DOC-001 — mock document metadata creation. */
export async function createDocumentReference(
  payload: Record<string, unknown>,
): Promise<{ statut: 'OK'; documentId: string }> {
  return requestBna<BnaDocumentCreateResponse>(BNA_ENDPOINTS.documents, {
    method: 'POST',
    body: JSON.stringify(payload),
    userMessage: 'La référence du document n’a pas pu être créée.',
  });
}

export async function listDocumentReferences(): Promise<DocumentReference[]> {
  const response = await requestBna<BnaDocumentListResponse>(
    BNA_ENDPOINTS.documents,
    {
      method: 'GET',
      userMessage: 'Les documents n’ont pas pu être consultés.',
    },
  );

  return response.documents as DocumentReference[];
}

/**
 * AgencyIntegrationApi — direct temporary integration.
 *
 * finalize=false is intentional: agency initiation creates a draft only.
 * It must not block funds, reserve financing/TCE resources or create an
 * imputation. MS-WF will orchestrate this command later.
 */
export async function submitAgencyInitiation(
  payload: TransferSubmissionPayload,
  options: {
    /** Agency selected after the accounts/habilitations intersection. */
    branchCode: string;
    operationRef?: string | null;
    idempotencyKey?: string;
  },
): Promise<AgencyInitiationResult> {
  const branchCode = normalizeAgencyCode(options.branchCode);

  if (!branchCode) {
    throw new UserMessageError(
      'Veuillez sélectionner une agence client avant de poursuivre.',
    );
  }

  const command = buildAgencyInitiationCommand(
    payload,
    options.operationRef ?? null,
  );
  const idempotencyKey =
    options.idempotencyKey
    || createAgencyInitiationIdempotencyKey();

  const response = await requestMsTr<AgencyWorkflowCommandResponse>(
    `${MS_TR_ENDPOINTS.agencyWorkflowCommand}?finalize=false`,
    {
      method: 'POST',
      body: JSON.stringify(command),
      idempotencyKey,
      branchCode,
      userMessage:
        "Le brouillon de l'opération n'a pas pu être créé dans MS-TR.",
    },
  );

  return normalizeAgencyInitiationResponse(response);
}

/** Internal MS-DOMI service — no corresponding BNA endpoint. */
export async function verifyTce(
  search: TceSearchData,
  client: ClientData,
): Promise<TCEResult> {
  if (!search.codeTitre || !search.numDomi || !search.dateDomi) {
    throw new UserMessageError(
      'Le code titre, le numéro et la date de domiciliation sont obligatoires.',
    );
  }

  if (search.numDomi.toUpperCase() === 'DOM-ERROR') {
    return {
      state: 'error',
      codeTitre: search.codeTitre,
      numDomi: search.numDomi,
      dateDomi: search.dateDomi,
      devise: 'EUR',
      montantDispo: '0,000',
      appartient: false,
      typeEchec: 'Bloquante',
      codeErreur: 'TCE_NOT_OWNER',
      libelleErreur:
        `Le TCE n'appartient pas au client ${client.nomRaison}.`,
    };
  }

  return {
    ...MOCK_TCE,
    codeTitre: search.codeTitre,
    numDomi: search.numDomi,
    dateDomi: search.dateDomi,
  };
}
