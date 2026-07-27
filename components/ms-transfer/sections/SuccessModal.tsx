import React from 'react';
import { CheckCircle2, Eye, Plus } from 'lucide-react';
import type { TransferType } from '../transfer.types';
import { HDR, StatusBadge, TypeBadge } from '../transfer.ui';

export function SuccessModal({
  transferType,
  onClose,
  onNew,
}: {
  transferType: TransferType | null;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 anim-fade-in-up">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #22C55E, #15803D)' }}>
            <CheckCircle2 size={30} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-[#2D3E54] mb-1">Transfert créé avec succès</h2>
          <p className="text-sm text-[#7A90A4]">L’ordre a été transmis à MS-TR et acheminé par MS-WORKFLOW.</p>
        </div>

        <div className="bg-[#F4F8FC] rounded-2xl p-4 mb-4 space-y-3">
          {[
            { label: 'Référence opération', value: <span className="font-mono text-sm font-bold text-[#435B7B]">TR-2026-000001</span> },
            { label: 'Type transfert', value: <TypeBadge type={transferType || 'commercial'} /> },
            { label: 'Statut', value: <StatusBadge status="en_cours_agence" /> },
            { label: 'Prochaine étape', value: <span className="text-xs font-semibold text-[#2D3E54]">Services centraux</span> },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="text-xs text-[#7A90A4]">{row.label}</span>
              {row.value}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#d1dce6] text-sm font-semibold text-[#435B7B] hover:bg-[#F4F8FC] transition-all"
          >
            <Eye size={14} />Consulter dossier
          </button>
          <button
            type="button"
            onClick={onNew}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={HDR}
          >
            <Plus size={14} />Nouveau transfert
          </button>
        </div>
      </div>
    </div>
  );
}
