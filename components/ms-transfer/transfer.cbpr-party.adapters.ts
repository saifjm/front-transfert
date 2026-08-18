import type {
  ClientData,
  CbprOtherIdentification,
  CbprPartyData,
  CustomerIdType,
  PartyType,
} from './transfer.types';
import {
  createEmptyCbprOtherIdentification,
  createEmptyCbprParty,
} from './transfer.cbpr-party';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function toCbprPartyKind(
  type: PartyType | null | undefined,
): CbprPartyData['partyKind'] {
  if (type === 'PERSONNE_MORALE') return 'ORGANISATION';
  if (type === 'PERSONNE_PHYSIQUE') return 'PRIVATE_PERSON';
  return '';
}

function createCustomerOtherId(
  typePiece: CustomerIdType | string | null | undefined,
  noPiece: unknown,
): CbprOtherIdentification[] {
  const id = text(noPiece);
  const scheme = text(typePiece);

  if (!id && !scheme) {
    return [];
  }

  const other = createEmptyCbprOtherIdentification();
  other.id = id;
  other.schemeName.proprietary = scheme;

  return [other];
}

function addressLines(
  ...values: unknown[]
): string[] {
  return values
    .map(text)
    .filter(Boolean)
    .slice(0, 7);
}

/**
 * Maps only values that are actually present on the customer file.
 * No country, party type, address mode or identifier is invented.
 */
export function clientToCbprParty(
  client: ClientData,
): CbprPartyData {
  const party = createEmptyCbprParty();

  party.name = text(client.nomRaison);
  party.partyKind = toCbprPartyKind(client.typeClient);
  party.countryOfResidence = text(client.codePays).toUpperCase();

  const importedAddressLines = addressLines(
    client.adresse,
    client.ville,
  );

  if (importedAddressLines.length > 0) {
    party.addressMode = 'ADDRESS_LINES';
    party.postalAddress.addressLines = importedAddressLines;
  }

  const other = createCustomerOtherId(
    client.typePiece,
    client.noPiece,
  );

  if (party.partyKind === 'ORGANISATION') {
    party.organisationIdentification.other = other;
  } else if (party.partyKind === 'PRIVATE_PERSON') {
    party.privateIdentification.other = other;
  }

  // Debit account remains intentionally empty: it is an operation choice.
  party.account = '';

  return party;
}

/**
 * Helper for REF beneficiary mapping.
 * Pass only fields really returned/resolved by REF.
 */
export function createCbprPartyFromBankCustomer(params: {
  name?: unknown;
  partyType?: PartyType | null;
  countryCode?: unknown;
  addressLines?: unknown[];
  typePiece?: CustomerIdType | string | null;
  noPiece?: unknown;
  account?: unknown;
}): CbprPartyData {
  const party = createEmptyCbprParty();

  party.name = text(params.name);
  party.partyKind = toCbprPartyKind(params.partyType);
  party.countryOfResidence = text(
    params.countryCode,
  ).toUpperCase();

  const lines = addressLines(
    ...(params.addressLines ?? []),
  );

  if (lines.length > 0) {
    party.addressMode = 'ADDRESS_LINES';
    party.postalAddress.addressLines = lines;
  }

  const other = createCustomerOtherId(
    params.typePiece,
    params.noPiece,
  );

  if (party.partyKind === 'ORGANISATION') {
    party.organisationIdentification.other = other;
  } else if (party.partyKind === 'PRIVATE_PERSON') {
    party.privateIdentification.other = other;
  }

  party.account = text(params.account);

  return party;
}
