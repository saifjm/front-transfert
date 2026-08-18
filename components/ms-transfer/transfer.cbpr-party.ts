import type {
  CbprAddressMode,
  CbprOtherIdentification,
  CbprPartyData,
  CbprPartyKind,
  CountryOption,
} from './transfer.types';

export type CbprPartyFieldPath = string;

export function createEmptyCbprOtherIdentification():
  CbprOtherIdentification {
  return {
    id: '',
    schemeName: {
      code: '',
      proprietary: '',
    },
    issuer: '',
  };
}

export function createEmptyCbprParty(): CbprPartyData {
  return {
    name: '',
    partyKind: '',
    addressMode: '',
    postalAddress: {
      department: '',
      subDepartment: '',
      streetName: '',
      buildingNumber: '',
      buildingName: '',
      floor: '',
      postBox: '',
      room: '',
      postCode: '',
      townName: '',
      townLocationName: '',
      districtName: '',
      countrySubDivision: '',
      country: '',
      addressLines: [],
    },
    organisationIdentification: {
      anyBic: '',
      lei: '',
      other: [],
    },
    privateIdentification: {
      dateAndPlaceOfBirth: {
        birthDate: '',
        provinceOfBirth: '',
        cityOfBirth: '',
        countryOfBirth: '',
      },
      other: [],
    },
    countryOfResidence: '',
    account: '',
  };
}

/**
 * Runtime compatibility adapter.
 *
 * During HMR, draft restoration, or a progressive deployment, the browser can
 * still hold the former flat PartyData shape. This function always returns a
 * complete CBPR+ object before any nested property is read.
 */
export function normalizeCbprParty(
  value: unknown,
): CbprPartyData {
  const empty = createEmptyCbprParty();

  if (!value || typeof value !== 'object') {
    return empty;
  }

  const source = value as Record<string, any>;
  const sourcePostal =
    source.postalAddress && typeof source.postalAddress === 'object'
      ? source.postalAddress
      : {};
  const sourceOrganisation =
    source.organisationIdentification
      && typeof source.organisationIdentification === 'object'
      ? source.organisationIdentification
      : {};
  const sourcePrivate =
    source.privateIdentification
      && typeof source.privateIdentification === 'object'
      ? source.privateIdentification
      : {};
  const sourceBirth =
    sourcePrivate.dateAndPlaceOfBirth
      && typeof sourcePrivate.dateAndPlaceOfBirth === 'object'
      ? sourcePrivate.dateAndPlaceOfBirth
      : {};

  const legacyName = source.nomRaison;
  const legacyAccount = source.compte;
  const legacyCountry = source.codePays;
  const legacyTown = source.townName;
  const legacyPostCode = source.codePostal;
  const legacyAddressLines = [
    source.adresseLigne1,
    source.adresseLigne2,
  ]
    .map(item => String(item ?? '').trim())
    .filter(Boolean);

  let partyKind: CbprPartyData['partyKind'] = source.partyKind ?? '';
  if (!partyKind) {
    if (source.type === 'PERSONNE_MORALE') {
      partyKind = 'ORGANISATION';
    } else if (source.type === 'PERSONNE_PHYSIQUE') {
      partyKind = 'PRIVATE_PERSON';
    }
  }

  let addressMode: CbprPartyData['addressMode'] = source.addressMode ?? '';
  const cbprAddressLines = Array.isArray(sourcePostal.addressLines)
    ? sourcePostal.addressLines
        .map((item: unknown) => String(item ?? '').trim())
        .filter(Boolean)
        .slice(0, 7)
    : [];

  const resolvedAddressLines = cbprAddressLines.length
    ? cbprAddressLines
    : legacyAddressLines.slice(0, 7);

  if (!addressMode && resolvedAddressLines.length) {
    addressMode = 'ADDRESS_LINES';
  }

  const otherFromLegacyId = (() => {
    const id = String(source.noPiece ?? '').trim();
    const scheme = String(source.typePiece ?? '').trim();
    if (!id && !scheme) return [];

    return [{
      id,
      schemeName: {
        code: '',
        proprietary: scheme,
      },
      issuer: '',
    }];
  })();

  const organisationOther = Array.isArray(sourceOrganisation.other)
    ? sourceOrganisation.other
    : partyKind === 'ORGANISATION'
      ? otherFromLegacyId
      : [];

  const privateOther = Array.isArray(sourcePrivate.other)
    ? sourcePrivate.other
    : partyKind === 'PRIVATE_PERSON'
      ? otherFromLegacyId
      : [];

  return {
    name: String(source.name ?? legacyName ?? ''),
    partyKind,
    addressMode,
    postalAddress: {
      department: String(sourcePostal.department ?? ''),
      subDepartment: String(sourcePostal.subDepartment ?? ''),
      streetName: String(sourcePostal.streetName ?? ''),
      buildingNumber: String(sourcePostal.buildingNumber ?? ''),
      buildingName: String(sourcePostal.buildingName ?? ''),
      floor: String(sourcePostal.floor ?? ''),
      postBox: String(sourcePostal.postBox ?? ''),
      room: String(sourcePostal.room ?? ''),
      postCode: String(sourcePostal.postCode ?? legacyPostCode ?? ''),
      townName: String(sourcePostal.townName ?? legacyTown ?? ''),
      townLocationName: String(sourcePostal.townLocationName ?? ''),
      districtName: String(sourcePostal.districtName ?? ''),
      countrySubDivision: String(sourcePostal.countrySubDivision ?? ''),
      country: String(sourcePostal.country ?? ''),
      addressLines: resolvedAddressLines,
    },
    organisationIdentification: {
      anyBic: String(sourceOrganisation.anyBic ?? ''),
      lei: String(sourceOrganisation.lei ?? ''),
      other: organisationOther,
    },
    privateIdentification: {
      dateAndPlaceOfBirth: {
        birthDate: String(sourceBirth.birthDate ?? ''),
        provinceOfBirth: String(sourceBirth.provinceOfBirth ?? ''),
        cityOfBirth: String(sourceBirth.cityOfBirth ?? ''),
        countryOfBirth: String(sourceBirth.countryOfBirth ?? ''),
      },
      other: privateOther,
    },
    countryOfResidence: String(
      source.countryOfResidence
        ?? legacyCountry
        ?? '',
    ).toUpperCase(),
    account: String(source.account ?? legacyAccount ?? ''),
  };
}

