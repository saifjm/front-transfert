import type { PartyData } from './transfer.types';

export type PartyField = keyof PartyData;

const PARTY_FIELDS: readonly PartyField[] = [
  'nomRaison',
  'type',
  'codePays',
  'pays',
  'townName',
  'compte',
  'adresseLigne1',
  'adresseLigne2',
  'codePostal',
  'residence',
  'typePiece',
  'noPiece',
];

function hasPrefilledValue(value: unknown): boolean {
  return String(value ?? '').trim() !== '';
}

/**
 * Returns the fields which must be protected because their value came from
 * an authoritative customer-file lookup.
 *
 * Important:
 * - `nomRaison` is deliberately editable even when prefilled.
 * - missing customer-file values remain editable so the agent can complete
 *   the operation without inventing a value at import time.
 * - country code + label are treated atomically.
 */
export function getPrefilledPartyLockedFields(
  source: PartyData | null | undefined,
  editablePrefilledFields: readonly PartyField[] = ['nomRaison'],
): PartyField[] {
  if (!source) return [];

  const editable = new Set<PartyField>(editablePrefilledFields);
  const locked = new Set<PartyField>();

  for (const field of PARTY_FIELDS) {
    if (
      !editable.has(field)
      && hasPrefilledValue(source[field])
    ) {
      locked.add(field);
    }
  }

  const countryWasPrefilled =
    hasPrefilledValue(source.codePays)
    || hasPrefilledValue(source.pays);

  if (countryWasPrefilled) {
    if (!editable.has('codePays')) locked.add('codePays');
    if (!editable.has('pays')) locked.add('pays');
  }

  return [...locked];
}

export function isPartyFieldLocked(
  lockedFields: readonly PartyField[] | undefined,
  field: PartyField,
): boolean {
  return Boolean(lockedFields?.includes(field));
}
