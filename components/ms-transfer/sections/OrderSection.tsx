import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';

import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import { getBankByBic, getCounterValueTnd } from '../transfer.api';
import { getUserMessage } from '../transfer.errors';
import type {
  AccountRow,
  ClientData,
  CountryOption,
  QuotedCurrency,
  TransferOrder,
} from '../transfer.types';
import { FI } from '../transfer.ui';
import { formatAmount, parseAmount } from '../transfer.utils';
import { PartyForm } from './PartyForm';

interface OrderSectionProps {
  order: TransferOrder;
  client: ClientData | null;
  quotedCurrencies: QuotedCurrency[];
  countries: CountryOption[];
  countriesLoading?: boolean;
  clientAccounts: AccountRow[];
  commissionAccount: string;
  onChange: (order: TransferOrder) => void;
}

export function OrderSection({
  order,
  client,
  quotedCurrencies,
  countries,
  countriesLoading = false,
  clientAccounts,
  commissionAccount,
  onChange,
}: OrderSectionProps) {
  const [counterValueLoading, setCounterValueLoading] = useState(false);
  const [counterValueError, setCounterValueError] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState('');

  const update = <K extends keyof TransferOrder>(
    field: K,
    value: TransferOrder[K],
  ) => {
    onChange({ ...order, [field]: value });
  };

  const currencyOptions = quotedCurrencies.map(currency => ({
    value: currency.code,
    label: `${currency.code} — ${currency.label}`,
  }));

  const debtorAccountOptions = clientAccounts.filter(account => (
    account.numero.trim() !== ''
    && account.statut === 'ACTIF'
  ));

  const commissionAccountAvailable = debtorAccountOptions.some(
    account => account.numero === commissionAccount,
  );

  const calculateCounterValue = async () => {
    const amount = parseAmount(order.montantOrdre);

    if (!order.deviseOrdre || amount <= 0) {
      setCounterValueError(
        'Renseignez une devise cotée et un montant d’ordre valide.',
      );
      return;
    }

    setCounterValueLoading(true);
    setCounterValueError('');

    try {
      const result = await getCounterValueTnd(
        order.deviseOrdre,
        amount,
      );

      onChange({
        ...order,
        coursConversion: result.coursConversion.toFixed(8),
        contreValeurTnd: formatAmount(result.contreValeurTnd),
      });
    } catch (reason) {
      setCounterValueError(
        getUserMessage(
          reason,
          'Le cours et la contre-valeur n’ont pas pu être calculés. Réessayez ultérieurement.',
        ),
      );
    } finally {
      setCounterValueLoading(false);
    }
  };

  const searchBank = async () => {
    if (!order.beneficiaryBank.bicfi.trim()) {
      setBankError(
        'Le code BIC est obligatoire pour rechercher la banque bénéficiaire.',
      );
      return;
    }

    setBankLoading(true);
    setBankError('');

    try {
      const bank = await getBankByBic(
        order.beneficiaryBank.bicfi,
      );
      update('beneficiaryBank', bank);
    } catch (reason) {
      setBankError(
        getUserMessage(
          reason,
          'La banque n’a pas pu être recherchée. Réessayez ultérieurement.',
        ),
      );
    } finally {
      setBankLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Données de l’ordre de transfert
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseignez les montants, les intervenants, la banque
          bénéficiaire et les instructions de paiement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Montants et date valeur</CardTitle>
          <CardDescription>
            Seules les devises cotées peuvent être utilisées.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <FI
              label="Cours de conversion indicatif"
              value={order.coursConversion}
              disabled
            />
            <FI
              label="Contre-valeur TND"
              value={order.contreValeurTnd}
              disabled
            />
            <div className="flex items-end md:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={calculateCounterValue}
                disabled={counterValueLoading}
              >
                {counterValueLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Calculer le cours et la contre-valeur
              </Button>
            </div>
          </div>

          {counterValueError && (
            <Alert variant="destructive">
              <AlertDescription>{counterValueError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Résumé de conversion :
            </span>
            <strong>
              {order.montantOrdre || '0'} {order.deviseOrdre}
            </strong>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">
              × {order.coursConversion || '—'}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <strong>{order.contreValeurTnd || '—'} TND</strong>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donneur d’ordre</CardTitle>
          <CardDescription>
            Les informations sont préremplies depuis la fiche client et
            restent modifiables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PartyForm
            title="Informations du donneur d’ordre"
            value={order.debtor}
            onChange={value => update('debtor', value)}
            countryLov
            countryOptions={countries}
            countryLoading={countriesLoading}
            countryRequired
            accountLov
            accountOptions={debtorAccountOptions}
            accountRequired
            identifierReadOnly
          />

          {client && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Les données du client ont été chargées automatiquement.
                Le pays et le compte peuvent être ajustés parmi les valeurs
                disponibles.
                {commissionAccountAvailable && commissionAccount && (
                  <>
                    {' '}Le compte commission est proposé par défaut comme
                    compte du donneur d’ordre.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Donneur d’ordre final</CardTitle>
              <CardDescription>
                Facultatif lorsque le donneur d’ordre final diffère du
                client.
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={order.ultimateDebtorEnabled}
                onChange={event =>
                  update(
                    'ultimateDebtorEnabled',
                    event.target.checked,
                  )
                }
                className="h-4 w-4 accent-primary"
              />
              Renseigner
            </label>
          </div>
        </CardHeader>
        {order.ultimateDebtorEnabled && (
          <CardContent>
            <PartyForm
              title="Informations du donneur d’ordre final"
              value={order.ultimateDebtor}
              onChange={value => update('ultimateDebtor', value)}
              countryLov
              countryOptions={countries}
              countryLoading={countriesLoading}
              countryRequired
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bénéficiaire</CardTitle>
          <CardDescription>
            Les informations principales du bénéficiaire sont
            obligatoires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartyForm
            title="Informations du bénéficiaire"
            value={order.beneficiary}
            onChange={value => update('beneficiary', value)}
            beneficiary
            countryLov
            countryOptions={countries}
            countryLoading={countriesLoading}
            countryRequired
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Bénéficiaire final</CardTitle>
              <CardDescription>
                Facultatif lorsque le bénéficiaire final diffère du
                bénéficiaire du paiement.
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={order.ultimateCreditorEnabled}
                onChange={event =>
                  update(
                    'ultimateCreditorEnabled',
                    event.target.checked,
                  )
                }
                className="h-4 w-4 accent-primary"
              />
              Renseigner
            </label>
          </div>
        </CardHeader>
        {order.ultimateCreditorEnabled && (
          <CardContent>
            <PartyForm
              title="Informations du bénéficiaire final"
              value={order.ultimateCreditor}
              onChange={value => update('ultimateCreditor', value)}
              beneficiary
              countryLov
              countryOptions={countries}
              countryLoading={countriesLoading}
              countryRequired
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banque bénéficiaire</CardTitle>
          <CardDescription>
            Renseignez le code BIC pour récupérer les informations de la
            banque.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FI
              label="Code BIC de la banque"
              value={order.beneficiaryBank.bicfi}
              onChange={value =>
                update('beneficiaryBank', {
                  ...order.beneficiaryBank,
                  bicfi: value.toUpperCase(),
                })
              }
              placeholder="DEUTDEFFXXX"
              required
              error={bankError || undefined}
            />
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                onClick={searchBank}
                disabled={bankLoading}
              >
                {bankLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Rechercher
              </Button>
            </div>
            <div className="md:col-span-2">
              <FI
                label="Nom banque"
                value={order.beneficiaryBank.nom}
                disabled
              />
            </div>
            <FI
              label="Pays banque"
              value={order.beneficiaryBank.pays}
              disabled
            />
            <FI
              label="Ville banque"
              value={order.beneficiaryBank.townName}
              disabled
            />
            <div className="md:col-span-2">
              <FI
                label="Adresse banque"
                value={order.beneficiaryBank.adresse}
                disabled
              />
            </div>
          </div>

          {order.beneficiaryBank.nom && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <Globe2 className="h-4 w-4 text-primary" />
              <span className="font-mono font-medium">
                {order.beneficiaryBank.bicfi}
              </span>
              <span>—</span>
              <strong>{order.beneficiaryBank.nom}</strong>
              <span>—</span>
              <span className="text-muted-foreground">
                {order.beneficiaryBank.townName},{' '}
                {order.beneficiaryBank.pays}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instruction de paiement</CardTitle>
          <CardDescription>
            Motif, frais, catégorie et observations du transfert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FI
              label="Motif de paiement"
              value={order.motifPaiement}
              onChange={value => update('motifPaiement', value)}
              required
              placeholder="Import marchandises, frais de scolarité..."
            />
            <FI
              label="Répartition des frais"
              value={order.chargeBearer}
              onChange={value => update('chargeBearer', value)}
              select
              required
              opts={[
                { value: 'SHAR', label: 'Frais partagés' },
                {
                  value: 'DEBT',
                  label: 'À la charge du donneur d’ordre',
                },
                {
                  value: 'CRED',
                  label: 'À la charge du bénéficiaire',
                },
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
                {
                  value: 'SDVA',
                  label: 'Exécution le jour même',
                },
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
        </CardContent>
      </Card>
    </div>
  );
}
