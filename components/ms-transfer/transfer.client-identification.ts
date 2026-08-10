import type {
  CustomerIdType,
  TransferType,
} from './transfer.types';

export const COMMERCIAL_CUSTOMER_ID_TYPE: CustomerIdType = 'MF';
export const COMMERCIAL_CUSTOMER_ID_TYPE_LABEL =
  'Matricule fiscal / RNE';
export const COMMERCIAL_CUSTOMER_IDENTIFIER_LABEL =
  'Numéro Pièce Client (RNE)';

export const RNE_FORMAT_HELP =
  'Format: 7 chiffres + 1 lettre de contrôle (validation automatique)';

export const RNE_INVALID_MESSAGE =
  'Le matricule fiscal / RNE est invalide. Vérifiez le format et la lettre de contrôle.';

export const FINANCIAL_CUSTOMER_ID_OPTIONS: ReadonlyArray<{
  value: CustomerIdType;
  label: string;
}> = [
  { value: 'CIN', label: 'CIN' },
  { value: 'PASSPORT', label: 'Passeport' },
  { value: 'MF', label: 'Matricule fiscal / RNE' },
  { value: 'RC', label: 'Registre de commerce' },
];

export const CUSTOMER_ID_TYPE_LABELS: Readonly<Record<CustomerIdType, string>> = {
  CIN: 'CIN',
  PASSPORT: 'Passeport',
  MF: 'RNE',
  RC: 'Registre de commerce',
};

export type RneValidationState =
  | 'EMPTY'
  | 'INCOMPLETE'
  | 'VALID'
  | 'INVALID_FORMAT'
  | 'INVALID_CONTROL_LETTER';

export interface RneValidationFeedback {
  state: RneValidationState;
  normalizedValue: string;
  valid: boolean;
  message: string;
}

const RNE_CONTROL_VECTOR = 'ABCDEFGHJKLMNPQRSTVWXYZ';
const RNE_FORMAT_PATTERN = /^\d{7}[A-Z]$/;

export function isCommercialTransfer(
  transferType: TransferType,
): boolean {
  return transferType === 'commercial';
}

/**
 * Guarantees that a commercial client search can never send CIN, passport or
 * another identifier type, even if stale UI state is still present.
 */
export function resolveCustomerIdType(
  transferType: TransferType,
  selectedFinancialType: CustomerIdType,
): CustomerIdType {
  return isCommercialTransfer(transferType)
    ? COMMERCIAL_CUSTOMER_ID_TYPE
    : selectedFinancialType;
}

export function isRneCustomerIdType(
  customerIdType: CustomerIdType,
): boolean {
  return customerIdType === 'MF';
}

export function getCustomerIdTypeLabel(
  customerIdType: CustomerIdType,
): string {
  return CUSTOMER_ID_TYPE_LABELS[customerIdType];
}

export function getCustomerIdentifierFieldLabel(
  customerIdType: CustomerIdType,
): string {
  switch (customerIdType) {
    case 'CIN':
      return 'Numéro Pièce Client (CIN)';
    case 'PASSPORT':
      return 'Numéro Pièce Client (Passeport)';
    case 'MF':
      return COMMERCIAL_CUSTOMER_IDENTIFIER_LABEL;
    case 'RC':
      return 'Numéro Pièce Client (Registre de commerce)';
  }
}

export function getCustomerIdentifierPlaceholder(
  customerIdType: CustomerIdType,
): string {
  switch (customerIdType) {
    case 'CIN':
      return 'Ex: 07458963';
    case 'PASSPORT':
      return 'Saisir le numéro du passeport';
    case 'MF':
      return 'Ex: 1695881M';
    case 'RC':
      return 'Saisir le numéro du registre de commerce';
  }
}

export function getCustomerIdentifierHelp(
  customerIdType: CustomerIdType,
): string {
  return isRneCustomerIdType(customerIdType)
    ? RNE_FORMAT_HELP
    : 'Saisissez le numéro tel qu’il figure sur la pièce sélectionnée.';
}

export function getCustomerIdentifierMaxLength(
  customerIdType: CustomerIdType,
): number | undefined {
  return isRneCustomerIdType(customerIdType) ? 8 : undefined;
}

/**
 * Normalization applied before validation and before the client search.
 * Internal spaces are deliberately preserved so malformed values are rejected
 * instead of silently rewritten.
 *
 * The two-argument form is retained for compatibility with older callers.
 */
