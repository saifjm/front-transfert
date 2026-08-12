import type {
  AccountRow,
  ClientData,
  CountryOption,
  CustomerIdType,
  QuotedCurrency,
} from './transfer.types';
import type {
  RefAccountRowResponse,
  RefDeviseResponse,
  RefPaysResponse,
  RefPersonneResponse,
} from './transfer.ref.contracts';
import { normalizeAgencyCode } from './transfer.session';
import { toCurrencyAlpha } from './transfer.mappers';

function clean(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

function upper(value: string | null | undefined): string {
  return clean(value).toUpperCase();
}

function joinAddressLines(...values: Array<string | null | undefined>): string {
  return values.map(clean).filter(Boolean).join(', ');
}

function firstMatchingIsoCode(
  values: Array<string | null | undefined>,
  size: 2 | 3,
): string {
  const pattern = size === 2 ? /^[A-Z]{2}$/ : /^[A-Z]{3}$/;
  return values.map(upper).find(value => pattern.test(value)) ?? '';
}

export function findRefPersonne(
  personnes: RefPersonneResponse[],
  expectedTypePiece: number,
  noPiecePersonne: string,
): RefPersonneResponse | null {
  const normalizedNoPiece = upper(noPiecePersonne);

  return personnes.find(personne => (
    personne.id.typePiecePersonne === expectedTypePiece
    && upper(personne.id.noPiecePersonne) === normalizedNoPiece
  )) ?? null;
}

function resolvePartyType(
  typePiece: CustomerIdType,
): ClientData['typeClient'] {
  return typePiece === 'MF' || typePiece === 'RC'
    ? 'PERSONNE_MORALE'
    : 'PERSONNE_PHYSIQUE';
}

export function mapRefAccountRow(
  account: RefAccountRowResponse,
): AccountRow {
  const devise = toCurrencyAlpha(account.codeDevise).trim().toUpperCase();
  const active = upper(account.etatCompte) === 'V';
  const professionnel = upper(account.compteProfessionnelON) === 'O';
  const principal =
    account.principal === true
    || upper(account.principalON) === 'O';

  return {
    numero: clean(account.compteRib),
    codeAgence: normalizeAgencyCode(account.codeAgenceBct),
    devise,
    type:
      clean(account.typeCompte)
      || (professionnel ? 'Compte professionnel' : 'Compte client'),
    statut: active ? 'ACTIF' : 'INACTIF',
    dateCloture: account.dateCloture ?? null,
    principal,
    professionnel,
    eligibleCommission:
      active
      && !professionnel
      && (devise === 'TND' || principal),
  };
}

export function mapRefAccountRows(
  accounts: RefAccountRowResponse[],
): AccountRow[] {
  const seen = new Set<string>();

  return accounts
    .map(mapRefAccountRow)
    .filter(account => {
      const key = `${account.codeAgence}:${account.numero}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * Builds the frontend client exclusively from the fields exposed by REF.
 *
 * Fields that the supplied REF contract does not expose (resident status,
 * country, risk, business status, taxability, prohibited flag and totally
 * exporting status) are intentionally left undefined rather than fabricated.
 */
export function mapRefPersonneToClientData(
  personne: RefPersonneResponse,
  typePiece: CustomerIdType,
  currentAgencyCode = '',
  comptes: AccountRow[] = [],
): ClientData {
  const nom = clean(personne.nom);
  const prenom = clean(personne.prenom);
  const nomRaison = [nom, prenom].filter(Boolean).join(' ').trim();
  const internalClientRef = clean(personne.numRefCltInt);
  const normalizedAgencyCode = normalizeAgencyCode(currentAgencyCode);

  return {
    idClient: internalClientRef,
    noPiece: clean(personne.id.noPiecePersonne),
    typePiece,
    nomRaison: nomRaison || nom,
    nom: nom || undefined,
    prenom: prenom || undefined,
    nationalite: clean(personne.nationalite) || undefined,
    telephone: clean(personne.telephone) || undefined,
    email: clean(personne.email) || undefined,
    typeRefClientInterne: clean(personne.typRefCltInt) || undefined,
    numRefClientInterne: internalClientRef || undefined,
    typeClient: resolvePartyType(typePiece),
    adresse: joinAddressLines(
      personne.adrRes1,
      personne.adrRes2,
      personne.adrRes3,
      personne.adrRes4,
    ),
    agence: normalizedAgencyCode
      ? `Agence ${normalizedAgencyCode}`
      : undefined,
    codeAgence: normalizedAgencyCode || undefined,
    activiteCode: clean(personne.activite) || undefined,
    comptes,
  };
}

export function mapRefDeviseToQuotedCurrency(
  devise: RefDeviseResponse,
): QuotedCurrency {
  const code =
    firstMatchingIsoCode([devise.codeIso, devise.sigleDevise], 3)
    || upper(devise.sigleDevise)
    || String(devise.codeDevise);

  return {
    code,
    label: clean(devise.libDevise) || code,
    decimals: Number.isFinite(devise.decimalDevise)
      ? devise.decimalDevise
      : 0,
  };
}

export function mapRefPaysToCountryOption(
  pays: RefPaysResponse,
): CountryOption {
  const alpha2 = firstMatchingIsoCode(
    [pays.codeIso, pays.codePaysIso, pays.siglePays],
    2,
  );
  const alpha3 = firstMatchingIsoCode(
    [pays.codeIso, pays.codePaysIso, pays.siglePays],
    3,
  );

  return {
    alpha2,
    alpha3: alpha3 || undefined,
    numericCode: String(pays.codePays),
    label: clean(pays.libPays) || alpha2 || String(pays.codePays),
    active: true,
  };
}
