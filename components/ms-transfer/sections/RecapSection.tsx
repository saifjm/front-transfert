import React from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Info,
  Loader2,
  Send,
} from 'lucide-react';

import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import type {
  ClientData,
  Modality,
  RegulatoryData,
  RegulatorySupportData,
  TransferOrder,
  TransferType,
} from '../transfer.types';
import { FR, TypeBadge } from '../transfer.ui';
import {
  calculateCoverage,
} from '../transfer.utils';
import {
  isCbprOrderComplete,
} from '../transfer.cbpr-order';
import {
  formatTceAllocationTotals,
  isRegulatorySupportComplete,
} from '../transfer.tce';
import {
  arePaymentModalitiesComplete,
} from '../transfer.payment-modality';
import {
  assessRegulatoryNature,
  getCommercialValuationBasisLabel,
  isRegulatoryDataComplete,
} from '../transfer.regulatory';

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#435B7B]">
      {children}
    </h3>
  );
}

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
  const modalitiesComplete = arePaymentModalitiesComplete(
    modalities,
    order.montantOrdre,
  );
  const regulatoryComplete = isRegulatoryDataComplete(
    regulatoryData,
  );
  const regulatoryNature = assessRegulatoryNature(
    transferType,
    order,
    regulatoryData,
  );
  const supportComplete = isRegulatorySupportComplete(support, order);

  const checks = [
    {
      ok: transferType !== null,
      label: 'Type de transfert sélectionné',
    },
    {
      ok: client?.statut === 'ACTIF',
      label: 'Client vérifié et actif',
    },
    {
      ok: Boolean(commissionAccount),
      label: 'Compte commission sélectionné',
    },
    {
      ok: isCbprOrderComplete(order),
      label: 'Données de l’ordre complètes',
    },
    {
      ok: modalitiesComplete,
      label: 'Modalités complètes et couverture à 100 %',
    },
    {
      ok: regulatoryComplete,
      label: 'Autorisation BCT complète si requise',
    },
    {
      ok: supportComplete,
      label: support.type === 'FI'
        ? 'Fiche d’information complète'
        : 'Titres TCE rattachés et allocations valides',
    },
  ];

  // codeNatureOperationBct is intentionally absent from this readiness gate.
  const ready = checks.every(check => check.ok);

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="mb-1 text-lg font-bold text-[#2D3E54]">
          Récapitulatif avant soumission
        </h2>
        <p className="text-sm text-[#7A90A4]">
          Vérifiez toutes les informations avant de transmettre l’ordre
          au circuit de validation.
        </p>
      </div>

      {regulatoryNature.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {regulatoryNature.warnings[0]} Cette information n’empêche
            pas la transmission du dossier.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className="rounded-2xl border border-[#d1dce6] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #435B7B' }}
        >
          <SectionTitle>Type et client donneur d’ordre</SectionTitle>
          <div className="space-y-3">
            <FR
              label="Type de transfert"
              value={
                transferType
                  ? <TypeBadge type={transferType} />
                  : '—'
              }
            />
            <FR label="Client" value={client?.nomRaison} />
            <FR label="Référence client" value={client?.idClient} />
            <FR
              label="Compte commission"
              value={(
                <span className="font-mono text-xs">
                  {commissionAccount || '—'}
                </span>
              )}
            />
          </div>
        </div>

        <div
          className="rounded-2xl border border-[#d1dce6] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #F97316' }}
        >
          <SectionTitle>Ordre de transfert</SectionTitle>
          <div className="space-y-3">
            <FR
              label="Montant ordre"
              value={`${order.montantOrdre || '—'} ${order.deviseOrdre}`}
            />
            <FR
              label="Devise transfert"
              value={order.deviseTransfert}
            />
            <FR
              label="Contre-valeur TND"
              value={`${order.contreValeurTnd || '—'} TND`}
            />
            <FR label="Date valeur" value={order.dateValeur} />
            <FR label="Motif" value={order.motifPaiement} />
          </div>
        </div>

        <div
          className="rounded-2xl border border-[#d1dce6] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #7C3AED' }}
        >
          <SectionTitle>Bénéficiaire et banque</SectionTitle>
          <div className="space-y-3">
            <FR
              label="Bénéficiaire"
              value={order.beneficiary.name}
            />
            <FR
              label="Compte bénéficiaire"
              value={(
                <span className="font-mono text-xs">
                  {order.beneficiary.account}
                </span>
              )}
            />
            <FR
              label="Ville / Pays"
              value={`${order.beneficiary.postalAddress.townName || '—'} — ${order.beneficiary.countryOfResidence || order.beneficiary.postalAddress.country || '—'}`}
            />
            <FR
              label="Code BIC / Banque"
              value={`${order.beneficiaryBank.bicfi || '—'} — ${order.beneficiaryBank.nom || '—'}`}
            />
          </div>
        </div>

        <div
          className="rounded-2xl border border-[#d1dce6] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #0D9488' }}
        >
          <SectionTitle>Données règlementaires et support</SectionTitle>
          <div className="space-y-3">
            <FR
              label="Code nature opération BCT"
              value={
                regulatoryData.codeNatureOperationBct
                || 'Non déterminé à ce stade'
              }
            />
            {transferType === 'commercial' && (
              <FR
                label="Base de valorisation commerciale"
                value={getCommercialValuationBasisLabel(
                  order.commercialValuationBasis,
                )}
              />
            )}
            <FR
              label="Autorisation BCT"
              value={
                regulatoryData.authorizationRequired
                  ? regulatoryData.selectedAuthorizationId
                    || 'À sélectionner'
                  : 'Non requise'
              }
            />
            <FR label="Type support" value={support.type || '—'} />
            {support.type === 'FI' && (
              <FR
                label="Référence FI"
                value={support.ficheInformation.numero}
                mono
              />
            )}
            {support.type === 'TCE' && (
              <>
                <FR
                  label="Nombre de TCE"
                  value={String(support.tceAllocations.length)}
                />
                <FR
                  label="Montants affectés"
                  value={
                    support.tceAllocations.length
                      ? formatTceAllocationTotals(
                          support.tceAllocations,
                        )
                      : '—'
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>

      {support.type === 'TCE'
        && support.tceAllocations.length > 0
        && (
          <div className="overflow-hidden rounded-2xl border border-[#d1dce6] bg-white shadow-sm">
            <div className="px-5 pb-2 pt-5">
              <SectionTitle>
                Titres de commerce extérieur rattachés
              </SectionTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F8FC]">
                    {[
                      '#',
                      'Code titre',
                      'N° domiciliation',
                      'Date',
                      'Devise',
                      'Disponible contrôle',
                      'Montant affecté',
                      'Réservation',
                    ].map(header => (
                      <th
                        key={header}
                        className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-[#435B7B]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {support.tceAllocations.map((allocation, index) => (
                    <tr
                      key={allocation.id}
                      className="border-t border-[#EEF3F7]"
                    >
                      <td className="px-4 py-3 text-xs font-bold">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {allocation.codeTitre}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {allocation.numDomi}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {allocation.dateDomi}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {allocation.devise}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {allocation.montantDisponibleControle || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {allocation.montantAffecte || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {allocation.reservationStatus === 'RESERVED'
                          ? allocation.reservationReference || 'Réservé'
                          : 'Non exécutée'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {modalities.length > 0 && (
        <div
          className="overflow-hidden rounded-2xl border border-[#d1dce6] bg-white shadow-sm"
          style={{
            borderTop: `3px solid ${coverage.complete ? '#22C55E' : '#F97316'}`,
          }}
        >
          <div className="px-5 pb-2 pt-5">
            <SectionTitle>
              Modalités de paiement — couverture {coverage.percentage} %
            </SectionTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F4F8FC' }}>
                  {[
                    '#',
                    'Type',
                    'Montant',
                    'Date valeur',
                    'Compte / Financement',
                    'Cours',
                    'Montant débit',
                    'Blocage',
                  ].map(header => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-[#435B7B]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modalities.map((modality, index) => (
                  <tr
                    key={modality.id}
                    className="border-t border-[#EEF3F7]"
                  >
                    <td className="px-4 py-3 text-xs font-bold text-[#6B7A8D]">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#2D3E54]">
                      {modality.type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold">
                      {modality.montant} {modality.deviseOrdre}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {modality.dateValeur || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6B7A8D]">
                      {modality.compteADebiter
                        || modality.dossierFinancementId
                        || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {modality.fxRateMode === 'NORMAL'
                        ? modality.coursIndicatif
                        : modality.coursSaisi}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {modality.montantDebit || '—'} {modality.deviseCompte}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {modality.blocage ? 'Oui' : 'Non'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className="rounded-2xl border border-[#d1dce6] bg-white p-5 shadow-sm"
          style={{
            borderTop: ready
              ? '3px solid #22C55E'
              : '3px solid #F97316',
          }}
        >
          <SectionTitle>Contrôles de complétude</SectionTitle>
          <div className="divide-y divide-[#EEF3F7]">
            {checks.map(check => (
              <div
                key={check.label}
                className="flex items-center gap-2 py-2"
              >
                {check.ok ? (
                  <CheckCircle2
                    size={14}
                    className="flex-shrink-0 text-green-600"
                  />
                ) : (
                  <Clock
                    size={14}
                    className="flex-shrink-0 text-amber-500"
                  />
                )}
                <span
                  className={`text-xs ${
                    check.ok
                      ? 'text-green-800'
                      : 'text-amber-700'
                  }`}
                >
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl border border-[#d1dce6] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #6B7A8D' }}
        >
          <SectionTitle>Suite du traitement</SectionTitle>
          <div className="divide-y divide-[#EEF3F7]">
            {[
              'Enregistrement du dossier de transfert',
              'Transmission au circuit de validation',
              'Contrôles règlementaires selon la nature de l’opération',
              'Prise en compte du support règlementaire sélectionné',
              'Exécution du transfert après validation',
            ].map(label => (
              <div
                key={label}
                className="flex items-center gap-2 py-2"
              >
                <CheckCircle2
                  size={13}
                  className="flex-shrink-0 text-[#435B7B]"
                />
                <span className="text-xs text-[#6B7A8D]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 pt-1 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
        >
          <Download className="mr-2 h-4 w-4" />
          Enregistrer brouillon
        </Button>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !ready}
          className="sm:ml-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Transmission en cours…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Transmettre pour validation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
