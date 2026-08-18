import type {
  CbprPartyData,
  TransferOrder,
  TransferPartyRole,
} from './transfer.types';
import {
  isCbprPartyCoreComplete,
} from './transfer.cbpr-party';

export interface TransferPartyValidationResult {
  role: TransferPartyRole;
  valid: boolean;
}

function validateRequiredParty(
  role: TransferPartyRole,
  party: CbprPartyData,
  accountRequired: boolean,
): TransferPartyValidationResult {
  return {
    role,
    valid: isCbprPartyCoreComplete(
      party,
      {
        accountRequired,
        countryRequired: true,
      },
    ),
  };
}

/**
 * Validates all four transfer-party roles.
 *
 * Dbtr and Cdtr are always required.
 * UltmtDbtr and UltmtCdtr are required only when their enable flag is true.
 */
export function validateTransferParties(
  order: TransferOrder,
): TransferPartyValidationResult[] {
  const results: TransferPartyValidationResult[] = [
    validateRequiredParty(
      'DEBTOR',
      order.debtor,
      true,
    ),
    validateRequiredParty(
      'CREDITOR',
      order.beneficiary,
      true,
    ),
  ];

  if (order.ultimateDebtorEnabled) {
    results.push(
      validateRequiredParty(
        'ULTIMATE_DEBTOR',
        order.ultimateDebtor,
        false,
      ),
    );
  }

  if (order.ultimateCreditorEnabled) {
    results.push(
      validateRequiredParty(
        'ULTIMATE_CREDITOR',
        order.ultimateCreditor,
        false,
      ),
    );
  }

  return results;
}

export function areTransferPartiesComplete(
  order: TransferOrder,
): boolean {
  return validateTransferParties(order).every(
    result => result.valid,
  );
}
