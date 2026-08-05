import { authenticatedFetch } from '../../utils/api';
import { UserMessageError } from './transfer.errors';
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
  mapClientData,
  toAgencyInfo,
  toBnaCustomerIdType,
  toCurrencyAlpha,
  toCurrencyNumeric,
  toNumber,
} from './transfer.mappers';
import {
  getTransferRequestContext,
  normalizeAgencyCode,
  requireSessionAgencyCode,
} from './transfer.session';
import type {
  AsyncReceptionAck,
  BackOfficeResult,
  BankData,
  BctAuthorization,
  ClientAgencyEligibility,
  ClientAgencyEligibilityReason,
  ClientData,
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
} from './transfer.types';

const BNA_API_BASE_URL = String(
  import.meta.env.VITE_BNA_API_BASE_URL || '/api/v1/bna',
).replace(/\/+$/, '');

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

interface RequestOptions extends RequestInit {
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

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const context = getTransferRequestContext();

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');
  headers.set('X-Correlation-Id', createCorrelationId());
  headers.set('X-User-Id', 'U00458');
  headers.set('X-Role-Code', context.roleCode);
  headers.set('X-Agency-Code', '012');

  if (context.orgNodeId) {
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
  { userMessage, headers, ...init }: RequestOptions,
): Promise<T> {

  const finalHeaders = buildHeaders(headers);

  console.log('[BNA REQUEST]', {
    url,
    method: init.method,
    headers: Object.fromEntries(finalHeaders.entries()),
    body: init.body,
  });

  let response: Response;

  try {
    response = await authenticatedFetch(url, {
      ...init,
      headers: finalHeaders,
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

/** BNA-AUTH-001 — strict current-agency eligibility check. */
export async function getClientAgence(
  typePieceClient: CustomerIdType,
  noPieceClient: string,
): Promise<ClientAgencyEligibility> {
  const normalizedNoPiece = normalizeNoPiece(noPieceClient);
  const sessionAgencyCode = requireSessionAgencyCode();

  const response = await requestBna<BnaAuthorizationResponse>(
    BNA_ENDPOINTS.verifyAuthorization,
    {
      method: 'POST',
      body: JSON.stringify({
        typePieceClient: toBnaCustomerIdType(typePieceClient),
        noPieceClient: normalizedNoPiece,
      }),
      userMessage:
        'La vérification de l’éligibilité du client est momentanément indisponible.',
    },
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

/** BNA-CLI-001 + BNA-ACC-001. */
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
