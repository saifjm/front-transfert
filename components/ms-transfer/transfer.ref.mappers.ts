import type {
  AccountRow,
  BankClientBeneficiaryCandidate,
  ClientData,
  CountryOption,
  CustomerIdType,
  PartyData,
  QuotedCurrency,
} from './transfer.types';
import type {
  RefAccountRowResponse,
  RefDeviseResponse,
  RefPaysResponse,
  RefPersonneResponse,
} from './transfer.ref.contracts';
import { normalizeAgencyCode } from './transfer.session';
import {
  fromBnaCustomerIdType,
  toCurrencyAlpha,
} from './transfer.mappers';

function clean(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

function upper(value: string | null | undefined): string {
  return clean(value).toUpperCase();
}


function normalizedText(value: string | null | undefined): string {
  return upper(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
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

function resolveCountryFromNationality(
  nationality: string,
  countries: CountryOption[],
): CountryOption | null {
  const normalizedNationality = normalizedText(nationality);

  if (!normalizedNationality) {
    return null;
  }

  return countries.find(country => {
    const comparableValues = [
      country.nationality,
      country.label,
      country.alpha2,
      country.alpha3,
      country.numericCode,
    ];

    return comparableValues.some(value => (
      normalizedText(value) === normalizedNationality
    ));
  }) ?? null;
}

export function mapRefPersonneToBeneficiaryCandidate(
  personne: RefPersonneResponse,
  countries: CountryOption[],
): BankClientBeneficiaryCandidate {
  const numericTypePiece = Number(personne.id.typePiecePersonne);
  const typePiece = fromBnaCustomerIdType(numericTypePiece);
  const noPiece = clean(personne.id.noPiecePersonne);
  const nom = clean(personne.nom);
  const prenom = clean(personne.prenom);
  const nationalite = clean(personne.nationalite);
  const internalReference = clean(personne.numRefCltInt);
  const internalReferenceType = clean(personne.typRefCltInt);
  const country = resolveCountryFromNationality(
    nationalite,
    countries,
  );

  const nomRaison = typePiece === 'MF' || typePiece === 'RC'
    ? nom
    : [nom, prenom].filter(Boolean).join(' ').trim();

  /*
   * Beneficiary and ordering-party forms deliberately share the same
   * PartyData field model. The REF identity lookup may expose additional
   * attributes (phone, e-mail, fax, activity, correspondence address, etc.),
   * but they are not injected as hidden operational fields because they do
   * not exist on the ordering-party form.
   *
   * The four REF residential address lines are folded into the two address
   * fields available on both party forms so the imported address remains
   * visible and editable.
   */
  const party: PartyData | null = typePiece
    ? {
        nomRaison: nomRaison || nom,
        type: resolvePartyType(typePiece),
        codePays: country?.alpha2 || '',
        pays: country?.label || '',
        townName: '',
        compte: '',
        adresseLigne1: clean(personne.adrRes1),
        adresseLigne2: joinAddressLines(
          personne.adrRes2,
          personne.adrRes3,
          personne.adrRes4,
        ),
        codePostal: '',
        residence: '',
        typePiece,
        noPiece,
      }
    : null;

  return {
    key: [
      numericTypePiece,
      upper(noPiece),
      upper(internalReferenceType),
      upper(internalReference),
    ].join(':'),
    numericTypePiece,
    typePiece,
    noPiece,
    nomRaison: nomRaison || nom || noPiece,
    nationalite,
    internalReference: [
      internalReferenceType,
      internalReference,
    ].filter(Boolean).join(' / '),
    supported: Boolean(typePiece),
    party,
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
    nationality: clean(pays.nationalite) || undefined,
    active: true,
  };
}
