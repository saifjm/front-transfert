import type {
  BankData,
  TransferOrder,
} from './transfer.types';
import {
  createEmptyCbprParty,
} from './transfer.cbpr-party';

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
 * Runtime creation state.
 *
 * No amount, currency, party kind, address mode, country, identifier,
 * beneficiary, bank or payment instruction has a default value.
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

    debtor: createEmptyCbprParty(),

    ultimateDebtorEnabled: false,
    ultimateDebtor: createEmptyCbprParty(),

    beneficiary: createEmptyCbprParty(),

    ultimateCreditorEnabled: false,
    ultimateCreditor: createEmptyCbprParty(),

    beneficiaryBank: createEmptyBank(),
  };
}
