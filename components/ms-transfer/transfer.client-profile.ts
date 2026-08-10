import type {
  ClientData,
  CustomerIdType,
} from './transfer.types';

export interface ClientActivityView {
  section?: string;
  division?: number;
  groupe?: number;
  classe?: number;
}

export type ClientPersonKind = 'P' | 'M';

const CUSTOMER_ID_LABELS: Record<CustomerIdType, string> = {
  CIN: 'CIN',
  MF: 'RNE',
  RC: 'Registre de commerce',
  PASSPORT: 'Passeport',
};

export function customerIdTypeLabel(type: CustomerIdType): string {
  return CUSTOMER_ID_LABELS[type];
}

export function clientPersonKind(client: ClientData): ClientPersonKind {
  return client.typeClient === 'PERSONNE_MORALE' ? 'M' : 'P';
}

export function clientPersonTypeLabel(client: ClientData): string {
  return clientPersonKind(client) === 'M'
    ? 'Personne Morale'
    : 'Personne Physique';
}

export function displayValue(
  value: string | number | null | undefined,
): string {
  return value != null && String(value).trim() !== ''
    ? String(value)
    : '—';
}

export function yesNo(value: boolean | null | undefined): string {
  if (value === true) return 'Oui';
  if (value === false) return 'Non';
  return '—';
}

export function formatNat09(
  activity?: ClientActivityView,
): string {
  if (!activity) return '—';

  const values = [
    activity.section,
    activity.division,
    activity.groupe,
    activity.classe,
  ].filter(value => value != null && String(value).trim() !== '');

  return values.length > 0 ? values.join('.') : '—';
}
