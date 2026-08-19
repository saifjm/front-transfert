import type {
  BankData,
  PartyData,
  TransferOrder,
} from './transfer.types';

export function createEmptyParty(): PartyData {
  return {
    nomRaison: '',
    type: '',
    codePays: '',
    pays: '',
    townName: '',
    compte: '',
    adresseLigne1: '',
    adresseLigne2: '',
    codePostal: '',
    residence: '',
    typePiece: '',
    noPiece: '',
  };
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
 * Runtime creation state: no operational/business value is guessed.
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
