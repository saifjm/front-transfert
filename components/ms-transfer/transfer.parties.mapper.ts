import type {
  TransferOrder,
} from './transfer.types';
import {
  mapTransferPartiesToCbpr,
} from './transfer.cbpr-party.mapper';

/**
 * Dedicated facade for the four ISO 20022 transfer parties.
 *
 * This deliberately does not map beneficiary bank / debtor agent /
 * creditor agent. Those are financial agents, not PartyIdentification135.
 */
export function buildCbprTransferParties(
  order: TransferOrder,
) {
  return mapTransferPartiesToCbpr(order);
}
