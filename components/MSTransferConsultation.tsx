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
import type { TransferNavigationHandler } from './ms-transfer/transfer.types';
import { RECENT_TRANSFERS } from './ms-transfer/transfer.mock';
import {
  FI,
  HDR,
  KPI,
  StatusBadge,
  TypeBadge,
} from './ms-transfer/transfer.ui';

/* ─── Consultation sub-component ───────────────────────── */
function TransferConsultation({ onNew }: { onNew: () => void }) {
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredTransfers = RECENT_TRANSFERS.filter(transfer => {
    const matchesSearch = !normalizedSearch
      || transfer.ref.toLowerCase().includes(normalizedSearch)
      || transfer.client.toLowerCase().includes(normalizedSearch)
      || transfer.support.toLowerCase().includes(normalizedSearch);
    const matchesType = typeFilter === 'all' || transfer.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || transfer.statut === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 page-transition">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 anim-fade-in-up">
        <KPI label="Commerciaux en cours" value={7} color="#1D4ED8" icon={TrendingUp} />
        <KPI label="Financiers en cours" value={3} color="#7C3AED" icon={Banknote} />
        <KPI label="Dossiers avec alerte" value={2} color="#F97316" icon={AlertTriangle} />
        <KPI label="En attente SC" value={4} color="#0D9488" icon={Clock} />
        <KPI label="Rejetés ce mois" value={1} color="#EF4444" icon={XCircle} />
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5 anim-fade-in-up delay-100" style={{ borderTop: '3px solid #435B7B' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#2D3E54]">Consultation des dossiers de transfert</h2>
            <p className="text-xs text-[#7A90A4] mt-0.5">Recherchez les transferts enregistrés dans l'agence.</p>
          </div>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-sm"
            style={HDR}
          >
            <Plus size={16} />Nouveau transfert
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              { value: 'en_cours_agence', label: 'En cours agence' },
              { value: 'attente_sc', label: 'En attente SC' },
              { value: 'valide', label: 'Validé' },
              { value: 'rejete', label: 'Rejeté' },
            ]}
          />
        </div>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm overflow-hidden anim-fade-in-up delay-200">
        <div className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#2D3E54]">Dossiers de transfert</h2>
            <p className="text-xs text-[#7A90A4] mt-0.5">{filteredTransfers.length} dossier(s) trouvé(s)</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#d1dce6] text-[#435B7B] hover:bg-[#F4F8FC] transition-all"><RefreshCw size={12} />Actualiser</button>
            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#d1dce6] text-[#435B7B] hover:bg-[#F4F8FC] transition-all"><Download size={12} />Exporter</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#F4F8FC' }}>
              {['Référence', 'Type', 'Client', 'Montant', 'Support', 'Statut', 'Étape workflow', 'Dernière MAJ', 'Action'].map(h =>
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#435B7B] uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredTransfers.map(tr => (
                <tr key={tr.ref} className="border-t border-[#EEF3F7] hover:bg-[#EEF3F7]/50 transition-all">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-[#435B7B]">{tr.ref}</td>
                  <td className="px-4 py-3"><TypeBadge type={tr.type} /></td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#2D3E54] max-w-[150px] truncate">{tr.client}</td>
                  <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{tr.montant} {tr.devise}</td>
                  <td className="px-4 py-3 text-xs text-[#6B7A8D] max-w-[120px] truncate">{tr.support}</td>
                  <td className="px-4 py-3"><StatusBadge status={tr.statut} /></td>
                  <td className="px-4 py-3 text-xs text-[#6B7A8D]">{tr.etape}</td>
                  <td className="px-4 py-3 text-xs text-[#7A90A4] whitespace-nowrap">{tr.maj}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#d1dce6] text-[#435B7B] hover:bg-[#F4F8FC] transition-all"><Eye size={11} />Voir</button>
                  </td>
                </tr>
              ))}
              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#7A90A4]">
                    Aucun dossier ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
    <div className="p-6 max-w-7xl mx-auto space-y-5 page-transition">
      <div
        className="rounded-2xl p-5 text-white anim-fade-in-up"
        style={HDR}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Search size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Dossier Transfert</h1>
              <p className="text-xs text-white/70 mt-0.5">
                Consultation des transferts commerciaux et financiers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreation}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/20 hover:bg-white/30 transition-all border border-white/20"
          >
            <Plus size={16} />
            Nouveau transfert
          </button>
        </div>
      </div>

      <TransferConsultation onNew={openCreation} />
    </div>
  );
}