export function normalizeCustomerIdentifier(value: string): string;
export function normalizeCustomerIdentifier(
  _transferType: TransferType,
  value: string,
): string;
export function normalizeCustomerIdentifier(
  valueOrTransferType: string,
  optionalValue?: string,
): string {
  const value = optionalValue ?? valueOrTransferType;
  return value.trim().toUpperCase();
}

/**
 * Faithful TypeScript translation of the legacy PL/SQL CONTROLE_RNE function.
 *
 * Return codes:
 * - 0: valid
 * - 1: invalid
 *
 * The caller must still enforce /^\d{7}[A-Z]$/ before invoking this function.
 */
export function controleRne(pStr: string): 0 | 1 {
  try {
    if (pStr.length !== 8) {
      return 1;
    }

    // Kept for parity with the supplied PL/SQL source. It remains unreachable
    // after the eight-character length check.
    if (pStr === '            ') {
      return 0;
    }

    const firstSeven = pStr.substring(0, 7);
    const firstSevenNumber = Number(firstSeven);

    if (
      !Number.isFinite(firstSevenNumber)
      || firstSevenNumber >= 9_999_999
    ) {
      return 1;
    }

    let sum = 0;

    for (let i = 1; i <= 7; i += 1) {
      const digitAsText = pStr.substring(7 - i, 8 - i);
      const digit = Number(digitAsText);

      if (!Number.isFinite(digit)) {
        return 1;
      }

      sum += digit * i;
    }

    const vectorPosition = (sum % 23) + 1;
    const expectedControlLetter = RNE_CONTROL_VECTOR.substring(
      vectorPosition - 1,
      vectorPosition,
    );

    return pStr.substring(7, 8) === expectedControlLetter ? 0 : 1;
  } catch {
    return 1;
  }
}

export function isValidRne(value: string): boolean {
  const normalized = value.trim().toUpperCase();

  return (
    RNE_FORMAT_PATTERN.test(normalized)
    && controleRne(normalized) === 0
  );
}

/**
 * Returns display-oriented feedback at every keystroke.
 *
 * No network call is involved. The result is also reused by the search guard
 * so UI feedback and submit validation cannot diverge.
 */
export function validateRneRealtime(
  rawValue: string,
): RneValidationFeedback {
  const normalizedValue = rawValue.trim().toUpperCase();

  if (!normalizedValue) {
    return {
      state: 'EMPTY',
      normalizedValue,
      valid: false,
      message: RNE_FORMAT_HELP,
    };
  }

  if (normalizedValue.length < 8) {
    return {
      state: 'INCOMPLETE',
      normalizedValue,
      valid: false,
      message:
        `${normalizedValue.length}/8 caractères saisis — `
        + '7 chiffres suivis d’une lettre.',
    };
  }

  if (!RNE_FORMAT_PATTERN.test(normalizedValue)) {
    return {
      state: 'INVALID_FORMAT',
      normalizedValue,
      valid: false,
      message:
        'Format invalide. Saisissez exactement 7 chiffres suivis d’une lettre.',
    };
  }

  if (controleRne(normalizedValue) !== 0) {
    return {
      state: 'INVALID_CONTROL_LETTER',
      normalizedValue,
      valid: false,
      message:
        'Le matricule fiscal / RNE est invalide. Vérifiez la lettre de contrôle.',
    };
  }

  return {
    state: 'VALID',
    normalizedValue,
    valid: true,
    message: 'Matricule fiscal / RNE valide.',
  };
}

/**
 * Submit-time validation shared by keyboard, programmatic and button-driven
 * searches.
 *
 * Passing a CustomerIdType is the preferred form. TransferType values are
 * accepted for compatibility with older code: commercial maps to MF, while a
 * financial transfer without an explicit identifier type receives only the
 * mandatory-field validation.
 */
export function validateCustomerIdentifier(
  context: CustomerIdType | TransferType,
  normalizedValue: string,
): string | null {
  const customerIdType: CustomerIdType | null =
    context === 'commercial'
      ? 'MF'
      : context === 'financier'
        ? null
        : context;

  if (!normalizedValue) {
    return customerIdType === 'MF'
      ? 'Le matricule fiscal / RNE est obligatoire.'
      : 'Veuillez saisir le numéro de pièce.';
  }

  if (customerIdType !== 'MF') {
    return null;
  }

  const feedback = validateRneRealtime(normalizedValue);
  return feedback.valid ? null : feedback.message;
}
