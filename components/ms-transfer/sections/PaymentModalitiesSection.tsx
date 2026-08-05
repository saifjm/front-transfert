import React from 'react';
import { CheckCircle2, CircleAlert, Plus, Trash2 } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import { MODALITY_TYPE_OPTIONS } from '../transfer.mock';
import type {
  AccountRow,
  Modality,
  ModalityType,
  TransferOrder,
} from '../transfer.types';
import { FI } from '../transfer.ui';
import {
  calculateCoverage,
  formatAmount,
  parseAmount,
  requiresDebitAccount,
  requiresFinancingFile,
} from '../transfer.utils';

function newModality(
  order: TransferOrder,
  accounts: AccountRow[],
): Modality {
  const defaultAccount =
    accounts.find(account => account.devise === 'TND') ?? accounts[0];
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

  const add = () =>
    onChange([...modalities, newModality(order, accounts)]);

  const remove = (id: string) =>
    onChange(modalities.filter(modality => modality.id !== id));

  const update = <K extends keyof Modality>(
    id: string,
    field: K,
    value: Modality[K],
  ) => {
    onChange(
      modalities.map(modality => {
        if (modality.id !== id) return modality;

        const updated = { ...modality, [field]: value };

        if (field === 'compteADebiter') {
          const selectedAccount = accounts.find(
            account => account.numero === value,
          );
          updated.deviseCompte = selectedAccount?.devise ?? '';

          if (selectedAccount?.devise !== 'TND') {
            updated.fxRateMode = 'NORMAL';
            updated.coursSaisi = '';
          }
        }

        if (
          field === 'montant' ||
          field === 'coursSaisi' ||
          field === 'fxRateMode'
        ) {
          const amount = parseAmount(
            field === 'montant' ? String(value) : updated.montant,
          );
          const appliedRate =
            updated.fxRateMode === 'NORMAL'
              ? parseAmount(updated.coursIndicatif)
              : parseAmount(
                  field === 'coursSaisi'
                    ? String(value)
                    : updated.coursSaisi,
                );

          updated.montantDebit =
            appliedRate > 0
              ? formatAmount(amount * appliedRate)
              : '';
        }

        return updated;
      }),
    );
  };

  const accountOptions = [
    { value: '', label: 'Sélectionner un compte' },
    ...accounts.map(account => ({
      value: account.numero,
      label: `${account.numero} — ${account.devise} — ${account.solde}`,
    })),
  ];

  const controls = [
    {
      ok: coverage.complete,
      label: 'Couverture 100 %',
    },
    {
      ok: modalities.length > 0,
      label: 'Modalité définie',
    },
    {
      ok: modalities.every(
        modality =>
          !requiresDebitAccount(modality.type) ||
          Boolean(modality.compteADebiter),
      ),
      label: 'Compte renseigné si requis',
    },
    {
      ok: modalities.every(
        modality =>
          !requiresFinancingFile(modality.type) ||
          Boolean(modality.dossierFinancementId),
      ),
      label: 'Dossier financement renseigné',
    },
    {
      ok: modalities.every(
        modality =>
          modality.fxRateMode === 'NORMAL' ||
          Boolean(modality.coursSaisi),
      ),
      label: 'Cours négocié ou à terme renseigné',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Modalités de paiement
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La somme des modalités doit couvrir 100 % du montant de
          l’ordre.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Couverture du transfert</CardTitle>
          <CardDescription>
            {formatAmount(coverage.covered)} {order.deviseOrdre} sur{' '}
            {formatAmount(coverage.total)} {order.deviseOrdre}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Taux de couverture
              </span>
              <strong>{coverage.percentage} %</strong>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  coverage.complete
                    ? 'bg-green-600'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${coverage.percentage}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {controls.map(control => (
              <Badge
                key={control.label}
                variant="outline"
                className={
                  control.ok
                    ? 'gap-1 bg-green-50 text-green-700 border-green-200'
                    : 'gap-1 bg-amber-50 text-amber-700 border-amber-200'
                }
              >
                {control.ok ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleAlert className="h-3 w-3" />
                )}
                {control.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {modalities.map((modality, index) => {
        const debitAccountRequired = requiresDebitAccount(
          modality.type,
        );
        const financingRequired = requiresFinancingFile(
          modality.type,
        );
        const tndAccount = modality.deviseCompte === 'TND';
        const editableRate =
          tndAccount && modality.fxRateMode !== 'NORMAL';

        return (
          <Card key={modality.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Modalité {index + 1}</CardTitle>
                  <CardDescription>
                    Montant exprimé dans la devise de l’ordre
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(modality.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                  Supprimer
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FI
                  label="Type de modalité"
                  value={modality.type}
                  onChange={value =>
                    update(
                      modality.id,
                      'type',
                      value as ModalityType,
                    )
                  }
                  select
                  required
                  opts={MODALITY_TYPE_OPTIONS.map(option => ({
                    ...option,
                  }))}
                />
                <FI
                  label={`Montant modalité (${order.deviseOrdre})`}
                  value={modality.montant}
                  onChange={value =>
                    update(modality.id, 'montant', value)
                  }
                  required
                />
                <FI
                  label="Devise de l’ordre"
                  value={order.deviseOrdre}
                  disabled
                />

                {debitAccountRequired && (
                  <>
                    <FI
                      label="Compte à débiter"
                      value={modality.compteADebiter}
                      onChange={value =>
                        update(
                          modality.id,
                          'compteADebiter',
                          value,
                        )
                      }
                      select
                      required
                      opts={accountOptions}
                    />
                    <FI
                      label="Devise du compte"
                      value={modality.deviseCompte}
                      disabled
                    />
                    <FI
                      label="Montant à débiter"
                      value={modality.montantDebit}
                      disabled
                    />
                  </>
                )}

                {financingRequired && (
                  <div className="md:col-span-2">
                    <FI
                      label="Identifiant dossier de financement"
                      value={modality.dossierFinancementId}
                      onChange={value =>
                        update(
                          modality.id,
                          'dossierFinancementId',
                          value,
                        )
                      }
                      placeholder="FIN-2026-000123"
                      required
                    />
                  </div>
                )}
              </div>

              {debitAccountRequired && tndAccount && (
                <div className="grid grid-cols-1 gap-4 border-t pt-5 md:grid-cols-4">
                  <FI
                    label="Mode de cours"
                    value={modality.fxRateMode}
                    onChange={value =>
                      update(
                        modality.id,
                        'fxRateMode',
                        value as Modality['fxRateMode'],
                      )
                    }
                    select
                    opts={[
                      { value: 'NORMAL', label: 'Cours normal' },
                      { value: 'NEGOCIE', label: 'Cours négocié' },
                      { value: 'TERME', label: 'Cours à terme' },
                    ]}
                  />
                  <FI
                    label="Cours indicatif"
                    value={
                      modality.coursIndicatif || order.coursConversion
                    }
                    disabled
                  />
                  <FI
                    label="Cours appliqué"
                    value={modality.coursSaisi}
                    onChange={value =>
                      update(modality.id, 'coursSaisi', value)
                    }
                    disabled={!editableRate}
                    required={editableRate}
                    placeholder={
                      editableRate
                        ? '3,34500000'
                        : 'Cours normal automatique'
                    }
                  />
                  <FI
                    label="Référence du cours négocié / contrat"
                    value={modality.refDeal}
                    onChange={value =>
                      update(modality.id, 'refDeal', value)
                    }
                    required={
                      modality.fxRateMode === 'NEGOCIE' ||
                      modality.fxRateMode === 'TERME'
                    }
                  />
                </div>
              )}

              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={modality.blocage}
                  onChange={event =>
                    update(
                      modality.id,
                      'blocage',
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-primary"
                />
                Blocage des fonds requis
              </label>
            </CardContent>
          </Card>
        );
      })}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={add}
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter une modalité de paiement
      </Button>
    </div>
  );
}
