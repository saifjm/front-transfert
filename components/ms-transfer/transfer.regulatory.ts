import type {
  CommercialValuationBasis,
  RegulatoryData,
  TransferOrder,
  TransferType,
} from './transfer.types';

export type CommercialBctNatureCode = '0111' | '0112';

export const COMMERCIAL_BCT_NATURE_LABELS: Record<
  CommercialBctNatureCode,
  string
> = {
  '0111': 'Exportations/importations FOB ou équivalent',
  '0112': 'Exportations/importations CAF ou équivalent',
};

export const COMMERCIAL_VALUATION_BASIS_LABELS: Record<
  CommercialValuationBasis,
  string
> = {
  FOB_EQUIVALENT: 'FOB ou équivalent',
  CAF_EQUIVALENT: 'CAF ou équivalent',
  UNDETERMINED: 'Non déterminée',
};

export function normalizeCommercialValuationBasis(
  basis: CommercialValuationBasis | null | undefined,
): CommercialValuationBasis {
  if (basis === 'FOB_EQUIVALENT' || basis === 'CAF_EQUIVALENT') {
    return basis;
  }

  return 'UNDETERMINED';
}

/**
 * Automatic BCT rule currently implemented for eligible commercial transfers:
 * - FOB or equivalent -> 0111
 * - CAF or equivalent -> 0112
 *
 * The upstream operation/TCE logic is responsible for establishing the
 * valuation basis. An undetermined basis is accepted and is NON-BLOCKING.
 */
export function determineCommercialNatureOperationBct(
  basis: CommercialValuationBasis | null | undefined,
): CommercialBctNatureCode | null {
  switch (normalizeCommercialValuationBasis(basis)) {
    case 'FOB_EQUIVALENT':
      return '0111';
    case 'CAF_EQUIVALENT':
      return '0112';
    default:
      return null;
  }
}

export function normalizeBctNatureCode(value: unknown): string {
  return String(value ?? '').trim();
}

export function isFourDigitBctNatureCode(value: unknown): boolean {
  return /^\d{4}$/.test(normalizeBctNatureCode(value));
}

export interface RegulatoryNatureAssessment {
  codeNatureOperationBct: string;
  expectedCommercialCode: CommercialBctNatureCode | null;
  warnings: string[];
}

/**
 * Evaluates the nature code for display/audit only.
 * Warnings returned here MUST NOT disable navigation or submission.
 */
export function assessRegulatoryNature(
  transferType: TransferType | null,
  order: TransferOrder,
  value: RegulatoryData,
): RegulatoryNatureAssessment {
  const warnings: string[] = [];
  const codeNatureOperationBct = normalizeBctNatureCode(
    value.codeNatureOperationBct,
  );

  const expectedCommercialCode =
    transferType === 'commercial'
      ? determineCommercialNatureOperationBct(
          order.commercialValuationBasis,
        )
      : null;

  if (transferType === 'commercial') {
    if (!expectedCommercialCode) {
      warnings.push(
        'Le code nature opération BCT n’a pas pu être déterminé automatiquement à ce stade.',
      );
    } else if (
      codeNatureOperationBct
      && codeNatureOperationBct !== expectedCommercialCode
    ) {
      warnings.push(
        `Le code nature opération BCT attendu à partir des données disponibles est ${expectedCommercialCode}.`,
      );
    }
  }

  if (
    codeNatureOperationBct
    && !isFourDigitBctNatureCode(codeNatureOperationBct)
  ) {
    warnings.push(
      'Le code nature opération BCT devrait contenir exactement quatre chiffres.',
    );
  }

  return {
    codeNatureOperationBct,
    expectedCommercialCode,
    warnings: [...new Set(warnings)],
  };
}

export interface RegulatoryBlockingValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Blocking validation for the Regulatory step.
 * The BCT nature code is intentionally NOT part of this validation.
 */
export function validateRegulatoryData(
  value: RegulatoryData,
): RegulatoryBlockingValidationResult {
  const errors: string[] = [];

  if (
    value.authorizationRequired
    && !String(value.selectedAuthorizationId ?? '').trim()
  ) {
    errors.push(
      'Une autorisation BCT active doit être sélectionnée.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Used by wizard navigation and final readiness.
 * Missing/undetermined codeNatureOperationBct is NON-BLOCKING.
 */
export function isRegulatoryDataComplete(
  value: RegulatoryData,
): boolean {
  return validateRegulatoryData(value).valid;
}

export function getCommercialValuationBasisLabel(
  basis: CommercialValuationBasis | null | undefined,
): string {
  return COMMERCIAL_VALUATION_BASIS_LABELS[
    normalizeCommercialValuationBasis(basis)
  ];
}

export function getBctNatureOperationLabel(
  code: string,
): string {
  return COMMERCIAL_BCT_NATURE_LABELS[
    code as CommercialBctNatureCode
  ] ?? '';
}