export function normalizeCountryCode(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

export function countryExists(
  countries: CountryOption[],
  code: unknown,
): boolean {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return false;

  return countries.some(
    country =>
      normalizeCountryCode(country.alpha2) === normalized,
  );
}

/**
 * Existing MS-TR validation expects one usable country for a party.
 * Prefer CtryOfRes; otherwise use the structured postal-address country.
 */
export function getPrimaryPartyCountryCode(
  party: CbprPartyData | null | undefined,
): string {
  const normalized = normalizeCbprParty(party);

  return (
    normalizeCountryCode(normalized.countryOfResidence)
    || normalizeCountryCode(normalized.postalAddress?.country)
  );
}

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasValue);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasValue);
  }

  return String(value ?? '').trim() !== '';
}

function collectLockedLeafPaths(
  value: unknown,
  prefix: string,
  output: Set<string>,
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const path = prefix ? `${prefix}.${index}` : String(index);
      collectLockedLeafPaths(item, path, output);
    });
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const path = prefix ? `${prefix}.${key}` : key;
      collectLockedLeafPaths(child, path, output);
    }
    return;
  }

  if (prefix && hasValue(value)) {
    output.add(prefix);
  }
}

/**
 * Protect fields that were actually imported from a customer file.
 *
 * Business exception: `name` (Nm) always remains editable.
 * Missing values are not locked and can be completed by the agent.
 */
export function getPrefilledCbprPartyLockedFields(
  source: CbprPartyData | null | undefined,
): CbprPartyFieldPath[] {
  if (!source) return [];

  const locked = new Set<string>();
  collectLockedLeafPaths(source, '', locked);

  locked.delete('name');

  // When the imported source carries an address mode or party kind, protect
  // the mode itself because changing it would discard authoritative data.
  if (source.partyKind) {
    locked.add('partyKind');
  }
  if (source.addressMode) {
    locked.add('addressMode');
  }

  return [...locked];
}

