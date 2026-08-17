import { searchRefPersonnesByNoPiece } from './transfer.api';
import { UserMessageError } from './transfer.errors';
import { mapRefPersonneToBeneficiaryCandidate } from './transfer.ref.mappers';
import type {
  BankClientBeneficiaryCandidate,
  BeneficiarySearchCriteria,
  CountryOption,
  CustomerIdType,
} from './transfer.types';

const IDENTIFIER_TYPE_LABELS: Readonly<Record<CustomerIdType, string>> = {
  CIN: 'CIN',
  PASSPORT: 'Passeport',
  MF: 'Matricule fiscal / RNE',
  RC: 'Registre de commerce',
};

export function beneficiaryIdentifierTypeLabel(
  typePiece: CustomerIdType | null,
  numericTypePiece?: number,
): string {
  if (typePiece) {
    return IDENTIFIER_TYPE_LABELS[typePiece];
  }

  return numericTypePiece == null
    ? 'Type non renseigné'
    : `Type ${numericTypePiece}`;
}

/**
 * Bank-client beneficiary search facade.
 *
 * The UI deliberately depends on this facade rather than on the REF endpoint.
 * Today only `noPiece` is executed because it is the only implemented search
 * operation. A future multi-criteria REF operation can replace this function
 * without changing the import/mapping behavior of BeneficiarySection.
 */
export async function searchBankClientBeneficiaries(
  criteria: BeneficiarySearchCriteria,
  countries: CountryOption[],
): Promise<BankClientBeneficiaryCandidate[]> {
  const noPiece = String(criteria.noPiece ?? '')
    .trim()
    .toUpperCase();

  if (!noPiece) {
    throw new UserMessageError(
      'Renseignez un numéro de pièce ou identifiant client.',
    );
  }

  const personnes = await searchRefPersonnesByNoPiece(noPiece);

  // Preserve every REF row. The UI must never hide potentially distinct
  // clients merely because their visible identifiers are identical. The
  // index only stabilizes the React key; selection remains explicit.
  return personnes.map((personne, index) => {
    const candidate = mapRefPersonneToBeneficiaryCandidate(
      personne,
      countries,
    );

    return {
      ...candidate,
      key: `${candidate.key}:${index}`,
    };
  });
}
