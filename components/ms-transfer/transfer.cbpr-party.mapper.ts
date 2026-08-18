import type {
  CbprOtherIdentification,
  CbprPartyData,
} from './transfer.types';
import {
  normalizeCbprParty,
} from './transfer.cbpr-party';

function valueOrNull(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function mapOther(
  identification: CbprOtherIdentification,
) {
  return {
    Id: valueOrNull(identification.id),
    SchmeNm: {
      Cd: valueOrNull(identification.schemeName.code),
      Prtry: valueOrNull(
        identification.schemeName.proprietary,
      ),
    },
    Issr: valueOrNull(identification.issuer),
  };
}

function mapPostalAddress(
  party: CbprPartyData,
) {
  const address = party.postalAddress;

  if (party.addressMode === 'ADDRESS_LINES') {
    return {
      Dept: null,
      SubDept: null,
      StrtNm: null,
      BldgNb: null,
      BldgNm: null,
      Flr: null,
      PstBx: null,
      Room: null,
      PstCd: null,
      TwnNm: null,
      TwnLctnNm: null,
      DstrctNm: null,
      CtrySubDvsn: null,
      Ctry: null,
      AdrLine: address.addressLines
        .slice(0, 7)
        .map(valueOrNull)
        .filter((value): value is string => value !== null),
    };
  }

  if (party.addressMode === 'STRUCTURED') {
    return {
      Dept: valueOrNull(address.department),
      SubDept: valueOrNull(address.subDepartment),
      StrtNm: valueOrNull(address.streetName),
      BldgNb: valueOrNull(address.buildingNumber),
      BldgNm: valueOrNull(address.buildingName),
      Flr: valueOrNull(address.floor),
      PstBx: valueOrNull(address.postBox),
      Room: valueOrNull(address.room),
      PstCd: valueOrNull(address.postCode),
      TwnNm: valueOrNull(address.townName),
      TwnLctnNm: valueOrNull(address.townLocationName),
      DstrctNm: valueOrNull(address.districtName),
      CtrySubDvsn: valueOrNull(
        address.countrySubDivision,
      ),
      Ctry: valueOrNull(
        address.country.toUpperCase(),
      ),
      AdrLine: [],
    };
  }

  return {
    Dept: null,
    SubDept: null,
    StrtNm: null,
    BldgNb: null,
    BldgNm: null,
    Flr: null,
    PstBx: null,
    Room: null,
    PstCd: null,
    TwnNm: null,
    TwnLctnNm: null,
    DstrctNm: null,
    CtrySubDvsn: null,
    Ctry: null,
    AdrLine: [],
  };
}

export function mapPartyToCbprParty(
  party: CbprPartyData,
) {
  const normalized = normalizeCbprParty(party);
  const organisation =
    normalized.organisationIdentification;

  const privateId =
    normalized.privateIdentification;

  return {
    Nm: valueOrNull(normalized.name),

    PstlAdr: mapPostalAddress(normalized),

    Id: {
      OrgId:
        normalized.partyKind === 'ORGANISATION'
          ? {
              AnyBIC: valueOrNull(
                organisation.anyBic,
              ),
              LEI: valueOrNull(
                organisation.lei,
              ),
              Othr: organisation.other.map(mapOther),
            }
          : null,

      PrvtId:
        normalized.partyKind === 'PRIVATE_PERSON'
          ? {
              DtAndPlcOfBirth: {
                BirthDt: valueOrNull(
                  privateId.dateAndPlaceOfBirth.birthDate,
                ),
                PrvcOfBirth: valueOrNull(
                  privateId.dateAndPlaceOfBirth
                    .provinceOfBirth,
                ),
                CityOfBirth: valueOrNull(
                  privateId.dateAndPlaceOfBirth.cityOfBirth,
                ),
                CtryOfBirth: valueOrNull(
                  privateId.dateAndPlaceOfBirth
                    .countryOfBirth
                    .toUpperCase(),
                ),
              },
              Othr: privateId.other.map(mapOther),
            }
          : null,
    },

    CtryOfRes: valueOrNull(
      normalized.countryOfResidence.toUpperCase(),
    ),
  };
}


export interface CbprTransferPartiesPayload {
  Dbtr: ReturnType<typeof mapPartyToCbprParty>;
  UltmtDbtr: ReturnType<typeof mapPartyToCbprParty> | null;
  Cdtr: ReturnType<typeof mapPartyToCbprParty>;
  UltmtCdtr: ReturnType<typeof mapPartyToCbprParty> | null;
}

/**
 * Maps every transfer party to the corresponding CBPR+ party structure.
 *
 * Dbtr      -> debtor
 * UltmtDbtr -> ultimateDebtor when enabled
 * Cdtr      -> beneficiary
 * UltmtCdtr -> ultimateCreditor when enabled
 */
export function mapTransferPartiesToCbpr(
  order: import('./transfer.types').TransferOrder,
): CbprTransferPartiesPayload {
  return {
    Dbtr: mapPartyToCbprParty(order.debtor),
    UltmtDbtr: order.ultimateDebtorEnabled
      ? mapPartyToCbprParty(order.ultimateDebtor)
      : null,
    Cdtr: mapPartyToCbprParty(order.beneficiary),
    UltmtCdtr: order.ultimateCreditorEnabled
      ? mapPartyToCbprParty(order.ultimateCreditor)
      : null,
  };
}
