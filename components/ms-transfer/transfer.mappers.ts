import { UserMessageError } from './transfer.errors';
import type {
  BnaAccountRow,
  BnaClientProfileResponse,
  BnaPostalAddress,
} from './transfer.api.contracts';
import type {
  AgencyInfo,
  ClientData,
  CustomerIdType,
} from './transfer.types';
import { normalizeAgencyCode } from './transfer.session';

export const CUSTOMER_ID_TYPE_TO_BNA: Record<CustomerIdType, number> = {
  CIN: 1,
  PASSPORT: 2,
  MF: 4,
  RC: 7,
};

export const CURRENCY_ALPHA_TO_NUMERIC: Record<string, number> = {
  TND: 788,
  EUR: 978,
  USD: 840,
  GBP: 826,
  CHF: 756,
  CAD: 124,
  JPY: 392,
  AED: 784,
  SAR: 682,
};

export const CURRENCY_NUMERIC_TO_ALPHA: Record<number, string> =
  Object.fromEntries(
    Object.entries(CURRENCY_ALPHA_TO_NUMERIC).map(
      ([alpha, numeric]) => [numeric, alpha],
    ),
  ) as Record<number, string>;

const COUNTRY_NUMERIC_TO_ALPHA2: Record<string, string> = {
  '788': 'TN',
  '250': 'FR',
  '276': 'DE',
  '380': 'IT',
  '724': 'ES',
  '826': 'GB',
  '840': 'US',
  '784': 'AE',
  '682': 'SA',
  '634': 'QA',
};

const COUNTRY_NUMERIC_TO_LABEL: Record<string, string> = {
  '788': 'Tunisie',
  '250': 'France',
  '276': 'Allemagne',
  '380': 'Italie',
  '724': 'Espagne',
  '826': 'Royaume-Uni',
  '840': 'États-Unis',
  '784': 'Émirats arabes unis',
  '682': 'Arabie saoudite',
  '634': 'Qatar',
};

export function toBnaCustomerIdType(
  typePieceClient: CustomerIdType,
): number {
  const mapped = CUSTOMER_ID_TYPE_TO_BNA[typePieceClient];

  if (!mapped) {
    throw new UserMessageError(
      "Le type de pièce sélectionné n'est pas pris en charge.",
    );
  }

  return mapped;
}

export function toCurrencyNumeric(codeDevise: string): number {
  const normalized = codeDevise.trim().toUpperCase();
  const numeric = CURRENCY_ALPHA_TO_NUMERIC[normalized];

  if (!numeric) {
    throw new UserMessageError(
      `La devise ${normalized} n'est pas prise en charge.`,
    );
  }

  return numeric;
}

export function toCurrencyAlpha(codeDevise: string | number): string {
  const numeric = Number(codeDevise);
  return CURRENCY_NUMERIC_TO_ALPHA[numeric] || String(codeDevise);
}

export function toNumber(
  value: number | string,
  fieldLabel: string,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new UserMessageError(
      `La valeur retournée pour ${fieldLabel} est invalide.`,
    );
  }

  return parsed;
}

export function toAgencyInfo(code: string | number): AgencyInfo {
  const normalized = normalizeAgencyCode(code);

  return {
    code: normalized,
    label: `Agence ${normalized}`,
    bctCode: normalized,
  };
}

export function buildAddress(address?: BnaPostalAddress): string {
  if (!address) return '';

  return [
    address.buildingNumber,
    address.streetName,
    address.buildingName,
    address.districtName,
    address.postCode,
    address.townName,
    address.countrySubDivision,
  ]
    .map(value => String(value ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

function mapRiskLevel(value: unknown): ClientData['niveauRisque'] {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (normalized === 'FAIBLE' || normalized === 'LOW') return 'FAIBLE';
  if (
    normalized === 'ELEVE'
    || normalized === 'ÉLEVÉ'
    || normalized === 'HIGH'
  ) {
    return 'ELEVE';
  }

  return 'MOYEN';
}

function mapClientStatus(value: unknown): ClientData['statut'] {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (normalized === 'SUSPENDU' || normalized === 'SUSPENDED') {
    return 'SUSPENDU';
  }

  if (
    normalized === 'CLOTURE'
    || normalized === 'CLÔTURÉ'
    || normalized === 'CLOSED'
  ) {
    return 'CLOTURE';
  }

  return 'ACTIF';
}

export function mapClientData(
  requestedTypePiece: CustomerIdType,
  profile: BnaClientProfileResponse,
  accountRows: BnaAccountRow[],
  currentAgencyCode: string,
): ClientData {
  const address = profile.postalAddress || profile.adresse || {};
  const countryNumeric = String(
    address.countryNumericCode ?? '',
  ).padStart(3, '0');
  const codePays =
    address.countryAlpha2?.trim().toUpperCase()
    || COUNTRY_NUMERIC_TO_ALPHA2[countryNumeric]
    || countryNumeric;
  const pays =
    address.countryName?.trim()
    || COUNTRY_NUMERIC_TO_LABEL[countryNumeric]
    || codePays;

  const accounts = accountRows.map(account => {
    const devise = toCurrencyAlpha(account.codeDevise);
    const active = account.etatCompte === 'V';
    const professionnel = account.compteProfessionnelON === 'O';
    const principal =
      account.principal === true
      || account.principalON === 'O';

    return {
      numero: account.compteRib,
      codeAgence: normalizeAgencyCode(account.codeAgenceBct),
      devise,
      type:
        account.typeCompte
        || (professionnel ? 'Compte professionnel' : 'Compte client'),
      statut: active ? 'ACTIF' as const : 'INACTIF' as const,
      dateCloture: account.dateCloture,
      principal,
      professionnel,
      eligibleCommission:
        active
        && !professionnel
        && (devise === 'TND' || principal),
    };
  });

  const nomRaison =
    profile.natureClient === 'P'
      ? [profile.nom, profile.prenom]
          .filter(Boolean)
          .join(' ')
          .trim()
      : profile.nom.trim();

  return {
    idClient: profile.idFiche,
    noPiece: profile.noPiecePersonne,
    typePiece: requestedTypePiece,
    nomRaison,
    typeClient:
      profile.natureClient === 'P'
        ? 'PERSONNE_PHYSIQUE'
        : 'PERSONNE_MORALE',
    resident: profile.residentON === 'O',
    residence:
      profile.residentON === 'O'
        ? 'RESIDENT'
        : 'NON_RESIDENT',
    pays,
    codePays,
    ville: String(address.townName ?? ''),
    adresse: buildAddress(address),
    agence: currentAgencyCode
      ? `Agence ${currentAgencyCode}`
      : '',
    codeAgence: currentAgencyCode,
    statut: mapClientStatus(profile.statut),
    niveauRisque: mapRiskLevel(profile.niveauRisque),
    totalementExportatrice:
      profile.totalementExportatrice === 'O',
    comptes: accounts,
  };
}
