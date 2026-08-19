import React from 'react';

import type {
  AccountRow,
  CountryOption,
  PartyData,
} from '../transfer.types';
import {
  isPartyFieldLocked,
  type PartyField,
} from '../transfer.party-locks';
import { FI } from '../transfer.ui';

interface PartyFormProps {
  title: string;
  value: PartyData;
  onChange: (value: PartyData) => void;
  beneficiary?: boolean;
  countryLov?: boolean;
  countryOptions?: CountryOption[];
  countryLoading?: boolean;
  countryRequired?: boolean;
  accountLov?: boolean;
  accountOptions?: AccountRow[];
  accountRequired?: boolean;

  /**
   * Fields protected because they were loaded from an authoritative customer
   * file. Missing/non-imported fields remain editable.
   */
  lockedFields?: readonly PartyField[];
}

export function PartyForm({
  title,
  value,
  onChange,
  beneficiary = false,
  countryLov = false,
  countryOptions = [],
  countryLoading = false,
  countryRequired = beneficiary,
  accountLov = false,
  accountOptions = [],
  accountRequired = beneficiary,
  lockedFields = [],
}: PartyFormProps) {
  const locked = (field: PartyField) =>
    isPartyFieldLocked(lockedFields, field);

  const update = <K extends keyof PartyData>(
    field: K,
    fieldValue: PartyData[K],
  ) => {
    // UI disabled state is not the only protection: ignore updates to a
    // locked customer-file field even if an event is triggered indirectly.
    if (locked(field)) return;

    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  const countryLocked =
    locked('codePays')
    || locked('pays');

  const handleCountryChange = (countryCode: string) => {
    if (countryLocked) return;

    if (!countryCode) {
      onChange({
        ...value,
        codePays: '',
        pays: '',
      });
      return;
    }

    const country = countryOptions.find(
      item => item.alpha2 === countryCode,
    );

    if (!country) return;

    onChange({
      ...value,
      codePays: country.alpha2,
      pays: country.label,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">
        {title}
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <FI
            label="Nom et prénom / Raison sociale"
            value={value.nomRaison}
            onChange={fieldValue =>
              update('nomRaison', fieldValue)
            }
            required
            disabled={locked('nomRaison')}
          />
        </div>

        <FI
          label="Type"
          value={value.type}
          onChange={fieldValue =>
            update(
              'type',
              fieldValue as PartyData['type'],
            )
          }
          select
          required
          disabled={locked('type')}
          opts={[
            {
              value: '',
              label: 'Sélectionner le type',
            },
            {
              value: 'PERSONNE_MORALE',
              label: 'Personne morale',
            },
            {
              value: 'PERSONNE_PHYSIQUE',
              label: 'Personne physique',
            },
          ]}
        />

        {countryLov ? (
          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor={`${title.replace(/\s+/g, '-').toLowerCase()}-country`}
              className="text-sm font-medium"
            >
              Pays
              {countryRequired ? ' *' : ''}
            </label>

            <select
              id={`${title.replace(/\s+/g, '-').toLowerCase()}-country`}
              value={value.codePays || ''}
              onChange={event =>
                handleCountryChange(event.target.value)
              }
              disabled={countryLoading || countryLocked}
              required={countryRequired}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {countryLoading
                  ? 'Chargement des pays...'
                  : 'Sélectionner un pays'}
              </option>

              {countryOptions.map(country => (
                <option
                  key={country.alpha2}
                  value={country.alpha2}
                >
                  {country.label}
                </option>
              ))}
            </select>

            {!countryLoading && value.codePays && (
              <p className="text-xs text-muted-foreground">
                Code pays : {value.codePays}
              </p>
            )}
          </div>
        ) : (
          <>
            <FI
              label="Code pays"
              value={value.codePays}
              onChange={fieldValue =>
                update(
                  'codePays',
                  fieldValue.toUpperCase(),
                )
              }
              placeholder="DE"
              required={countryRequired}
              disabled={locked('codePays')}
            />

            <FI
              label="Pays"
              value={value.pays}
              onChange={fieldValue =>
                update('pays', fieldValue)
              }
              required={countryRequired}
              disabled={locked('pays')}
            />
          </>
        )}

        <FI
          label="Ville"
          value={value.townName}
          onChange={fieldValue =>
            update('townName', fieldValue)
          }
          required={beneficiary}
          disabled={locked('townName')}
        />

        {accountLov ? (
          <FI
            label={
              beneficiary
                ? 'Compte bénéficiaire / IBAN'
                : 'Compte donneur d’ordre'
            }
            value={value.compte}
            onChange={fieldValue =>
              update('compte', fieldValue)
            }
            select
            required={accountRequired}
            disabled={locked('compte')}
            opts={[
              {
                value: '',
                label: 'Sélectionner un compte',
              },
              ...accountOptions.map(account => ({
                value: account.numero,
                label: [
                  account.numero,
                  account.devise,
                  account.type,
                ]
                  .filter(Boolean)
                  .join(' — '),
              })),
            ]}
          />
        ) : (
          <FI
            label={
              beneficiary
                ? 'Compte bénéficiaire / IBAN'
                : 'Compte'
            }
            value={value.compte}
            onChange={fieldValue =>
              update(
                'compte',
                fieldValue
                  .replace(/\s/g, '')
                  .toUpperCase(),
              )
            }
            required={beneficiary}
            disabled={locked('compte')}
          />
        )}

        <FI
          label="Résidence"
          value={value.residence}
          onChange={fieldValue =>
            update(
              'residence',
              fieldValue as PartyData['residence'],
            )
          }
          select
          disabled={locked('residence')}
          opts={[
            {
              value: '',
              label: 'Non renseignée',
            },
            {
              value: 'RESIDENT',
              label: 'Résident',
            },
            {
              value: 'NON_RESIDENT',
              label: 'Non-résident',
            },
          ]}
        />

        <FI
          label="Code postal"
          value={value.codePostal}
          onChange={fieldValue =>
            update('codePostal', fieldValue)
          }
          disabled={locked('codePostal')}
        />

        <div className="md:col-span-2">
          <FI
            label="Adresse ligne 1"
            value={value.adresseLigne1}
            onChange={fieldValue =>
              update('adresseLigne1', fieldValue)
            }
            disabled={locked('adresseLigne1')}
          />
        </div>

        <FI
          label="Adresse ligne 2"
          value={value.adresseLigne2}
          onChange={fieldValue =>
            update('adresseLigne2', fieldValue)
          }
          disabled={locked('adresseLigne2')}
        />

        <FI
          label="Type de pièce ou d’identifiant"
          value={value.typePiece}
          onChange={fieldValue =>
            update('typePiece', fieldValue)
          }
          disabled={locked('typePiece')}
        />

        <FI
          label="Numéro de pièce ou d’identifiant"
          value={value.noPiece}
          onChange={fieldValue =>
            update('noPiece', fieldValue)
          }
          disabled={locked('noPiece')}
        />
      </div>
    </div>
  );
}
