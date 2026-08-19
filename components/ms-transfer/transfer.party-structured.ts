import type {
  ClientData,
  PartyData,
  PartyOtherIdentification,
  PartyType,
} from './transfer.types';

export function createEmptyOtherIdentification():
PartyOtherIdentification {
  return {
    id: '',
    schemeName: {
      code: '',
      proprietary: '',
    },
    issuer: '',
  };
}

export function createEmptyParty(): PartyData {
  return {
    nomRaison: '',
    type: '',
    compte: '',

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
  };
}

function clientPartyType(
  client: ClientData,
): PartyType {
  if (
    client.typeClient
    === 'PERSONNE_MORALE'
  ) {
    return 'PERSONNE_MORALE';
  }

  if (
    client.typeClient
    === 'PERSONNE_PHYSIQUE'
  ) {
    return 'PERSONNE_PHYSIQUE';
  }

  return '';
}

/**
 * Prefills only data that is already explicitly structured/known.
 *
 * The customer fiche may contain free-form address lines. They are NOT parsed
 * into street/building/post-code fields here because that would invent a
 * structure not supplied by the customer reference service.
 */
function asRecord(
  value: unknown,
): Record<string, unknown> {
  return (
    value != null
    && typeof value === 'object'
    && !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : {};
}

function asText(
  value: unknown,
): string {
  return String(value ?? '').trim();
}

function normalizePartyTypeValue(
  value: unknown,
): PartyType {
  return (
    value === 'PERSONNE_MORALE'
    || value === 'PERSONNE_PHYSIQUE'
  )
    ? value
    : '';
}

function normalizeOtherIdentification(
  value: unknown,
): PartyOtherIdentification {
  const record = asRecord(value);
  const scheme = asRecord(
    record.schemeName,
  );

  return {
    id: asText(record.id),
    schemeName: {
      code: asText(
        scheme.code,
      ),
      proprietary: asText(
        scheme.proprietary,
      ),
    },
    issuer: asText(
      record.issuer,
    ),
  };
}

function normalizeOtherIdentificationArray(
  value: unknown,
): PartyOtherIdentification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(
    normalizeOtherIdentification,
  );
}

/**
 * Runtime compatibility normalizer.
 *
 * During HMR, persisted drafts, or a partial migration, PartyForm can receive
 * the former flat PartyData shape even though TypeScript now expects the new
 * structured shape. Every PartyForm read goes through this function.
 *
 * Safe legacy mappings:
 * - codePostal -> postalAddress.postCode
 * - townName -> postalAddress.townName
 * - codePays -> postalAddress.country / countryOfResidence
 * - typePiece + noPiece -> the appropriate "other identification" branch
 *
 * Legacy free-form adresseLigne1/2 are deliberately NOT parsed into structured
 * address fields.
 */
