import { UserMessageError } from './transfer.errors';
import type { ClientAgencyOption } from './transfer.client-agency';
import type {
  AgencyWorkflowCommandResponse,
} from './transfer.agency-initiation.contracts';
import type {
  RefAccountSearchResponse,
  RefAuthorizationResponse,
  RefBankResponse,
  RefCoursJourneeAvaResponse,
  RefDeviseListResponse,
  RefNostroResponse,
  RefPaysListResponse,
  RefPersonneResponse,
  RefPersonneSearchResponse,
} from './transfer.ref.contracts';
import type { DomiTceDetailResponse } from './transfer.domi.contracts';
import {
  findRefPersonne,
  mapRefAccountRows,
  mapRefDeviseToQuotedCurrency,
  mapRefPaysToCountryOption,
  mapRefPersonneToClientData,
} from './transfer.ref.mappers';
import { buildAgencyInitiationCommand } from './transfer.agency-initiation.mapper';
import {
  MOCK_BCT_AUTHORIZATIONS,
} from './transfer.mock';
import type {
  BnaAsyncAck,
  BnaBackOfficeResult,
  BnaDocumentCreateResponse,
  BnaDocumentListResponse,
  BnaErrorPayload,
  BnaFinancingAllocationResponse,
  BnaFinancingReleaseResponse,
  BnaFinancingSearchResponse,
  BnaFundsBlockResponse,
  BnaFundsReleaseResponse,
} from './transfer.api.contracts';
import {
  buildAddress,
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

const REF_API_BASE_URL = String(
  import.meta.env.VITE_REF_API_BASE_URL || '/api/ref',
).replace(/\/+$/, '');

const DOMI_API_BASE_URL = String(
  import.meta.env.VITE_DOMI_API_BASE_URL || '/api/domi',
).replace(/\/+$/, '');

const MS_TR_API_BASE_URL = String(
  import.meta.env.VITE_MS_TR_API_BASE_URL || '/api/ms-tr',
).replace(/\/+$/, '');

const BNA_MOCK_USER_ID = String(
  import.meta.env.VITE_DEV_USER_ID || '',
).trim();

const BNA_ENDPOINTS = {
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
} as const;

const REF_ENDPOINTS = {
  authorizations: `${REF_API_BASE_URL}/ibansys/authorizations`,
  personneByNoPiece: (noPiecePersonne: string) =>
    `${REF_API_BASE_URL}/personnes/by-nopiececlient/${encodeURIComponent(noPiecePersonne)}`,
  accountSearch: `${REF_API_BASE_URL}/ibansys/comptes/search`,
  devisesCotes: `${REF_API_BASE_URL}/ibansys/devises/cotes`,
  pays: `${REF_API_BASE_URL}/pays/getall`,
  bankByBic: (bicfi: string) =>
    `${REF_API_BASE_URL}/ibansys/banques/by-bic/${encodeURIComponent(bicfi)}`,
  nostroBySigle: (sigle: string) =>
    `${REF_API_BASE_URL}/ibansys/nostro/by-sigle/${encodeURIComponent(sigle)}`,
  coursJourneeAva: (codeDevise: string | number, dateJournee: string) =>
    `${REF_API_BASE_URL}/cours-journee-ava/${encodeURIComponent(String(codeDevise))}/${encodeURIComponent(dateJournee)}`,
} as const;

const DOMI_ENDPOINTS = {
  tceDetail: (
    codeTitre: string,
    numDom: string,
    dateDom: string,
    idClient: string,
  ) => {
    const query = new URLSearchParams({
      codeTitre,
      numDom,
      dateDom,
      idClient,
    });

    return `${DOMI_API_BASE_URL}/ressources/detail_TCE?${query.toString()}`;
  },
} as const;

const MS_TR_ENDPOINTS = {
  agencyWorkflowCommand: `${MS_TR_API_BASE_URL}/operations/workflow-command`,
} as const;

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

interface RefRequestOptions extends RequestInit {
  userMessage: string;
}

interface DomiRequestOptions extends RequestInit {
  userMessage: string;
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

async function requestRef<T>(
  url: string,
  { userMessage, headers, ...init }: RefRequestOptions,
): Promise<T> {
  if (!REF_API_BASE_URL) {
    throw new UserMessageError(
      'Le service de référence client n’est pas configuré.',
    );
  }

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');

  if (!finalHeaders.has('X-Correlation-Id')) {
    finalHeaders.set('X-Correlation-Id', createCorrelationId());
  }

  let response: Response;

  try {
    response = await window.fetch(url, {
      ...init,
      headers: Object.fromEntries(finalHeaders.entries()),
      credentials: 'same-origin',
    });
  } catch (error) {
    console.error('[REF API] Network error', { url, error });
    throw error instanceof UserMessageError
      ? error
      : new UserMessageError(userMessage);
  }

  const rawPayload = await readJson<unknown>(response);

  if (!response.ok) {
    const payload =
      rawPayload && typeof rawPayload === 'object'
        ? rawPayload as { message?: string; messageErreur?: string }
        : null;

    throw new UserMessageError(
      payload?.message
      || payload?.messageErreur
      || userMessage,
    );
  }

  if (rawPayload == null) {
    throw new UserMessageError(userMessage);
  }

  return unwrapPayload<T>(rawPayload);
}

export async function searchRefPersonnesByNoPiece(
  noPieceClient: string,
): Promise<RefPersonneSearchResponse> {
  const normalizedNoPiece = normalizeNoPiece(noPieceClient);

  if (!normalizedNoPiece) {
    throw new UserMessageError(
      'Le numéro de pièce ou identifiant client est obligatoire.',
    );
  }

  const response = await requestRef<RefPersonneSearchResponse>(
    REF_ENDPOINTS.personneByNoPiece(normalizedNoPiece),
    {
      method: 'GET',
      userMessage:
        'La recherche du client dans le référentiel n’a pas pu aboutir.',
    },
  );

  return Array.isArray(response) ? response : [];
}

export async function getRefPersonneByNoPiece(
  typePieceClient: CustomerIdType,
  noPieceClient: string,
): Promise<RefPersonneResponse> {
  const normalizedNoPiece = normalizeNoPiece(noPieceClient);
  const expectedTypePiece = toBnaCustomerIdType(typePieceClient);
  const response = await searchRefPersonnesByNoPiece(
    normalizedNoPiece,
  );

  const personne = findRefPersonne(
    response,
    expectedTypePiece,
    normalizedNoPiece,
  );

  if (!personne) {
    throw new UserMessageError(
      'Aucun client ne correspond au numéro et au type de pièce renseignés.',
    );
  }

  return personne;
}

async function requestDomi<T>(
  url: string,
  { userMessage, headers, ...init }: DomiRequestOptions,
): Promise<T> {
  if (!DOMI_API_BASE_URL) {
    throw new UserMessageError(
      'Le service de domiciliation n’est pas configuré.',
    );
  }

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  finalHeaders.set('Content-Type', 'application/json');

  if (!finalHeaders.has('X-Correlation-Id')) {
    finalHeaders.set('X-Correlation-Id', createCorrelationId());
  }

  let response: Response;

  try {
    response = await window.fetch(url, {
      ...init,
      headers: Object.fromEntries(finalHeaders.entries()),
      credentials: 'same-origin',
    });
  } catch (error) {
    console.error('[DOMI API] Network error', { url, error });
    throw error instanceof UserMessageError
      ? error
      : new UserMessageError(userMessage);
  }

  const rawPayload = await readJson<unknown>(response);

  if (!response.ok) {
    const payload = rawPayload && typeof rawPayload === 'object'
      ? rawPayload as {
          message?: string;
          messageErreur?: string;
          Libelle_Erreur?: string;
        }
      : null;

    throw new UserMessageError(
      payload?.message
      || payload?.messageErreur
      || payload?.Libelle_Erreur
      || userMessage,
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
): Promise<RefAuthorizationResponse> {
  const context = getTransferRequestContext();
  const agencyCode = requireSessionAgencyCode();
  const userId = String(context.userId || '').trim();

  if (!userId) {
    throw new UserMessageError(
      "L'identifiant de l'utilisateur connecté est indisponible.",
    );
  }

  return requestRef<RefAuthorizationResponse>(
    REF_ENDPOINTS.authorizations,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agency-Code': agencyCode,
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        typePieceClient: toBnaCustomerIdType(typePieceClient),
        noPieceClient: normalizeNoPiece(noPieceClient),
      }),
      userMessage:
        'La vérification des habilitations agence est momentanément indisponible.',
    },
  );
}

function resolveAuthorizedAgencies(
  response: RefAuthorizationResponse,
  currentAgencyCode: string,
): ClientAgencyEligibility['authorizedAgencies'] {
  const agencies = response.agencesAutorisees.map(toAgencyInfo);

  // The supplied contract may return an empty `agencesAutorisees` while
  // `habilite=true` for `agenceCourante`. In that case the current agency is
  // itself an authorized agency and must not disappear from the LOV scope.
  if (
    response.habilite
    && currentAgencyCode
    && !agencies.some(agency => agency.code === currentAgencyCode)
  ) {
    agencies.unshift(toAgencyInfo(currentAgencyCode));
  }

  return agencies;
}

/** REF — strict current-agency eligibility check. */
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
  const authorizedAgencies = resolveAuthorizedAgencies(
    response,
    currentAgencyCode,
  );
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

function toAgencyCodeNumber(agencyCode: string): number {
  const value = Number(normalizeAgencyCode(agencyCode));

  if (!Number.isInteger(value) || value < 0) {
    throw new UserMessageError(
      'Le code agence sélectionné est invalide.',
    );
  }

  return value;
}

/**
 * REF authorizations + REF person.
 *
 * The authorization contract already exposes both `agencesAutorisees` and
 * `clientAgences`; therefore the agency LOV is obtained directly from their
 * intersection. There is no reason to probe a legacy BNA profile or to query
 * every agency account during client identification.
 *
 * Accounts are deliberately loaded later, only after the operator selects the
 * client agency, through getClientTndActiveAccounts().
 */
export async function searchClientWithAgencyScope(
  typePieceClient: CustomerIdType,
  noPieceClient: string,
): Promise<ClientAgencyScopedSearchResult> {
  const normalizedNoPiece = normalizeNoPiece(noPieceClient);
  const sessionAgencyCode = requireSessionAgencyCode();

  const [authorizationResponse, refPersonne] = await Promise.all([
    requestClientAuthorization(typePieceClient, normalizedNoPiece),
    getRefPersonneByNoPiece(typePieceClient, normalizedNoPiece),
  ]);

  const currentAgencyCode = normalizeAgencyCode(
    authorizationResponse.agenceCourante || sessionAgencyCode,
  );
  const authorizedAgencies = resolveAuthorizedAgencies(
    authorizationResponse,
    currentAgencyCode,
  );
  const clientAgencies = authorizationResponse.clientAgences
    .map(toAgencyInfo);
  const clientAgencyCodes = new Set(
    clientAgencies
      .map(agency => normalizeAgencyCode(agency.code))
      .filter(Boolean),
  );

  const eligibleAgencies = authorizedAgencies.filter(agency =>
    clientAgencyCodes.has(normalizeAgencyCode(agency.code)),
  );

  const client = mapRefPersonneToClientData(
    refPersonne,
    typePieceClient,
    currentAgencyCode,
    [],
  );

  const currentAgency = currentAgencyCode
    ? toAgencyInfo(currentAgencyCode)
    : null;
  const clientAgency =
    clientAgencies.find(agency => agency.code === currentAgencyCode)
    || clientAgencies[0]
    || null;
  const eligible = eligibleAgencies.length > 0;
  const reason: ClientAgencyEligibilityReason = eligible
    ? 'ELIGIBLE'
    : mapEligibilityReason(authorizationResponse.codeMotifRefus);

  const authorization: ClientAgencyEligibility = {
    eligible,
    currentAgency,
    authorizedAgencies,
    clientAgencies,
    reason,
    message: eligible
      ? 'Au moins une agence disponible permet d’initier l’opération pour ce client.'
      : eligibilityMessage(reason),
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
 * REF — operational accounts for the selected client agency.
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

  const response = await requestRef<RefAccountSearchResponse>(
    REF_ENDPOINTS.accountSearch,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agency-Code': normalizedAgencyCode,
      },
      body: JSON.stringify({
        typePieceClient: toBnaCustomerIdType(typePieceClient),
        noPieceClient: normalizedNoPiece,
        filtres: {
          etatCompte: 'V',
          codeDevise: toCurrencyNumeric('TND'),
        },
        codeAgence: toAgencyCodeNumber(normalizedAgencyCode),
      }),
      userMessage:
        `Les comptes TND actifs du client n’ont pas pu être chargés pour l’agence ${normalizedAgencyCode}.`,
    },
  );

  const mappedAccounts = mapRefAccountRows(response.comptes || []);

  return mappedAccounts.filter(account => (
    normalizeAgencyCode(account.codeAgence) === normalizedAgencyCode
    && account.devise.trim().toUpperCase() === 'TND'
    && account.statut === 'ACTIF'
  ));
}

