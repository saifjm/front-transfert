import React from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Send,
} from 'lucide-react';
import type {
  ClientData,
  Modality,
  RegulatoryData,
  RegulatorySupportData,
  TransferOrder,
  TransferType,
} from '../transfer.types';
import { FR, HDR, SecTitle, TypeBadge } from '../transfer.ui';
import {
  calculateCoverage,
  isOrderComplete,
  isSupportComplete,
  requiresDebitAccount,
  requiresFinancingFile,
} from '../transfer.utils';

export function RecapSection({
  transferType,
  client,
  commissionAccount,
  order,
  modalities,
  regulatoryData,
  support,
  onSaveDraft,
  onSubmit,
  submitting,
}: {
  transferType: TransferType | null;
  client: ClientData | null;
  commissionAccount: string;
  order: TransferOrder;
  modalities: Modality[];
  regulatoryData: RegulatoryData;
  support: RegulatorySupportData;
  onSaveDraft: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const coverage = calculateCoverage(modalities, order.montantOrdre);
  const modalitiesComplete = modalities.length > 0
    && coverage.complete
    && modalities.every(modality => !requiresDebitAccount(modality.type) || Boolean(modality.compteADebiter))
    && modalities.every(modality => !requiresFinancingFile(modality.type) || Boolean(modality.dossierFinancementId))
    && modalities.every(modality => modality.fxRateMode === 'NORMAL' || Boolean(modality.coursSaisi));
  const regulatoryComplete = Boolean(regulatoryData.codeNatureOperation)
    && (!regulatoryData.authorizationRequired || Boolean(regulatoryData.selectedAuthorizationId));
  const supportComplete = isSupportComplete(support);

  const checks = [
    { ok: transferType !== null, label: 'Type de transfert sélectionné' },
    { ok: client?.statut === 'ACTIF', label: 'Client vérifié et actif' },
    { ok: Boolean(commissionAccount), label: 'Compte commission sélectionné' },
    { ok: isOrderComplete(order), label: 'Données de l’ordre complètes' },
    { ok: modalitiesComplete, label: 'Modalités complètes et couverture à 100 %' },
    { ok: regulatoryComplete, label: 'Données règlementaires BCT complètes' },
    { ok: supportComplete, label: support.type === 'FI' ? 'Fiche d’information complète' : 'TCE vérifié et appartenant au client' },
  ];
  const ready = checks.every(check => check.ok);

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Récapitulatif avant soumission</h2>
        <p className="text-sm text-[#7A90A4]">Vérifiez toutes les informations avant de transmettre l’ordre au circuit de validation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
          <SecTitle>Type et client donneur d’ordre</SecTitle>
          <div className="space-y-3">
            <FR label="Type de transfert" value={transferType ? <TypeBadge type={transferType} /> : '—'} />
            <FR label="Client" value={client?.nomRaison} />
            <FR label="Référence client" value={client?.idClient} />
            <FR label="Compte commission" value={<span className="font-mono text-xs">{commissionAccount || '—'}</span>} />
          </div>
        </div>

        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #F97316' }}>
          <SecTitle>Ordre de transfert</SecTitle>
          <div className="space-y-3">
            <FR label="Montant ordre" value={`${order.montantOrdre || '—'} ${order.deviseOrdre}`} />
            <FR label="Devise transfert" value={order.deviseTransfert} />
            <FR label="Contre-valeur TND" value={`${order.contreValeurTnd || '—'} TND`} />
            <FR label="Date valeur" value={order.dateValeur} />
            <FR label="Motif" value={order.motifPaiement} />
          </div>
        </div>

        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #7C3AED' }}>
          <SecTitle>Bénéficiaire et banque</SecTitle>
          <div className="space-y-3">
            <FR label="Bénéficiaire" value={order.beneficiary.nomRaison} />
            <FR label="Compte bénéficiaire" value={<span className="font-mono text-xs">{order.beneficiary.compte}</span>} />
            <FR label="Ville / Pays" value={`${order.beneficiary.townName || '—'} — ${order.beneficiary.pays || '—'}`} />
            <FR label="Code BIC / Banque" value={`${order.beneficiaryBank.bicfi || '—'} — ${order.beneficiaryBank.nom || '—'}`} />
          </div>
        </div>

        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #0D9488' }}>
          <SecTitle>Données règlementaires et support</SecTitle>
          <div className="space-y-3">
            <FR label="Code nature opération" value={regulatoryData.codeNatureOperation} />
            <FR label="Autorisation BCT" value={regulatoryData.authorizationRequired ? regulatoryData.selectedAuthorizationId || 'À sélectionner' : 'Non requise'} />
            <FR label="Type support" value={support.type || '—'} />
            {support.type === 'FI' && <FR label="Référence FI" value={support.ficheInformation.numero} mono />}
            {support.type === 'TCE' && <FR label="Référence TCE" value={support.tceResult?.numDomi} mono />}
          </div>
        </div>
      </div>

      {modalities.length > 0 && (
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm overflow-hidden" style={{ borderTop: `3px solid ${coverage.complete ? '#22C55E' : '#F97316'}` }}>
          <div className="px-5 pt-5 pb-2"><SecTitle>Modalités de paiement — couverture {coverage.percentage} %</SecTitle></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F4F8FC' }}>
                  {['#', 'Type', 'Montant', 'Compte / Financement', 'Cours', 'Montant débit', 'Blocage'].map(header => (
                    <th key={header} className="px-4 py-2.5 text-left text-xs font-semibold text-[#435B7B] uppercase whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modalities.map((modality, index) => (
                  <tr key={modality.id} className="border-t border-[#EEF3F7]">
                    <td className="px-4 py-3 text-xs font-bold text-[#6B7A8D]">{index + 1}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#2D3E54]">{modality.type}</td>
                    <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{modality.montant} {modality.deviseOrdre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6B7A8D]">{modality.compteADebiter || modality.dossierFinancementId || '—'}</td>
                    <td className="px-4 py-3 text-xs">{modality.fxRateMode === 'NORMAL' ? modality.coursIndicatif : modality.coursSaisi}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{modality.montantDebit || '—'} {modality.deviseCompte}</td>
                    <td className="px-4 py-3 text-xs">{modality.blocage ? 'Oui' : 'Non'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: ready ? '3px solid #22C55E' : '3px solid #F97316' }}>
          <SecTitle>Contrôles de complétude</SecTitle>
          <div className="divide-y divide-[#EEF3F7]">
            {checks.map(check => (
              <div key={check.label} className="flex items-center gap-2 py-2">
                {check.ok
                  ? <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                  : <Clock size={14} className="text-amber-500 flex-shrink-0" />}
                <span className={`text-xs ${check.ok ? 'text-green-800' : 'text-amber-700'}`}>{check.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #6B7A8D' }}>
          <SecTitle>Suite du traitement</SecTitle>
          <div className="divide-y divide-[#EEF3F7]">
            {[
              'Enregistrement du dossier de transfert',
              'Transmission au circuit de validation',
              'Contrôles règlementaires selon la nature de l’opération',
              'Prise en compte du support règlementaire sélectionné',
              'Exécution du transfert après validation',
            ].map(label => (
              <div key={label} className="flex items-center gap-2 py-2">
                <CheckCircle2 size={13} className="text-[#435B7B] flex-shrink-0" />
                <span className="text-xs text-[#6B7A8D]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onSaveDraft}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#d1dce6] text-sm font-semibold text-[#435B7B] hover:bg-[#F4F8FC] transition-all"
        >
          <Download size={14} />Enregistrer brouillon
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !ready}
          className="flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg sm:ml-auto"
          style={HDR}
        >
          {submitting ? <><Loader2 size={14} className="animate-spin" />Transmission en cours…</> : <><Send size={14} />Transmettre pour validation</>}
        </button>
      </div>
    </div>
  );
}
