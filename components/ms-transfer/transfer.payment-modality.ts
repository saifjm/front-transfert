import type {
  Modality,
  ModalityType,
  TransferOrder,
} from './transfer.types';
import {
  calculateCoverage,
  requiresDebitAccount,
  requiresFinancingFile,
} from './transfer.utils';

export const PAYMENT_MODALITY_TYPE_OPTIONS = [
  {
    value: 'ACHAT_DEVISE_COMPTE_TND',
    label: 'Achat devise sur compte TND',
  },
  {
    value: 'DEBIT_COMPTE_DEVISE',
    label: 'Débit compte en devises',
  },
  {
    value: 'CONTRAT_TERME',
    label: 'Contrat à terme',
  },
  {
    value: 'FINANCEMENT_IMPORT',
    label: 'Dossier de financement import',
  },
  {
    value: 'FONDS_AUTRE_BANQUE',
    label: "Fonds reçus d'une autre banque",
  },
  {
    value: 'NEGOCIATION_INTERBANCAIRE',
    label: 'Négociation interbancaire',
  },
] as const satisfies ReadonlyArray<{
  value: ModalityType;
  label: string;
}>;

export interface PaymentModalityStrategy {
  valueDateRequired: boolean;
}

/**
 * Current provisional rule: every modality requires its own value date.
 * This table is intentionally strategy-based so min/max/business-day rules
 * can later be specialized by modality without changing the UI component.
 */
const PAYMENT_MODALITY_STRATEGIES: Readonly<
  Record<ModalityType, PaymentModalityStrategy>
> = {
  ACHAT_DEVISE_COMPTE_TND: { valueDateRequired: true },
  DEBIT_COMPTE_DEVISE: { valueDateRequired: true },
  CONTRAT_TERME: { valueDateRequired: true },
  FINANCEMENT_IMPORT: { valueDateRequired: true },
  FONDS_AUTRE_BANQUE: { valueDateRequired: true },
  NEGOCIATION_INTERBANCAIRE: { valueDateRequired: true },
};

export function getPaymentModalityStrategy(
  type: ModalityType,
): PaymentModalityStrategy {
  return PAYMENT_MODALITY_STRATEGIES[type];
}

export function isModalityValueDateRequired(
  modality: Pick<Modality, 'type'>,
): boolean {
  return getPaymentModalityStrategy(modality.type).valueDateRequired;
}

export function getDefaultModalityValueDate(
  order: TransferOrder,
): string {
  // Prefill only at creation time. It remains independent afterwards.
  return String(order.dateValeur ?? '').trim();
}

function isValidIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function validateModalityValueDate(
  modality: Pick<Modality, 'type' | 'dateValeur'>,
): string | null {
  const value = String(modality.dateValeur ?? '').trim();

  if (!value) {
    return isModalityValueDateRequired(modality)
      ? 'La date de valeur de la modalité est obligatoire.'
      : null;
  }

  if (!isValidIsoCalendarDate(value)) {
    return 'La date de valeur de la modalité est invalide.';
  }

  // No min/max or working-day rule is applied until the business rule is
  // explicitly defined for the modality strategy.
  return null;
}

export function arePaymentModalitiesComplete(
  modalities: Modality[],
  orderAmount: string,
): boolean {
  const coverage = calculateCoverage(modalities, orderAmount);

  return modalities.length > 0
    && coverage.complete
    && modalities.every(
      modality => validateModalityValueDate(modality) === null,
    )
    && modalities.every(
      modality =>
        !requiresDebitAccount(modality.type)
        || Boolean(String(modality.compteADebiter ?? '').trim()),
    )
    && modalities.every(
      modality =>
        !requiresFinancingFile(modality.type)
        || Boolean(String(modality.dossierFinancementId ?? '').trim()),
    )
    && modalities.every(
      modality =>
        modality.fxRateMode === 'NORMAL'
        || Boolean(String(modality.coursSaisi ?? '').trim()),
    );
}