/**
 * @deprecated Prefer searchClientWithAgencyScope() for the agency-selection
 * flow. Kept only for older callers, but it is now fully backed by REF.
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

  const agencyCode = normalizeAgencyCode(
    eligibility.currentAgency?.code || requireSessionAgencyCode(),
  );

  const [personne, accountResponse] = await Promise.all([
    getRefPersonneByNoPiece(typePieceClient, normalizedNoPiece),
    requestRef<RefAccountSearchResponse>(REF_ENDPOINTS.accountSearch, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agency-Code': agencyCode,
      },
      body: JSON.stringify({
        typePieceClient: toBnaCustomerIdType(typePieceClient),
        noPieceClient: normalizedNoPiece,
        filtres: {
          etatCompte: 'V',
          compteProfessionnelON: 'N',
        },
        codeAgence: toAgencyCodeNumber(agencyCode),
      }),
      userMessage: 'Les comptes du client n’ont pas pu être chargés.',
    }),
  ]);

  return mapRefPersonneToClientData(
    personne,
    typePieceClient,
    agencyCode,
    mapRefAccountRows(accountResponse.comptes || []),
  );
}

/** REF — quoted currencies. */
export async function getQuotedCurrencies(): Promise<QuotedCurrency[]> {
  const response = await requestRef<RefDeviseListResponse>(
    REF_ENDPOINTS.devisesCotes,
    {
      method: 'GET',
      userMessage: 'La liste des devises n’a pas pu être chargée.',
    },
  );

  return response
    .filter(devise => devise.isCote !== false)
    .map(mapRefDeviseToQuotedCurrency)
    .filter(currency => /^[A-Z]{3}$/.test(currency.code))
    .sort((left, right) => left.code.localeCompare(right.code));
}

