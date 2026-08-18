import type {
  TransferOrder,
} from './transfer.types';
import {
  areTransferPartiesComplete,
} from './transfer.cbpr-parties.validation';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

export function isCbprOrderComplete(
  order: TransferOrder,
): boolean {
  if (!text(order.montantOrdre)) return false;
  if (!text(order.deviseOrdre)) return false;
  if (!text(order.deviseTransfert)) return false;
  if (!text(order.dateValeur)) return false;
  if (!text(order.motifPaiement)) return false;
  if (!text(order.chargeBearer)) return false;

  if (!areTransferPartiesComplete(order)) {
    return false;
  }

  if (!text(order.beneficiaryBank.bicfi)) return false;
  if (!text(order.beneficiaryBank.nom)) return false;

  return true;
}
