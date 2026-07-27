import React from 'react';
import type {
  ClientData,
  Modality,
  RegulatoryData,
  RegulatorySupportData,
  TransferOrder,
  TransferType,
} from '../transfer.types';
import { TypeBadge } from '../transfer.ui';
import { calculateCoverage } from '../transfer.utils';

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
        <p className="text-[9px] font-bold text-[#435B7B] uppercase tracking-wide mb-2">Endpoints cibles</p>
        {[
          ['AUTH', 'Agences user', '#435B7B'],
          ['REF-BQ', 'Client / comptes', '#0D9488'],
          ['REF', 'Devises / change', '#7C3AED'],
          ['MS-REG', 'Autorisations', '#F97316'],
          ['MS-DOMI', 'TCE', '#1D4ED8'],
        ].map(([label, description, color]) => (
          <div key={label} className="flex items-center gap-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-mono font-bold text-[#2D3E54]">{label}</span>
            <span className="text-[10px] text-[#7A90A4]">— {description}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
