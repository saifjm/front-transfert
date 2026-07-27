import React from 'react';
import { Check, Clock, Plus, Trash2 } from 'lucide-react';
import { MODALITY_TYPE_OPTIONS } from '../transfer.mock';
import type { AccountRow, Modality, ModalityType, TransferOrder } from '../transfer.types';
import { FI } from '../transfer.ui';
import {
  calculateCoverage,
  formatAmount,
  parseAmount,
  requiresDebitAccount,
  requiresFinancingFile,
} from '../transfer.utils';

function newModality(order: TransferOrder, accounts: AccountRow[]): Modality {
  const defaultAccount = accounts.find(account => account.devise === 'TND') ?? accounts[0];
  const amount = parseAmount(order.montantOrdre);
  const rate = parseAmount(order.coursConversion);
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: 'ACHAT_DEVISE_COMPTE_TND',
    montant: order.montantOrdre,
    deviseOrdre: order.deviseOrdre,
    compteADebiter: defaultAccount?.numero ?? '',
    deviseCompte: defaultAccount?.devise ?? '',
    dossierFinancementId: '',
    fxRateMode: 'NORMAL',
    coursIndicatif: order.coursConversion,
    coursSaisi: '',
    montantDebit: rate > 0 ? formatAmount(amount * rate) : '',
    refDeal: '',
    blocage: true,
  };
}

