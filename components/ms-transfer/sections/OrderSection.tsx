import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { getBankByBic, getCounterValueTnd } from '../transfer.api';
import { getUserMessage } from '../transfer.errors';
import type { ClientData, QuotedCurrency, TransferOrder } from '../transfer.types';
import { FI, FR, HDR, SecTitle } from '../transfer.ui';
import { formatAmount, parseAmount } from '../transfer.utils';
import { PartyForm } from './PartyForm';

export function OrderSection({
  order,
  client,
  quotedCurrencies,
  onChange,
}: {
  order: TransferOrder;
  client: ClientData | null;
  quotedCurrencies: QuotedCurrency[];
  onChange: (order: TransferOrder) => void;
}) {
  const [counterValueLoading, setCounterValueLoading] = useState(false);
  const [counterValueError, setCounterValueError] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState('');

  const update = <K extends keyof TransferOrder>(field: K, value: TransferOrder[K]) => {
    onChange({ ...order, [field]: value });
  };

  const currencyOptions = quotedCurrencies.map(currency => ({
    value: currency.code,
    label: `${currency.code} — ${currency.label}`,
  }));

  const calculateCounterValue = async () => {
    const amount = parseAmount(order.montantOrdre);
    if (!order.deviseOrdre || amount <= 0) {
      setCounterValueError('Renseignez une devise cotée et un montant d’ordre valide.');
      return;
    }

    setCounterValueLoading(true);
    setCounterValueError('');
    try {
      const result = await getCounterValueTnd(order.deviseOrdre, amount);
      onChange({
        ...order,
        coursConversion: result.coursConversion.toFixed(8),
        contreValeurTnd: formatAmount(result.contreValeurTnd),
      });
    } catch (reason) {
      setCounterValueError(getUserMessage(reason, 'Le cours et la contre-valeur n’ont pas pu être calculés. Réessayez ultérieurement.'));
    } finally {
      setCounterValueLoading(false);
    }
  };

  const searchBank = async () => {
    if (!order.beneficiaryBank.bicfi.trim()) {
      setBankError('Le code BIC est obligatoire pour rechercher la banque bénéficiaire.');
      return;
    }

    setBankLoading(true);
    setBankError('');
    try {
      const bank = await getBankByBic(order.beneficiaryBank.bicfi);
      update('beneficiaryBank', bank);
    } catch (reason) {
      setBankError(getUserMessage(reason, 'La banque n’a pas pu être recherchée. Réessayez ultérieurement.'));
    } finally {
      setBankLoading(false);
    }
  };

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Données de l’ordre de transfert</h2>
        <p className="text-sm text-[#7A90A4]">
          Saisissez les montants, les informations des intervenants, la banque bénéficiaire, le motif du paiement, la répartition des frais et les observations.
        </p>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
        <SecTitle>Montants et date valeur</SecTitle>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
          <FI
            label="Devise ordre"
            value={order.deviseOrdre}
            onChange={value => update('deviseOrdre', value)}
            select
            required
            opts={currencyOptions}
          />
          <FI
            label="Montant ordre"
            value={order.montantOrdre}
            onChange={value => update('montantOrdre', value)}
            required
            placeholder="20 000,000"
          />
          <FI
            label="Devise transfert"
            value={order.deviseTransfert}
            onChange={value => update('deviseTransfert', value)}
            select
            required
            opts={currencyOptions}
          />
          <FI
            label="Date valeur"
            value={order.dateValeur}
            onChange={value => update('dateValeur', value)}
            type="date"
            required
          />

          <FI label="Cours de conversion indicatif" value={order.coursConversion} disabled />
          <FI label="Contre-valeur TND" value={order.contreValeurTnd} disabled />
          <div className="md:col-span-2 flex items-end">
            <button
              type="button"
              onClick={calculateCounterValue}
              disabled={counterValueLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#d1dce6] text-[#435B7B] hover:bg-[#F4F8FC] disabled:opacity-60"
            >
              {counterValueLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Calculer le cours et la contre-valeur
            </button>
          </div>
        </div>

        {counterValueError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-3">
            <XCircle size={14} />{counterValueError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-xl text-xs" style={{ background: '#F4F8FC' }}>
          <span className="text-[#7A90A4]">Résumé de conversion :</span>
          <span className="font-bold text-[#2D3E54]">{order.montantOrdre || '0'} {order.deviseOrdre}</span>
          <ChevronRight size={12} className="text-[#A8C0D9]" />
          <span className="font-mono font-bold text-[#435B7B]">× {order.coursConversion || '—'}</span>
          <ChevronRight size={12} className="text-[#A8C0D9]" />
          <span className="font-bold text-[#2D3E54]">{order.contreValeurTnd || '—'} TND</span>
        </div>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
        <PartyForm
          title="Donneur d’ordre — données client modifiables"
          value={order.debtor}
          onChange={value => update('debtor', value)}
        />
        {client && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800">
            <CheckCircle2 size={14} />Les données ont été préremplies à partir de la fiche client et restent modifiables.
          </div>
        )}
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #6B8CAE' }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xs font-bold text-[#435B7B] uppercase tracking-wide">Donneur d’ordre final</h3>
            <p className="text-xs text-[#7A90A4] mt-1">Facultatif — à renseigner lorsque le donneur d’ordre final diffère du client.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#435B7B] cursor-pointer">
            <input
              type="checkbox"
              checked={order.ultimateDebtorEnabled}
              onChange={event => update('ultimateDebtorEnabled', event.target.checked)}
              className="w-4 h-4 accent-[#435B7B]"
            />
            Renseigner
          </label>
        </div>
        {order.ultimateDebtorEnabled && (
          <PartyForm
            title="Informations du donneur d’ordre final"
            value={order.ultimateDebtor}
            onChange={value => update('ultimateDebtor', value)}
          />
        )}
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #7C3AED' }}>
        <PartyForm
          title="Bénéficiaire"
          value={order.beneficiary}
          onChange={value => update('beneficiary', value)}
          beneficiary
        />
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #8B5CF6' }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xs font-bold text-[#435B7B] uppercase tracking-wide">Bénéficiaire final</h3>
            <p className="text-xs text-[#7A90A4] mt-1">Facultatif — bénéficiaire final différent du bénéficiaire du paiement.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#435B7B] cursor-pointer">
            <input
              type="checkbox"
              checked={order.ultimateCreditorEnabled}
              onChange={event => update('ultimateCreditorEnabled', event.target.checked)}
              className="w-4 h-4 accent-[#435B7B]"
            />
            Renseigner
          </label>
        </div>
        {order.ultimateCreditorEnabled && (
          <PartyForm
            title="Informations du bénéficiaire final"
            value={order.ultimateCreditor}
            onChange={value => update('ultimateCreditor', value)}
            beneficiary
          />
        )}
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #0D9488' }}>
        <SecTitle>Banque bénéficiaire</SecTitle>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <FI
            label="Code BIC de la banque"
            value={order.beneficiaryBank.bicfi}
            onChange={value => update('beneficiaryBank', { ...order.beneficiaryBank, bicfi: value.toUpperCase() })}
            placeholder="DEUTDEFFXXX"
            required
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={searchBank}
              disabled={bankLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={HDR}
            >
              {bankLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Rechercher la banque
            </button>
          </div>
          <div className="md:col-span-2">
            <FI label="Nom banque" value={order.beneficiaryBank.nom} disabled />
          </div>
          <FI label="Pays banque" value={order.beneficiaryBank.pays} disabled />
          <FI label="Ville banque" value={order.beneficiaryBank.townName} disabled />
          <div className="md:col-span-2"><FI label="Adresse banque" value={order.beneficiaryBank.adresse} disabled /></div>
        </div>

        {bankError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-3">
            <XCircle size={14} />{bankError}
          </div>
        )}

        {order.beneficiaryBank.nom && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border border-[#d1dce6] text-xs" style={{ background: '#F4F8FC' }}>
            <Globe2 size={14} className="text-[#435B7B]" />
            <span className="font-mono font-bold text-[#2D3E54]">{order.beneficiaryBank.bicfi}</span>
            <span className="text-[#A8C0D9]">—</span>
            <span className="font-bold text-[#435B7B]">{order.beneficiaryBank.nom}</span>
            <span className="text-[#A8C0D9]">—</span>
            <span className="text-[#6B7A8D]">{order.beneficiaryBank.townName}, {order.beneficiaryBank.pays}</span>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #F97316' }}>
        <SecTitle>Instruction de paiement</SecTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FI
            label="Motif de paiement"
            value={order.motifPaiement}
            onChange={value => update('motifPaiement', value)}
            required
            placeholder="Import marchandises, frais de scolarité…"
          />
          <FI
            label="Répartition des frais"
            value={order.chargeBearer}
            onChange={value => update('chargeBearer', value)}
            select
            required
            opts={[
              { value: 'SHAR', label: 'Frais partagés' },
              { value: 'DEBT', label: 'À la charge du donneur d’ordre' },
              { value: 'CRED', label: 'À la charge du bénéficiaire' },
            ]}
          />
          <FI
            label="Catégorie du paiement"
            value={order.purposeCode}
            onChange={value => update('purposeCode', value)}
            select
            opts={[
              { value: 'GDDS', label: 'Biens' },
              { value: 'SVCS', label: 'Services' },
              { value: 'FEES', label: 'Honoraires' },
              { value: 'SALA', label: 'Salaire' },
              { value: 'DIVD', label: 'Dividendes' },
            ]}
          />
          <FI
            label="Délai d’exécution"
            value={order.serviceLevel}
            onChange={value => update('serviceLevel', value)}
            select
            opts={[
              { value: 'NURG', label: 'Standard' },
              { value: 'SDVA', label: 'Exécution le jour même' },
              { value: 'SEPA', label: 'Paiement SEPA' },
            ]}
          />
          <FI
            label="Référence facture / justificatif"
            value={order.refFacture}
            onChange={value => update('refFacture', value)}
          />
          <div className="md:col-span-3">
            <FI
              label="Observations"
              value={order.observations}
              onChange={value => update('observations', value)}
              multiline
              rows={4}
              placeholder="Observations de l’agence ou informations complémentaires destinées aux services centraux."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
