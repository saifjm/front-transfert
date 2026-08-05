import React, { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Clock,
  Download,
  Eye,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

import type { TransferNavigationHandler } from './ms-transfer/transfer.types';
import { RECENT_TRANSFERS } from './ms-transfer/transfer.mock';
import {
  FI,
  KPI,
  StatusBadge,
  TypeBadge,
} from './ms-transfer/transfer.ui';

function TransferConsultation({ onNew }: { onNew: () => void }) {
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredTransfers = RECENT_TRANSFERS.filter(transfer => {
    const matchesSearch =
      !normalizedSearch ||
      transfer.ref.toLowerCase().includes(normalizedSearch) ||
      transfer.client.toLowerCase().includes(normalizedSearch) ||
      transfer.support.toLowerCase().includes(normalizedSearch);
    const matchesType =
      typeFilter === 'all' || transfer.type === typeFilter;
    const matchesStatus =
      statusFilter === 'all' || transfer.statut === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPI
          label="Commerciaux en cours"
          value={7}
          color="#1D4ED8"
          icon={TrendingUp}
        />
        <KPI
          label="Financiers en cours"
          value={3}
          color="#7C3AED"
          icon={Banknote}
        />
        <KPI
          label="Dossiers avec alerte"
          value={2}
          color="#F97316"
          icon={AlertTriangle}
        />
        <KPI
          label="En attente services centraux"
          value={4}
          color="#0D9488"
          icon={Clock}
        />
        <KPI
          label="Rejetés ce mois"
          value={1}
          color="#EF4444"
          icon={XCircle}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Critères de recherche</CardTitle>
              <CardDescription>
                Recherchez un dossier par référence, client, support,
                type ou statut.
              </CardDescription>
            </div>
            <Button type="button" onClick={onNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau transfert
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <FI
                label="Référence, client ou support"
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Rechercher un dossier..."
              />
            </div>
            <FI
              label="Type de transfert"
              value={typeFilter}
              onChange={setTypeFilter}
              select
              opts={[
                { value: 'all', label: 'Tous les types' },
                { value: 'commercial', label: 'Commercial' },
                { value: 'financier', label: 'Financier' },
              ]}
            />
            <FI
              label="Statut"
              value={statusFilter}
              onChange={setStatusFilter}
              select
              opts={[
                { value: 'all', label: 'Tous les statuts' },
                { value: 'brouillon', label: 'Brouillon' },
                {
                  value: 'en_cours_agence',
                  label: 'En cours agence',
                },
                {
                  value: 'attente_sc',
                  label: 'En attente services centraux',
                },
                { value: 'valide', label: 'Validé' },
                { value: 'rejete', label: 'Rejeté' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Dossiers de transfert</CardTitle>
              <CardDescription>
                {filteredTransfers.length} dossier(s) trouvé(s)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualiser
              </Button>
              <Button type="button" size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/50">
                <tr>
                  {[
                    'Référence',
                    'Type',
                    'Client',
                    'Montant',
                    'Support',
                    'Statut',
                    'Étape de traitement',
                    'Dernière MAJ',
                    'Action',
                  ].map(header => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map(transfer => (
                  <tr
                    key={transfer.ref}
                    className="border-b transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      {transfer.ref}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={transfer.type} />
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium">
                      {transfer.client}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {transfer.montant} {transfer.devise}
                    </td>
                    <td className="max-w-[150px] truncate px-4 py-3 text-muted-foreground">
                      {transfer.support}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={transfer.statut} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {transfer.etape}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {transfer.maj}
                    </td>
                    <td className="px-4 py-3">
                      <Button type="button" size="sm" variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredTransfers.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      Aucun dossier ne correspond aux critères
                      sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export interface MSTransferConsultationProps {
  onNavigate?: TransferNavigationHandler;
}

export function MSTransferConsultation({
  onNavigate,
}: MSTransferConsultationProps) {
  const openCreation = () => onNavigate?.('ms-tr-create');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Consultation des dossiers de transfert
          </h1>
          <p className="mt-1 text-muted-foreground">
            Transferts commerciaux et financiers émis vers l’étranger
          </p>
        </div>

        <Button type="button" onClick={openCreation}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau transfert
        </Button>
      </div>

      <TransferConsultation onNew={openCreation} />
    </div>
  );
}
