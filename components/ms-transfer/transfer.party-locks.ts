import type {
  PartyData,
} from './transfer.types';

export type PartyField =
  | 'nomRaison'
  | 'type'
  | 'compte'
  | 'countryOfResidence'
  | `postalAddress.${keyof PartyData['postalAddress']}`
  | `organisationIdentification.anyBic`
  | `organisationIdentification.lei`
  | `organisationIdentification.other.${number}.id`
  | `organisationIdentification.other.${number}.schemeName.code`
  | `organisationIdentification.other.${number}.schemeName.proprietary`
  | `organisationIdentification.other.${number}.issuer`
  | `privateIdentification.dateAndPlaceOfBirth.${keyof PartyData['privateIdentification']['dateAndPlaceOfBirth']}`
  | `privateIdentification.other.${number}.id`
  | `privateIdentification.other.${number}.schemeName.code`
  | `privateIdentification.other.${number}.schemeName.proprietary`
  | `privateIdentification.other.${number}.issuer`;

function hasValue(
  value: unknown,
): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return (
    value != null
    && String(value).trim() !== ''
  );
}

function collectLockedPaths(
  value: unknown,
  prefix: string,
  editable: ReadonlySet<string>,
  result: Set<PartyField>,
) {
  if (
    value == null
    || editable.has(prefix)
  ) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(
      (item, index) => {
        collectLockedPaths(
          item,
          `${prefix}.${index}`,
          editable,
          result,
        );
      },
    );
    return;
  }

  if (
    typeof value === 'object'
  ) {
    Object.entries(
      value as Record<string, unknown>,
    ).forEach(
      ([key, child]) => {
        const path =
          prefix
            ? `${prefix}.${key}`
            : key;

        collectLockedPaths(
          child,
          path,
          editable,
          result,
        );
      },
    );
    return;
  }

  if (
    prefix
    && hasValue(value)
  ) {
    result.add(
      prefix as PartyField,
    );
  }
}

/**
 * Locks only values that were actually prefilled by the authoritative source.
 * Nom / raison sociale stays editable by default.
 */
export function getPrefilledPartyLockedFields(
  source:
    | PartyData
    | null
    | undefined,
  editablePrefilledFields:
    readonly PartyField[]
      = ['nomRaison'],
): PartyField[] {
  if (!source) {
    return [];
  }

  const editable =
    new Set<string>(
      editablePrefilledFields,
    );

  const result =
    new Set<PartyField>();

  collectLockedPaths(
    source,
    '',
    editable,
    result,
  );

  return [...result];
}

export function isPartyFieldLocked(
  lockedFields:
    | readonly PartyField[]
    | undefined,
  field: PartyField,
): boolean {
  return Boolean(
    lockedFields?.includes(field),
  );
}

export function isPartySubtreeLocked(
  lockedFields:
    | readonly PartyField[]
    | undefined,
  prefix: string,
): boolean {
  return Boolean(
    lockedFields?.some(
      field =>
        field === prefix
        || field.startsWith(
          `${prefix}.`,
        ),
    ),
  );
}
