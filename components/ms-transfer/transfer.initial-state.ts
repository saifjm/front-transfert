import type {
  BankData,
  PartyData,
  TransferOrder,
} from './transfer.types';

import {
  createEmptyParty as createStructuredEmptyParty,
} from './transfer.party-structured';

export function createEmptyParty(): PartyData {
  return createStructuredEmptyParty();
}

export function createEmptyBank(): BankData {
  return {
    bicfi: '',
    nom: '',
    codePays: '',
    pays: '',
    townName: '',
    adresse: '',
  };
}

/**
 * Runtime creation state: all four parties are created with the complete
 * structured PartyData shape.
 */
export function createBlankTransferOrder(): TransferOrder {
  return {
    montantOrdre: '',
    deviseOrdre: '',
    deviseTransfert: '',
    dateValeur: '',
    coursConversion: '',
    contreValeurTnd: '',
    serviceLevel: '',
    purposeCode: '',
    refFacture: '',
    chargeBearer: '',
    motifPaiement: '',
    observations: '',

    debtor: createEmptyParty(),

    ultimateDebtorEnabled: false,
    ultimateDebtor: createEmptyParty(),

    beneficiary: createEmptyParty(),

    ultimateCreditorEnabled: false,
    ultimateCreditor: createEmptyParty(),

    beneficiaryBank: createEmptyBank(),
  };
}
