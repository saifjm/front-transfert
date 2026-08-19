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
import {
  clientToParty,
  formatAmount,
  parseAmount,
} from '../transfer.utils';
import {
  getPrefilledPartyLockedFields,
} from '../transfer.party-locks';
import { BeneficiarySection } from './BeneficiarySection';
import { PartyForm } from './PartyForm';

interface OrderSectionProps {
  order: TransferOrder;
  client: ClientData | null;
  quotedCurrencies: QuotedCurrency[];
  countries: CountryOption[];
  countriesLoading?: boolean;
  clientAccounts: AccountRow[];
  onChange: (order: TransferOrder) => void;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function clearIndicativeConversion(
  order: TransferOrder,
): TransferOrder {
  return {
    ...order,
    coursConversion: '',
    contreValeurTnd: '',
  };
}

function blankBankWithBic(
  bicfi: string,
): TransferOrder['beneficiaryBank'] {
  return {
    bicfi,
    nom: '',
    codePays: '',
    pays: '',
    townName: '',
    adresse: '',
  };
}

export function OrderSection({
  order,
  client,
  quotedCurrencies,
  countries,
  countriesLoading = false,
  clientAccounts,
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
    onChange({
      ...order,
      [field]: value,
    });
  };

  const updateConversionSource = (
    field: 'montantOrdre' | 'deviseOrdre',
    value: string,
  ) => {
    setCounterValueError('');

    onChange({
      ...clearIndicativeConversion(order),
      [field]: value,
    });
  };

  const currencyOptions = [
    {
      value: '',
      label: 'Sélectionner une devise',
    },
    ...quotedCurrencies.map(currency => ({
      value: currency.code,
      label: `${currency.code} — ${currency.label}`,
    })),
  ];

  const debtorAccountOptions = clientAccounts.filter(account => (
    normalizeText(account.numero) !== ''
    && account.statut === 'ACTIF'
  ));

  const calculateCounterValue = async () => {
    const currency = normalizeText(order.deviseOrdre).toUpperCase();
    const amount = parseAmount(order.montantOrdre);

    if (!currency || amount <= 0) {
      setCounterValueError(
        'Renseignez une devise cotée et un montant d’ordre valide.',
      );
      return;
    }

    setCounterValueLoading(true);
    setCounterValueError('');

    try {
      const result = await getCounterValueTnd(
        currency,
        amount,
      );

      onChange({
        ...order,
        deviseOrdre: currency,
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

  const updateBankBic = (rawBic: string) => {
    const bicfi = rawBic
      .replace(/\s/g, '')
      .toUpperCase();

    setBankError('');

    update(
      'beneficiaryBank',
      blankBankWithBic(bicfi),
    );
  };

  const debtorCustomerFileSource = client
    ? {
        ...clientToParty(client),
        // The debit account is an operation choice, not customer-file data
        // imported into the order.
        compte: '',
      }
    : null;

  const debtorLockedFields = getPrefilledPartyLockedFields(
    debtorCustomerFileSource,
    ['nomRaison'],
  );

  const searchBank = async () => {
    const bicfi = normalizeText(
      order.beneficiaryBank.bicfi,
    ).toUpperCase();

    if (!bicfi) {
      setBankError(
        'Le code BIC est obligatoire pour rechercher la banque bénéficiaire.',
      );
      return;
    }

    setBankLoading(true);
    setBankError('');

    try {
      const bank = await getBankByBic(bicfi);

      onChange({
        ...order,
        beneficiaryBank: {
          ...bank,
          bicfi,
        },
      });
    } catch (reason) {
      onChange({
        ...order,
        beneficiaryBank: blankBankWithBic(bicfi),
      });

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
      
      </div>

     

      <Card>
        <CardHeader>
          <CardTitle>Montants et date valeur</CardTitle>
          <CardDescription>
            Renseignez explicitement les caractéristiques financières de
            l’ordre. Le cours indicatif est calculé uniquement sur demande.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FI
              label="Devise ordre"
              value={order.deviseOrdre}
              onChange={value =>
                updateConversionSource('deviseOrdre', value)
              }
              select
              required
              opts={currencyOptions}
            />

            <FI
              label="Montant ordre"
              value={order.montantOrdre}
              onChange={value =>
                updateConversionSource('montantOrdre', value)
              }
              required
              placeholder="Saisir le montant"
            />

            <FI
              label="Devise transfert"
              value={order.deviseTransfert}
              onChange={value =>
                update('deviseTransfert', value)
              }
              select
              required
              opts={currencyOptions}
            />

            <FI
              label="Date valeur"
              value={order.dateValeur}
              onChange={value =>
                update('dateValeur', value)
              }
              type="date"
              required
            />

            <FI
              label="Cours de conversion indicatif"
              value={order.coursConversion}
              disabled
              placeholder="Non calculé"
            />

            <FI
              label="Contre-valeur TND"
              value={order.contreValeurTnd}
              disabled
              placeholder="Non calculée"
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
              <AlertDescription>
                {counterValueError}
              </AlertDescription>
            </Alert>
          )}

          
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donneur d’ordre</CardTitle>
          <CardDescription>
            Les informations disponibles dans la fiche du client sont
            préremplies. Le compte de débit reste une sélection explicite.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <PartyForm
            title="Informations du donneur d’ordre"
            value={order.debtor}
            onChange={value =>
              update('debtor', value)
            }
            countryLov
            countryOptions={countries}
            countryLoading={countriesLoading}
            countryRequired
            accountLov
            accountOptions={debtorAccountOptions}
            accountRequired
            lockedFields={debtorLockedFields}
          />

          {client && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Les données disponibles issues de la fiche client sont
                protégées contre la modification, à l’exception du champ
                « Nom et prénom / Raison sociale ». Les champs absents de la
                fiche client restent complétables. Aucun compte de débit
                n’est choisi automatiquement.
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
              onChange={value =>
                update('ultimateDebtor', value)
              }
              countryLov
              countryOptions={countries}
              countryLoading={countriesLoading}
              countryRequired
            />
          </CardContent>
        )}
      </Card>

      <BeneficiarySection
        value={order.beneficiary}
        countries={countries}
        countriesLoading={countriesLoading}
        onChange={value =>
          update('beneficiary', value)
        }
      />

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
              onChange={value =>
                update('ultimateCreditor', value)
              }
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
            Saisissez le BIC puis lancez explicitement la recherche.
            Aucune banque n’est pré-positionnée.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FI
              label="Code BIC de la banque"
              value={order.beneficiaryBank.bicfi}
              onChange={updateBankBic}
              placeholder="Saisir le BIC"
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
                placeholder="Chargé après recherche"
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
            Ces données décrivent l’opération et doivent être choisies ou
            saisies explicitement.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FI
              label="Motif de paiement"
              value={order.motifPaiement}
              onChange={value =>
                update('motifPaiement', value)
              }
              required
              placeholder="Saisir le motif du paiement"
            />

            <FI
              label="Répartition des frais"
              value={order.chargeBearer}
              onChange={value =>
                update('chargeBearer', value)
              }
              select
              required
              opts={[
                {
                  value: '',
                  label: 'Sélectionner la répartition',
                },
                {
                  value: 'SHAR',
                  label: 'Frais partagés',
                },
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
              onChange={value =>
                update('purposeCode', value)
              }
              select
              opts={[
                {
                  value: '',
                  label: 'Sélectionner une catégorie',
                },
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
              onChange={value =>
                update('serviceLevel', value)
              }
              select
              opts={[
                {
                  value: '',
                  label: 'Sélectionner le délai',
                },
                {
                  value: 'NURG',
                  label: 'Standard',
                },
                {
                  value: 'SDVA',
                  label: 'Exécution le jour même',
                },
                {
                  value: 'SEPA',
                  label: 'Paiement SEPA',
                },
              ]}
            />

            <FI
              label="Référence facture / justificatif"
              value={order.refFacture}
              onChange={value =>
                update('refFacture', value)
              }
              placeholder="Saisir une référence si disponible"
            />

            <div className="md:col-span-3">
              <FI
                label="Observations"
                value={order.observations}
                onChange={value =>
                  update('observations', value)
                }
                multiline
                rows={4}
                placeholder="Observations de l’agence ou informations complémentaires."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
