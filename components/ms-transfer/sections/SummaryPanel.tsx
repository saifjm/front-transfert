import React from 'react';
import { Check, Clock } from 'lucide-react';
import type {
  ClientData,
  Modality,
  RegulatoryData,
  RegulatorySupportData,
  TransferOrder,
  TransferType,
} from '../transfer.types';
import { TypeBadge } from '../transfer.ui';
import {
  calculateCoverage,
  isOrderComplete,
  isSupportComplete,
} from '../transfer.utils';

export function SummaryPanel({
  transferType,
  client,
  commissionAccount,
  order,
  modalities,
  regulatoryData,
  support,
  section,
}: {
  transferType: TransferType | null;
  client: ClientData | null;
  commissionAccount: string;
  order: TransferOrder;
  modalities: Modality[];
  regulatoryData: RegulatoryData;
  support: RegulatorySupportData;
  section: number;
}) {
  const coverage = calculateCoverage(modalities, order.montantOrdre);
  const supportLabel = support.type === 'TCE'
    ? support.tceResult?.numDomi || 'TCE non vérifié'
    : support.type === 'FI'
      ? support.ficheInformation.numero || 'FI non renseignée'
      : '—';

  const regulatoryComplete = Boolean(regulatoryData.codeNatureOperation)
    && (!regulatoryData.authorizationRequired || Boolean(regulatoryData.selectedAuthorizationId));

  const rows = [
    { label: 'Type transfert', value: transferType ? <TypeBadge type={transferType} /> : '—', show: true },
    { label: 'Client', value: <span className="text-[10px]">{client?.nomRaison ?? '—'}</span>, show: section >= 1 },
    { label: 'Compte commission', value: commissionAccount ? <span className="font-mono text-[10px]">…{commissionAccount.slice(-8)}</span> : '—', show: section >= 1 },
    { label: 'Montant ordre', value: order.montantOrdre ? `${order.montantOrdre} ${order.deviseOrdre}` : '—', show: section >= 2 },
    { label: 'Bénéficiaire', value: <span className="text-[10px]">{order.beneficiary.nomRaison || '—'}</span>, show: section >= 2 },
    { label: 'Couverture', value: modalities.length ? <span className="font-bold" style={{ color: coverage.complete ? '#15803D' : '#C2410C' }}>{coverage.percentage}%</span> : '—', show: section >= 3 },
    { label: 'Nature BCT', value: regulatoryData.codeNatureOperation || '—', show: section >= 4 },
    { label: 'Autorisation', value: regulatoryData.authorizationRequired ? (regulatoryData.selectedAuthorizationId || 'À sélectionner') : 'Non requise', show: section >= 4 },
    { label: support.type === 'FI' ? 'Fiche information' : 'TCE', value: supportLabel, show: section >= 5 },
    { label: 'Statut', value: section >= 6 ? <span className="text-green-700 font-semibold text-[10px]">Revue finale</span> : <span className="text-amber-600 text-[10px]">En cours…</span>, show: section >= 1 },
  ];

  const progress = [
    {
      label: 'Client et compte',
      complete: client?.statut === 'ACTIF' && Boolean(commissionAccount),
    },
    {
      label: 'Ordre de transfert',
      complete: isOrderComplete(order),
    },
    {
      label: 'Modalités de paiement',
      complete: modalities.length > 0 && coverage.complete,
    },
    {
      label: 'Données règlementaires',
      complete: regulatoryComplete,
    },
    {
      label: 'Support règlementaire',
      complete: isSupportComplete(support),
    },
  ];

  return (
    <aside className="w-60 flex-shrink-0 space-y-3 hidden xl:block">
      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-4 sticky top-4" style={{ borderTop: '3px solid #435B7B' }}>
        <p className="text-[10px] font-bold text-[#435B7B] uppercase tracking-wide mb-3">Récapitulatif en cours</p>
        <div className="space-y-3 divide-y divide-[#EEF3F7]">
          {rows.filter(row => row.show).map(row => (
            <div key={row.label} className="pt-2 first:pt-0">
              <p className="text-[9px] text-[#7A90A4] uppercase tracking-wide mb-0.5">{row.label}</p>
              <div className="text-xs font-semibold text-[#2D3E54]">{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#F4F8FC] border border-[#d1dce6] rounded-xl p-3">
        <p className="text-[9px] font-bold text-[#435B7B] uppercase tracking-wide mb-2">Avancement du dossier</p>
        <div className="space-y-1">
          {progress.map(item => (
            <div key={item.label} className="flex items-center gap-2 py-1">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.complete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {item.complete ? <Check size={10} /> : <Clock size={10} />}
              </span>
              <span className={`text-[10px] font-semibold ${item.complete ? 'text-green-800' : 'text-amber-800'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