export function normalizePartyData(
  raw: unknown,
): PartyData {
  const empty = createEmptyParty();
  const source = asRecord(raw);

  const postal =
    asRecord(
      source.postalAddress,
    );

  const organisation =
    asRecord(
      source.organisationIdentification,
    );

  const privateIdentification =
    asRecord(
      source.privateIdentification,
    );

  const dateAndPlaceOfBirth =
    asRecord(
      privateIdentification
        .dateAndPlaceOfBirth,
    );

  const type =
    normalizePartyTypeValue(
      source.type,
    );

  const party: PartyData = {
    nomRaison:
      asText(source.nomRaison),

    type,

    compte:
      asText(source.compte),

    postalAddress: {
      department:
        asText(postal.department),
      subDepartment:
        asText(postal.subDepartment),
      streetName:
        asText(postal.streetName),
      buildingNumber:
        asText(postal.buildingNumber),
      buildingName:
        asText(postal.buildingName),
      floor:
        asText(postal.floor),
      postBox:
        asText(postal.postBox),
      room:
        asText(postal.room),

      postCode:
        asText(
          postal.postCode
          ?? source.codePostal,
        ),

      townName:
        asText(
          postal.townName
          ?? source.townName,
        ),

      townLocationName:
        asText(
          postal.townLocationName,
        ),

      districtName:
        asText(
          postal.districtName,
        ),

      countrySubDivision:
        asText(
          postal.countrySubDivision,
        ),

      country:
        asText(
          postal.country
          ?? source.codePays,
        ).toUpperCase(),
    },

    organisationIdentification: {
      anyBic:
        asText(
          organisation.anyBic,
        ),
      lei:
        asText(
          organisation.lei,
        ),
      other:
        normalizeOtherIdentificationArray(
          organisation.other,
        ),
    },

    privateIdentification: {
      dateAndPlaceOfBirth: {
        birthDate:
          asText(
            dateAndPlaceOfBirth
              .birthDate,
          ),
        provinceOfBirth:
          asText(
            dateAndPlaceOfBirth
              .provinceOfBirth,
          ),
        cityOfBirth:
          asText(
            dateAndPlaceOfBirth
              .cityOfBirth,
          ),
        countryOfBirth:
          asText(
            dateAndPlaceOfBirth
              .countryOfBirth,
          ).toUpperCase(),
      },

      other:
        normalizeOtherIdentificationArray(
          privateIdentification.other,
        ),
    },

    countryOfResidence:
      asText(
        source.countryOfResidence
        ?? source.codePays,
      ).toUpperCase(),
  };

  const legacyNoPiece =
    asText(source.noPiece);

  const legacyTypePiece =
    asText(source.typePiece);

  if (
    legacyNoPiece
    && type === 'PERSONNE_MORALE'
    && party
      .organisationIdentification
      .other.length === 0
  ) {
    party
      .organisationIdentification
      .other = [
        {
          id: legacyNoPiece,
          schemeName: {
            code: '',
            proprietary:
              legacyTypePiece,
          },
          issuer: '',
        },
      ];
  }

  if (
    legacyNoPiece
    && type
      === 'PERSONNE_PHYSIQUE'
    && party
      .privateIdentification
      .other.length === 0
  ) {
    party
      .privateIdentification
      .other = [
        {
          id: legacyNoPiece,
          schemeName: {
            code: '',
            proprietary:
              legacyTypePiece,
          },
          issuer: '',
        },
      ];
  }

  return party;
}

export function clientToParty(
  client: ClientData,
): PartyData {
  const party = createEmptyParty();

  party.nomRaison =
    String(
      client.nomRaison ?? '',
    ).trim();

  party.type =
    clientPartyType(client);

  const countryCode =
    String(
      client.codePays ?? '',
    )
      .trim()
      .toUpperCase();

  const townName =
    String(
      client.ville ?? '',
    ).trim();

  if (countryCode) {
    party.postalAddress.country =
      countryCode;

    party.countryOfResidence =
      countryCode;
  }

  if (townName) {
    party.postalAddress.townName =
      townName;
  }

  const identifier =
    String(
      client.noPiece ?? '',
    ).trim();

  const identifierType =
    String(
      client.typePiece ?? '',
    ).trim();

  if (
    identifier
    && party.type
      === 'PERSONNE_MORALE'
  ) {
    party.organisationIdentification.other = [
      {
        id: identifier,
        schemeName: {
          code: '',
          proprietary:
            identifierType,
        },
        issuer: '',
      },
    ];
  }

  if (
    identifier
    && party.type
      === 'PERSONNE_PHYSIQUE'
  ) {
    party.privateIdentification.other = [
      {
        id: identifier,
        schemeName: {
          code: '',
          proprietary:
            identifierType,
        },
        issuer: '',
      },
    ];
  }

  return party;
}

export function switchPartyType(
  party: PartyData,
  type: PartyType,
): PartyData {
  const normalized =
    normalizePartyData(party);

  const next = {
    ...normalized,
    type,
  };

  if (type === 'PERSONNE_MORALE') {
    return {
      ...next,
      privateIdentification:
        createEmptyParty()
          .privateIdentification,
    };
  }

  if (
    type
    === 'PERSONNE_PHYSIQUE'
  ) {
    return {
      ...next,
      organisationIdentification:
        createEmptyParty()
          .organisationIdentification,
    };
  }

  const empty = createEmptyParty();

  return {
    ...next,
    organisationIdentification:
      empty.organisationIdentification,
    privateIdentification:
      empty.privateIdentification,
  };
}
