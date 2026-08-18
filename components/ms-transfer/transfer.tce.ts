import type {
  RegulatorySupportData,
  TceAllocation,
  TCEResult,
  TransferOrder,
} from './transfer.types';
import { parseAmount } from './transfer.utils';

export interface TceAllocationValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TceAllocationTotals {
  byCurrency: Record<string, number>;
  lineCount: number;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * Current uniqueness key. It deliberately includes the title code and
 * domiciliation date in addition to the number so that the UI does not assume
 * that numDomi alone is globally unique before the DOMI contract confirms it.
 */
export function getTceBusinessKey(
  value: Pick<TceAllocation, 'codeTitre' | 'numDomi' | 'dateDomi'>,
): string {
  return [
    normalizeText(value.codeTitre).toUpperCase(),
    normalizeText(value.numDomi).toUpperCase(),
    normalizeText(value.dateDomi),
  ].join('|');
}

export function createTceAllocation(
  result: TCEResult,
  now = new Date(),
): TceAllocation {
  return {
    id:
      globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    codeTitre: normalizeText(result.codeTitre),
    numDomi: normalizeText(result.numDomi),
    dateDomi: normalizeText(result.dateDomi),
    devise: normalizeText(result.devise).toUpperCase(),
    montantAffecte: '',
    montantDisponibleControle: normalizeText(result.montantDispo),
    appartient: result.appartient === true,
    verificationState: result.state,
    checkedAt: now.toISOString(),
    typeEchec: result.typeEchec,
    codeErreur: result.codeErreur,
    libelleErreur: result.libelleErreur,
    reservationStatus: 'NOT_REQUESTED',
  };
}

export function hasDuplicateTceAllocation(
  allocations: TceAllocation[],
  candidate: Pick<TceAllocation, 'codeTitre' | 'numDomi' | 'dateDomi'>,
): boolean {
  const key = getTceBusinessKey(candidate);
  return allocations.some(allocation => getTceBusinessKey(allocation) === key);
}

export function calculateTceAllocationTotals(
  allocations: TceAllocation[],
): TceAllocationTotals {
  const byCurrency: Record<string, number> = {};

  for (const allocation of allocations) {
    const currency = normalizeText(allocation.devise).toUpperCase() || 'N/A';
    const amount = parseAmount(allocation.montantAffecte);
    byCurrency[currency] = (byCurrency[currency] ?? 0) + amount;
  }

  return {
    byCurrency,
    lineCount: allocations.length,
  };
}

export function validateTceAllocation(
  allocation: TceAllocation,
): TceAllocationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (
    allocation.verificationState !== 'success'
    || !allocation.appartient
  ) {
    errors.push(
      `Le titre ${allocation.numDomi || 'sans référence'} doit être vérifié et appartenir au client.`,
    );
  }

  const allocatedAmount = parseAmount(allocation.montantAffecte);
  if (allocatedAmount <= 0) {
    errors.push(
      `Le montant affecté au titre ${allocation.numDomi || 'sans référence'} doit être strictement positif.`,
    );
  }

  const available = parseAmount(allocation.montantDisponibleControle);
  if (available > 0 && allocatedAmount > available) {
    errors.push(
      `Le montant affecté au titre ${allocation.numDomi} dépasse le montant disponible constaté lors du contrôle.`,
    );
  }

  if (!normalizeText(allocation.devise)) {
    warnings.push(
      `La devise du titre ${allocation.numDomi || 'sans référence'} n’est pas disponible dans le contrôle courant.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateTceAllocations(
  allocations: TceAllocation[],
  order?: TransferOrder,
): TceAllocationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (allocations.length === 0) {
    errors.push('Au moins un titre de commerce extérieur doit être rattaché.');
  }

  const seen = new Set<string>();
  for (const allocation of allocations) {
    const key = getTceBusinessKey(allocation);
    if (seen.has(key)) {
      errors.push(
        `Le titre ${allocation.numDomi || 'sans référence'} est présent plusieurs fois.`,
      );
    }
    seen.add(key);

    const lineValidation = validateTceAllocation(allocation);
    errors.push(...lineValidation.errors);
    warnings.push(...lineValidation.warnings);
  }

  const totals = calculateTceAllocationTotals(allocations);
  const currencies = Object.keys(totals.byCurrency).filter(code => code !== 'N/A');

  // Multi-currency handling is intentionally non-blocking until the business
  // rule and conversion basis are confirmed.
  if (currencies.length > 1) {
    warnings.push(
      'Plusieurs devises TCE sont rattachées. Le cumul global n’est pas comparé au montant de l’ordre tant que la règle multi-devise n’est pas confirmée.',
    );
  }

  // Same-currency cumulative comparison is informative only. The ticket keeps
  // the exact cumulative rule as a business point to confirm.
  if (
    order
    && currencies.length === 1
    && normalizeText(order.deviseOrdre).toUpperCase() === currencies[0]
  ) {
    const assigned = totals.byCurrency[currencies[0]] ?? 0;
    const orderAmount = parseAmount(order.montantOrdre);

    if (assigned > 0 && orderAmount > 0 && assigned !== orderAmount) {
      warnings.push(
        `Le cumul affecté aux TCE (${assigned} ${currencies[0]}) diffère du montant de l’ordre (${orderAmount} ${currencies[0]}). La règle de cumul reste à confirmer.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

export function isRegulatorySupportComplete(
  support: RegulatorySupportData,
  order?: TransferOrder,
): boolean {
  if (support.type === 'FI') {
    const fi = support.ficheInformation;
    return Boolean(
      normalizeText(fi.numero)
      && normalizeText(fi.date)
      && normalizeText(fi.objet)
      && normalizeText(fi.montant)
      && normalizeText(fi.devise),
    );
  }

  if (support.type === 'TCE') {
    return validateTceAllocations(support.tceAllocations, order).valid;
  }

  return false;
}

export function formatTceAllocationTotals(
  allocations: TceAllocation[],
): string {
  const totals = calculateTceAllocationTotals(allocations);
  return Object.entries(totals.byCurrency)
    .map(([currency, amount]) => `${amount.toLocaleString('fr-FR')} ${currency}`)
    .join(' · ');
}
