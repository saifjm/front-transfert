import React from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Send,
} from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

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

  const modalitiesComplete =
    modalities.length > 0 &&
    coverage.complete &&
    modalities.every(
      modality =>
        !requiresDebitAccount(modality.type) ||
        Boolean(modality.compteADebiter),
    ) &&
    modalities.every(
      modality =>
        !requiresFinancingFile(modality.type) ||
        Boolean(modality.dossierFinancementId),
    ) &&
    modalities.every(
      modality =>
        modality.fxRateMode === 'NORMAL' ||
        Boolean(modality.coursSaisi),
    );

  const regulatoryComplete =
    Boolean(regulatoryData.codeNatureOperation) &&
    (!regulatoryData.authorizationRequired ||
      Boolean(regulatoryData.selectedAuthorizationId));

  const supportComplete = isSupportComplete(support);

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
      ok: isOrderComplete(order),
      label: 'Données de l’ordre complètes',
    },
    {
      ok: modalitiesComplete,
      label: 'Modalités complètes et couverture à 100 %',
    },
    {
      ok: regulatoryComplete,
      label: 'Données règlementaires BCT complètes',
    },
    {
      ok: supportComplete,
      label:
        support.type === 'FI'
          ? 'Fiche d’information complète'
          : 'TCE vérifié et appartenant au client',
    },
  ];

  const ready = checks.every(check => check.ok);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Récapitulatif avant soumission
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vérifiez les informations avant de transmettre le dossier au
          circuit de validation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Type et client donneur d’ordre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FR
              label="Type de transfert"
              value={
                transferType ? (
                  <TypeBadge type={transferType} />
                ) : (
                  '—'
                )
              }
            />
            <FR label="Client" value={client?.nomRaison} />
            <FR label="Référence client" value={client?.idClient} />
            <FR
              label="Compte commission"
              value={
                <span className="font-mono text-xs">
                  {commissionAccount || '—'}
                </span>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ordre de transfert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bénéficiaire et banque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FR
              label="Bénéficiaire"
              value={order.beneficiary.nomRaison}
            />
            <FR
              label="Compte bénéficiaire"
              value={
                <span className="font-mono text-xs">
                  {order.beneficiary.compte}
                </span>
              }
            />
            <FR
              label="Ville / Pays"
              value={`${order.beneficiary.townName || '—'} — ${order.beneficiary.pays || '—'}`}
            />
            <FR
              label="Code BIC / Banque"
              value={`${order.beneficiaryBank.bicfi || '—'} — ${order.beneficiaryBank.nom || '—'}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Données règlementaires et support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FR
              label="Code nature opération"
              value={regulatoryData.codeNatureOperation}
            />
            <FR
              label="Autorisation BCT"
              value={
                regulatoryData.authorizationRequired
                  ? regulatoryData.selectedAuthorizationId ||
                    'À sélectionner'
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
              <FR
                label="Référence TCE"
                value={support.tceResult?.numDomi}
                mono
              />
            )}
          </CardContent>
        </Card>
      </div>

      {modalities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modalités de paiement</CardTitle>
            <CardDescription>
              Couverture du transfert : {coverage.percentage} %
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/50">
                  <tr>
                    {[
                      '#',
                      'Type',
                      'Montant',
                      'Compte / Financement',
                      'Cours',
                      'Montant débit',
                      'Blocage',
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
                  {modalities.map((modality, index) => (
                    <tr key={modality.id} className="border-b">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">
                        {modality.type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {modality.montant} {modality.deviseOrdre}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {modality.compteADebiter ||
                          modality.dossierFinancementId ||
                          '—'}
                      </td>
                      <td className="px-4 py-3">
                        {modality.fxRateMode === 'NORMAL'
                          ? modality.coursIndicatif
                          : modality.coursSaisi}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {modality.montantDebit || '—'}{' '}
                        {modality.deviseCompte}
                      </td>
                      <td className="px-4 py-3">
                        {modality.blocage ? 'Oui' : 'Non'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contrôles de complétude</CardTitle>
            <CardDescription>
              Vérification des informations nécessaires à la soumission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {checks.map(check => (
              <div
                key={check.label}
                className="flex items-center gap-2 border-b py-2 last:border-0"
              >
                {check.ok ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 flex-shrink-0 text-amber-500" />
                )}
                <span className="text-sm">{check.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suite du traitement</CardTitle>
            <CardDescription>
              Étapes prévues après la transmission du dossier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              'Enregistrement du dossier de transfert',
              'Transmission au circuit de validation',
              'Contrôles règlementaires selon la nature de l’opération',
              'Prise en compte du support règlementaire sélectionné',
              'Exécution du transfert après validation',
            ].map(label => (
              <div
                key={label}
                className="flex items-center gap-2 border-b py-2 last:border-0"
              >
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                ready
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }
            >
              {ready ? 'Dossier prêt' : 'Dossier incomplet'}
            </Badge>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
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
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Transmettre pour validation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
