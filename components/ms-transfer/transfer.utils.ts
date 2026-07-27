import type {
  ClientData,
  Modality,
  PartyData,
  RegulatorySupportData,
  SupportType,
  TransferOrder,
  TransferType,
} from './transfer.types';

export function parseAmount(value: string): number {
  const normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/,/g, '.');
  return Number.parseFloat(normalized) || 0;
}

export function formatAmount(value: number, digits = 3): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function clientToParty(client: ClientData): PartyData {
  return {
    nomRaison: client.nomRaison,
    type: client.typeClient,
    codePays: client.codePays,
    pays: client.pays,
    townName: client.ville,
    compte: '',
    adresseLigne1: client.adresse,
    adresseLigne2: '',
    codePostal: '',
    residence: client.resident ? 'RESIDENT' : 'NON_RESIDENT',
    typePiece: client.typePiece,
    noPiece: client.noPiece,
  };
}

export function calculateCoverage(modalities: Modality[], orderAmount: string) {
  const total = parseAmount(orderAmount);
  const covered = modalities.reduce(
    (sum, modality) => sum + parseAmount(modality.montant),
    0,
  );
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;
  return {
    total,
    covered,
    percentage: Math.max(0, Math.min(100, percentage)),
    complete: total > 0 && Math.abs(total - covered) < 0.001,
  };
}

export function requiresDebitAccount(type: Modality['type']): boolean {
  return type === 'ACHAT_DEVISE_COMPTE_TND'
    || type === 'DEBIT_COMPTE_DEVISE'
    || type === 'CONTRAT_TERME';
}

export function requiresFinancingFile(type: Modality['type']): boolean {
  return type === 'FINANCEMENT_IMPORT';
}

export function resolveSupportRule(
  transferType: TransferType | null,
  client: ClientData | null,
): SupportType | 'CHOICE' | null {
  if (!transferType) return null;
  if (transferType === 'financier') return 'FI';
  if (!client) return null;
  return client.totalementExportatrice ? 'CHOICE' : 'TCE';
}

export function isOrderComplete(order: TransferOrder): boolean {
  return Boolean(
    order.deviseOrdre
      && parseAmount(order.montantOrdre) > 0
      && order.deviseTransfert
      && order.dateValeur
      && order.debtor.nomRaison
      && order.beneficiary.nomRaison
      && order.beneficiary.type
      && order.beneficiary.codePays
      && order.beneficiary.townName
      && order.beneficiary.compte
      && order.beneficiaryBank.bicfi
      && order.motifPaiement
      && order.chargeBearer,
  );
}

export function isSupportComplete(support: RegulatorySupportData): boolean {
  if (support.type === 'FI') {
    return Boolean(
      support.ficheInformation.numero
        && support.ficheInformation.date
        && support.ficheInformation.objet,
    );
  }
  if (support.type === 'TCE') {
    return support.tceResult?.state === 'success'
      && support.tceResult.appartient;
  }
  return false;
}
