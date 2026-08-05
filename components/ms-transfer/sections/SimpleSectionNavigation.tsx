import React from 'react';
import {
  Banknote,
  Building2,
  ClipboardList,
  FileText,
  Send,
  ShieldCheck,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';
import type { ClientData, TransferType } from '../transfer.types';

export const NAVIGATION_ITEMS = [
  { label: 'Type', icon: FileText },
  { label: 'Client', icon: Building2 },
  { label: 'Ordre', icon: Send },
  { label: 'Modalités paiement', icon: Banknote },
  { label: 'Données règlementaires BCT', icon: ShieldCheck },
  { label: 'TCE', icon: FileText },
  { label: 'Récapitulatif', icon: ClipboardList },
];

function getSupportLabel(
  transferType: TransferType | null,
  client: ClientData | null,
) {
  if (transferType === 'financier') return 'FI';
  if (
    transferType === 'commercial' &&
    client?.totalementExportatrice
  ) {
    return 'TCE / FI';
  }
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
    <Tabs
      value={String(current)}
      onValueChange={value => onChange(Number(value))}
      className="w-full"
    >
      <div className="w-full overflow-x-auto pb-1">
        <TabsList className="grid h-auto min-w-[980px] grid-cols-7">
          {NAVIGATION_ITEMS.map((item, index) => {
            const label =
              index === 5
                ? getSupportLabel(transferType, client)
                : item.label;
            const Icon = item.icon;

            return (
              <TabsTrigger
                key={item.label}
                value={String(index)}
                className="gap-2 whitespace-nowrap px-3 py-2.5 text-xs"
              >
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}
