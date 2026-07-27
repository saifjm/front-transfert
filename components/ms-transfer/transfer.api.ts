import type {
  AgencyInfo,
  BankData,
  BctAuthorization,
  ClientData,
  CounterValueResult,
  CustomerIdType,
  QuotedCurrency,
  TCEResult,
  TceSearchData,
} from './transfer.types';
import {
  MOCK_AGENCIES,
  MOCK_BANKS,
  MOCK_BCT_AUTHORIZATIONS,
  MOCK_CLIENT,
  MOCK_QUOTED_CURRENCIES,
  MOCK_RATES,
  MOCK_TCE,
  MOCK_TOTAL_EXPORTER_CLIENT,
} from './transfer.mock';

const wait = <T,>(value: T, delay = 450): Promise<T> =>
  new Promise(resolve => window.setTimeout(() => resolve(value), delay));

const filterEligibleAccounts = (client: ClientData): ClientData => ({
  ...client,
  comptes: client.comptes.filter(
    account =>
      account.statut === 'ACTIF'
      && !account.professionnel
      && (account.devise === 'TND' || account.principal),
  ),
});

/** [AUTH] getAgenceUser(typePieceClient, noPieceClient) — BFF/session context. */
export async function getUserAgencies(
  _typePieceClient: CustomerIdType,
  _noPieceClient: string,
): Promise<AgencyInfo[]> {
  return wait(MOCK_AGENCIES);
}

/** [REF-BQ] getClientCompteCom(typePieceClient, noPieceClient, listAgenceUser). */
export async function getClientCompteCom(
  _typePieceClient: CustomerIdType,
  noPieceClient: string,
  agencies: AgencyInfo[],
): Promise<ClientData> {
  if (!agencies.length) {
    throw new Error("Aucune agence n'est autorisée pour l'utilisateur connecté.");
  }

  if (noPieceClient === '12345678') {
    return wait(filterEligibleAccounts(MOCK_CLIENT), 700);
  }

  if (noPieceClient === '1234') {
    return wait(filterEligibleAccounts(MOCK_TOTAL_EXPORTER_CLIENT), 700);
  }

  throw new Error('Client introuvable ou non autorisé pour cette opération.');
}

/** [REF] getDeviseCotee. */
export async function getQuotedCurrencies(): Promise<QuotedCurrency[]> {
  return wait(MOCK_QUOTED_CURRENCIES);
}

/** [REF-BQ] getContreValeurTnd(codeDevise, montantOrdre). */
export async function getCounterValueTnd(
  codeDevise: string,
  montantOrdre: number,
): Promise<CounterValueResult> {
  const rate = MOCK_RATES[codeDevise];
  if (!rate) {
    throw new Error(`La devise ${codeDevise} n'est pas cotée.`);
  }

  return wait({
    codeDevise,
    montantOrdre,
    coursConversion: rate,
    contreValeurTnd: montantOrdre * rate,
    indicative: true,
  });
}

/** [MS-REGLEMENTAIRE] getAutorisationActiveClient(typePieceClient, noPieceClient). */
export async function getActiveClientAuthorizations(
  _typePieceClient: CustomerIdType,
  noPieceClient: string,
): Promise<BctAuthorization[]> {
  if (!noPieceClient) return [];
  return wait(MOCK_BCT_AUTHORIZATIONS, 600);
}

/** TODO endpoint REF/SWIFT directory: search bank data by BICFI. */
export async function getBankByBic(bicfi: string): Promise<BankData> {
  const bank = MOCK_BANKS[bicfi.trim().toUpperCase()];
  if (!bank) {
    throw new Error('BICFI introuvable dans le référentiel bancaire.');
  }
  return wait(bank, 550);
}

/** Existing MS-DOMI verification used by the regulatory support section. */
export async function verifyTce(
  search: TceSearchData,
  client: ClientData,
): Promise<TCEResult> {
  if (!search.codeTitre || !search.numDomi || !search.dateDomi) {
    throw new Error('Le code titre, le numéro et la date de domiciliation sont obligatoires.');
  }

  if (search.numDomi.toUpperCase() === 'DOM-ERROR') {
    return wait({
      state: 'error',
      codeTitre: search.codeTitre,
      numDomi: search.numDomi,
      dateDomi: search.dateDomi,
      devise: 'EUR',
      montantDispo: '0,000',
      appartient: false,
      typeEchec: 'Bloquante',
      codeErreur: 'TCE_NOT_OWNER',
      libelleErreur: `Le TCE n'appartient pas au client ${client.nomRaison}.`,
    });
  }

  return wait({
    ...MOCK_TCE,
    codeTitre: search.codeTitre,
    numDomi: search.numDomi,
    dateDomi: search.dateDomi,
  }, 750);
}