export function isCbprPartyPathLocked(
  lockedFields: readonly CbprPartyFieldPath[] | undefined,
  path: CbprPartyFieldPath,
): boolean {
  return Boolean(lockedFields?.includes(path));
}

export function isCbprPartyPathOrChildLocked(
  lockedFields: readonly CbprPartyFieldPath[] | undefined,
  prefix: CbprPartyFieldPath,
): boolean {
  return Boolean(
    lockedFields?.some(
      path => path === prefix || path.startsWith(`${prefix}.`),
    ),
  );
}

export function switchAddressMode(
  party: CbprPartyData,
  mode: CbprAddressMode,
): CbprPartyData {
  if (mode === party.addressMode) return party;

  if (mode === 'STRUCTURED') {
    return {
      ...party,
      addressMode: mode,
      postalAddress: {
        ...party.postalAddress,
        addressLines: [],
      },
    };
  }

  if (mode === 'ADDRESS_LINES') {
    return {
      ...party,
      addressMode: mode,
      postalAddress: {
        department: '',
        subDepartment: '',
        streetName: '',
        buildingNumber: '',
        buildingName: '',
        floor: '',
        postBox: '',
        room: '',
        postCode: '',
        townName: '',
        townLocationName: '',
        districtName: '',
        countrySubDivision: '',
        country: '',
        addressLines: party.postalAddress.addressLines,
      },
    };
  }

  return {
    ...party,
    addressMode: '',
    postalAddress: {
      ...createEmptyCbprParty().postalAddress,
    },
  };
}

export function switchPartyKind(
  party: CbprPartyData,
  kind: CbprPartyKind,
): CbprPartyData {
  if (kind === party.partyKind) return party;

  if (kind === 'ORGANISATION') {
    return {
      ...party,
      partyKind: kind,
      privateIdentification:
        createEmptyCbprParty().privateIdentification,
    };
  }

  if (kind === 'PRIVATE_PERSON') {
    return {
      ...party,
      partyKind: kind,
      organisationIdentification:
        createEmptyCbprParty().organisationIdentification,
    };
  }

  return {
    ...party,
    partyKind: '',
    organisationIdentification:
      createEmptyCbprParty().organisationIdentification,
    privateIdentification:
      createEmptyCbprParty().privateIdentification,
  };
}

export function setOtherIdentificationSchemeMode(
  identification: CbprOtherIdentification,
  mode: '' | 'CODE' | 'PROPRIETARY',
): CbprOtherIdentification {
  if (mode === 'CODE') {
    return {
      ...identification,
      schemeName: {
        code: identification.schemeName.code,
        proprietary: '',
      },
    };
  }

  if (mode === 'PROPRIETARY') {
    return {
      ...identification,
      schemeName: {
        code: '',
        proprietary: identification.schemeName.proprietary,
      },
    };
  }

  return {
    ...identification,
    schemeName: {
      code: '',
      proprietary: '',
    },
  };
}

export function getOtherIdentificationSchemeMode(
  identification: CbprOtherIdentification,
): '' | 'CODE' | 'PROPRIETARY' {
  if (identification.schemeName.code) return 'CODE';
  if (identification.schemeName.proprietary) return 'PROPRIETARY';
  return '';
}

export function isCbprPartyCoreComplete(
  party: CbprPartyData | null | undefined,
  options: {
    accountRequired?: boolean;
    countryRequired?: boolean;
  } = {},
): boolean {
  const normalized = normalizeCbprParty(party);
  const accountRequired = options.accountRequired ?? false;
  const countryRequired = options.countryRequired ?? true;

  if (!String(normalized.name ?? '').trim()) return false;
  if (!normalized.partyKind) return false;

  if (
    accountRequired
    && !String(normalized.account ?? '').trim()
  ) {
    return false;
  }

  if (
    countryRequired
    && !getPrimaryPartyCountryCode(normalized)
  ) {
    return false;
  }

  return true;
}