/** REF — country reference. */
export async function getCountries(): Promise<CountryOption[]> {
  const response = await requestRef<RefPaysListResponse>(
    REF_ENDPOINTS.pays,
    {
      method: 'GET',
      userMessage: 'La liste des pays n’a pas pu être chargée.',
    },
  );

  return response
    .map(mapRefPaysToCountryOption)
    .filter(country => /^[A-Z]{2}$/.test(country.alpha2))
    .sort((left, right) =>
      left.label.localeCompare(right.label, 'fr-FR', {
        sensitivity: 'base',
      }),
    );
}

/** REF — daily rate used for the indicative TND counter-value. */
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

  const dateJournee = new Date().toISOString().slice(0, 10);
  const numericCurrency = toCurrencyNumeric(normalizedCurrency);
  const rate = await requestRef<RefCoursJourneeAvaResponse>(
    REF_ENDPOINTS.coursJourneeAva(numericCurrency, dateJournee),
    {
      method: 'GET',
      userMessage:
        `Le cours de la devise ${normalizedCurrency} n’a pas pu être récupéré.`,
    },
  );

  const coursConversion = toNumber(rate.cours, 'le cours de conversion');

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
    dateValeur: rate.dateJournee,
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

  const bank = await requestRef<RefBankResponse>(
    REF_ENDPOINTS.bankByBic(normalizedBic),
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

/** REF — Nostro route lookup by currency sigle. */
export async function getNostroAccount(
  currency: string,
): Promise<NostroAccount> {
  const normalizedCurrency = currency.trim().toUpperCase();

  const response = await requestRef<RefNostroResponse[]>(
    REF_ENDPOINTS.nostroBySigle(normalizedCurrency),
    {
      method: 'GET',
      userMessage:
        'Le compte de règlement correspondant n’a pas pu être récupéré.',
    },
  );

  const nostro =
    response.find(item =>
      String(item.currency || '').trim().toUpperCase()
        === normalizedCurrency,
    )
    || response[0];

  if (!nostro) {
    throw new UserMessageError(
      `Aucun compte Nostro n’est configuré pour la devise ${normalizedCurrency}.`,
    );
  }

  return {
    currency:
      String(nostro.currency || normalizedCurrency)
        .trim()
        .toUpperCase(),
    accountRef:
      nostro.accountRef
      || nostro.cptNostro
      || nostro.cptIban
      || nostro.compteReel
      || '',
    bicfi: nostro.bicfi || '',
    routeType: nostro.routeType || '',
  };
}

/** BNA mock fallback — no real equivalent supplied yet. */
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

/** BNA mock fallback — no real equivalent supplied yet. */
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

/** BNA mock fallback — no real equivalent supplied yet. */
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

/** BNA mock fallback — no real equivalent supplied yet. */
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

/** BNA mock fallback — no real equivalent supplied yet. */
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

/** BNA mock fallback — no real accounting-impact equivalent supplied yet. */
export async function sendAccountImpact(
  payload: Record<string, unknown>,
): Promise<AsyncReceptionAck> {
  return requestBna<BnaAsyncAck>(BNA_ENDPOINTS.accountingImpacts, {
    method: 'POST',
    body: JSON.stringify(payload),
    userMessage: 'L’impact comptable n’a pas pu être transmis.',
  });
}

/** BNA mock fallback — no real CRO equivalent supplied yet. */
export async function sendCro(
  payload: Record<string, unknown>,
): Promise<AsyncReceptionAck> {
  return requestBna<BnaAsyncAck>(BNA_ENDPOINTS.accountingCro, {
    method: 'POST',
    body: JSON.stringify(payload),
    userMessage: 'Le compte rendu d’opération n’a pas pu être transmis.',
  });
}

/** BNA mock fallback — no real Back-office send equivalent supplied yet. */
export async function sendBackOfficeFlow(
  payload: Record<string, unknown>,
): Promise<AsyncReceptionAck> {
  return requestBna<BnaAsyncAck>(BNA_ENDPOINTS.backOfficeFlows, {
    method: 'POST',
    body: JSON.stringify(payload),
    userMessage: 'Le flux Back-office n’a pas pu être transmis.',
  });
}

/** BNA mock fallback — no real Back-office result equivalent supplied yet. */
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

/** DOMI — TCE detail and ownership validation. */
export async function verifyTce(
  search: TceSearchData,
  client: ClientData,
): Promise<TCEResult> {
  if (!search.codeTitre || !search.numDomi || !search.dateDomi) {
    throw new UserMessageError(
      'Le code titre, le numéro et la date de domiciliation sont obligatoires.',
    );
  }

  if (!client.idClient?.trim()) {
    throw new UserMessageError(
      'La référence du client est obligatoire pour vérifier le TCE.',
    );
  }

  const response = await requestDomi<DomiTceDetailResponse>(
    DOMI_ENDPOINTS.tceDetail(
      search.codeTitre.trim(),
      search.numDomi.trim(),
      search.dateDomi,
      client.idClient.trim(),
    ),
    {
      method: 'GET',
      userMessage:
        'Le titre de commerce extérieur n’a pas pu être vérifié.',
    },
  );

  const failed = String(response.etat ?? '').trim().toUpperCase() === 'F';
  const failureType = String(response.type_fail ?? '').trim().toUpperCase();

  const state: TCEResult['state'] = failed
    ? failureType === 'A'
      ? 'warning'
      : 'error'
    : response.titreAppartientClient === false
      ? 'error'
      : 'success';

  const typeEchec = failed
    ? failureType === 'B'
      ? 'Bloquante'
      : failureType === 'A'
        ? 'Alerte'
        : response.type_fail || undefined
    : undefined;

  return {
    state,
    codeTitre: search.codeTitre,
    numDomi: search.numDomi,
    dateDomi: response.dateDomiciliation || search.dateDomi,
    devise: response.deviseTitre == null ? '' : String(response.deviseTitre),
    montantDispo:
      response.montantDisponible == null
        ? ''
        : String(response.montantDisponible),
    appartient: response.titreAppartientClient === true,
    typeEchec,
    codeErreur: response.Code_status || undefined,
    libelleErreur: response.Libelle_Erreur || undefined,
  };
}