export function PaymentModalitiesSection({
  modalities,
  order,
  accounts,
  onChange,
}: {
  modalities: Modality[];
  order: TransferOrder;
  accounts: AccountRow[];
  onChange: (modalities: Modality[]) => void;
}) {
  const coverage = calculateCoverage(modalities, order.montantOrdre);
  const barColor = coverage.complete ? '#22C55E' : coverage.percentage > 50 ? '#F97316' : '#EF4444';

  const add = () => onChange([...modalities, newModality(order, accounts)]);
  const remove = (id: string) => onChange(modalities.filter(modality => modality.id !== id));

  const update = <K extends keyof Modality>(id: string, field: K, value: Modality[K]) => {
    onChange(modalities.map(modality => {
      if (modality.id !== id) return modality;
      const updated = { ...modality, [field]: value };

      if (field === 'compteADebiter') {
        const selectedAccount = accounts.find(account => account.numero === value);
        updated.deviseCompte = selectedAccount?.devise ?? '';
        if (selectedAccount?.devise !== 'TND') {
          updated.fxRateMode = 'NORMAL';
          updated.coursSaisi = '';
        }
      }

      if (field === 'montant' || field === 'coursSaisi' || field === 'fxRateMode') {
        const amount = parseAmount(field === 'montant' ? String(value) : updated.montant);
        const appliedRate = updated.fxRateMode === 'NORMAL'
          ? parseAmount(updated.coursIndicatif)
          : parseAmount(field === 'coursSaisi' ? String(value) : updated.coursSaisi);
        updated.montantDebit = appliedRate > 0 ? formatAmount(amount * appliedRate) : '';
      }

      return updated;
    }));
  };

  const accountOptions = [
    { value: '', label: 'Sélectionner un compte' },
    ...accounts.map(account => ({
      value: account.numero,
      label: `${account.numero} — ${account.devise} — ${account.solde}`,
    })),
  ];

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Modalités de paiement</h2>
        <p className="text-sm text-[#7A90A4]">
          Le montant de chaque modalité est exprimé dans la devise de l’ordre. La somme des modalités doit couvrir 100 % du montant de l’ordre.
        </p>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: `3px solid ${barColor}` }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-sm font-bold text-[#2D3E54]">Couverture du transfert</span>
          <span className="text-sm font-bold" style={{ color: barColor }}>
            {formatAmount(coverage.covered)} {order.deviseOrdre} / {formatAmount(coverage.total)} {order.deviseOrdre} — {coverage.percentage}%
          </span>
        </div>
        <div className="w-full h-4 bg-[#F4F8FC] rounded-full overflow-hidden border border-[#d1dce6] mb-3">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${coverage.percentage}%`, background: `linear-gradient(90deg, ${barColor}BB, ${barColor})` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { ok: coverage.complete, label: 'Couverture 100 %' },
            { ok: modalities.length > 0, label: 'Modalité définie' },
            { ok: modalities.every(modality => !requiresDebitAccount(modality.type) || Boolean(modality.compteADebiter)), label: 'Compte renseigné si requis' },
            { ok: modalities.every(modality => !requiresFinancingFile(modality.type) || Boolean(modality.dossierFinancementId)), label: 'Dossier financement renseigné' },
            { ok: modalities.every(modality => modality.fxRateMode === 'NORMAL' || Boolean(modality.coursSaisi)), label: 'Cours négocié / terme renseigné' },
          ].map(control => (
            <span key={control.label} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${control.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {control.ok ? <Check size={10} /> : <Clock size={10} />}{control.label}
            </span>
          ))}
        </div>
      </div>

      {modalities.map((modality, index) => {
        const debitAccountRequired = requiresDebitAccount(modality.type);
        const financingRequired = requiresFinancingFile(modality.type);
        const tndAccount = modality.deviseCompte === 'TND';
        const editableRate = tndAccount && modality.fxRateMode !== 'NORMAL';

        return (
          <div key={modality.id} className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5 anim-fade-in-up" style={{ borderTop: '3px solid #0D9488' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-[#2D3E54]">Modalité #{index + 1}</span>
              <button
                type="button"
                onClick={() => remove(modality.id)}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-all"
              >
                <Trash2 size={12} />Supprimer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FI
                label="Type de modalité"
                value={modality.type}
                onChange={value => update(modality.id, 'type', value as ModalityType)}
                select
                required
                opts={MODALITY_TYPE_OPTIONS.map(option => ({ ...option }))}
              />
              <FI
                label={`Montant modalité (${order.deviseOrdre})`}
                value={modality.montant}
                onChange={value => update(modality.id, 'montant', value)}
                required
              />
              <FI label="Devise de l’ordre" value={order.deviseOrdre} disabled />

              {debitAccountRequired && (
                <>
                  <FI
                    label="Compte à débiter"
                    value={modality.compteADebiter}
                    onChange={value => update(modality.id, 'compteADebiter', value)}
                    select
                    required
                    opts={accountOptions}
                  />
                  <FI label="Devise du compte" value={modality.deviseCompte} disabled />
                  <FI label="Montant à débiter" value={modality.montantDebit} disabled />
                </>
              )}

              {financingRequired && (
                <div className="md:col-span-2">
                  <FI
                    label="Identifiant dossier de financement"
                    value={modality.dossierFinancementId}
                    onChange={value => update(modality.id, 'dossierFinancementId', value)}
                    placeholder="FIN-2026-000123"
                    required
                  />
                </div>
              )}
            </div>

            {debitAccountRequired && tndAccount && (
              <div className="border-t border-[#EEF3F7] pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <FI
                    label="Mode de cours"
                    value={modality.fxRateMode}
                    onChange={value => update(modality.id, 'fxRateMode', value as Modality['fxRateMode'])}
                    select
                    opts={[
                      { value: 'NORMAL', label: 'Cours normal' },
                      { value: 'NEGOCIE', label: 'Cours négocié' },
                      { value: 'TERME', label: 'Cours à terme' },
                    ]}
                  />
                  <FI label="Cours indicatif" value={modality.coursIndicatif || order.coursConversion} disabled />
                  <FI
                    label="Cours appliqué"
                    value={modality.coursSaisi}
                    onChange={value => update(modality.id, 'coursSaisi', value)}
                    disabled={!editableRate}
                    required={editableRate}
                    placeholder={editableRate ? '3,34500000' : 'Cours normal automatique'}
                  />
                  <FI
                    label="Référence du cours négocié / contrat"
                    value={modality.refDeal}
                    onChange={value => update(modality.id, 'refDeal', value)}
                    required={modality.fxRateMode === 'NEGOCIE' || modality.fxRateMode === 'TERME'}
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="inline-flex items-center gap-2 text-xs text-[#2D3E54] cursor-pointer">
                <input
                  type="checkbox"
                  checked={modality.blocage}
                  onChange={event => update(modality.id, 'blocage', event.target.checked)}
                  className="w-4 h-4 accent-[#435B7B]"
                />
                Blocage des fonds requis
              </label>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#A8C0D9] text-sm font-semibold text-[#435B7B] hover:border-[#435B7B] hover:bg-[#F4F8FC] transition-all"
      >
        <Plus size={16} />Ajouter une modalité de paiement
      </button>
    </div>
  );
}
