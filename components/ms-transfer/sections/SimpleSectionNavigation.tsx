import React from 'react';
import {
  Banknote,
  Building2,
  ClipboardList,
  FileText,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { ClientData, TransferType } from '../transfer.types';
import { HDR } from '../transfer.ui';

export const NAVIGATION_ITEMS = [
  { label: 'Type', icon: FileText },
  { label: 'Client', icon: Building2 },
  { label: 'Ordre', icon: Send },
  { label: 'Modalités paiement', icon: Banknote },
  { label: 'Données règlementaires BCT', icon: ShieldCheck },
  { label: 'TCE', icon: FileText },
  { label: 'Récapitulatif', icon: ClipboardList },
];

function getSupportLabel(transferType: TransferType | null, client: ClientData | null) {
  if (transferType === 'financier') return 'FI';
  if (transferType === 'commercial' && client?.totalementExportatrice) return 'TCE / FI';
  return 'TCE';
}

export function SimpleSectionNavigation({
  current,
  transferType,
  client,
  onChange,
}: {
  current: number;
  transferType: TransferType | null;
  client: ClientData | null;
  onChange: (section: number) => void;
}) {
  return (
    <nav
      aria-label="Navigation du dossier transfert"
      className="bg-white border border-[#d1dce6] rounded-xl p-1.5 shadow-sm overflow-x-auto"
    >
      <div className="flex items-center gap-1 min-w-max">
        {NAVIGATION_ITEMS.map((item, index) => {
          const active = current === index;
          const label = index === 5
            ? getSupportLabel(transferType, client)
            : item.label;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(index)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'text-white shadow-sm'
                  : 'text-[#435B7B] hover:bg-[#F4F8FC]'
              }`}
              style={active ? HDR : undefined}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
