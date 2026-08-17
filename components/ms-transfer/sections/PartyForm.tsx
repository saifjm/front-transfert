import React from 'react';

import type {
  AccountRow,
  CountryOption,
  PartyData,
} from '../transfer.types';
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
  identifierReadOnly?: boolean;
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
  identifierReadOnly = false,
}: PartyFormProps) {
  const update = <K extends keyof PartyData>(
    field: K,
    fieldValue: PartyData[K],
  ) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  const handleCountryChange = (countryCode: string) => {
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

    if (!country) {
      return;
    }

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
          opts={[
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
              disabled={countryLoading}
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
            />

            <FI
              label="Pays"
              value={value.pays}
              onChange={fieldValue =>
                update('pays', fieldValue)
              }
              required={countryRequired}
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
        />

        <div className="md:col-span-2">
          <FI
            label="Adresse ligne 1"
            value={value.adresseLigne1}
            onChange={fieldValue =>
              update('adresseLigne1', fieldValue)
            }
          />
        </div>

        <FI
          label="Adresse ligne 2"
          value={value.adresseLigne2}
          onChange={fieldValue =>
            update('adresseLigne2', fieldValue)
          }
        />


        <FI
          label="Type de pièce ou d’identifiant"
          value={value.typePiece}
          onChange={fieldValue =>
            update('typePiece', fieldValue)
          }
          disabled={identifierReadOnly}
        />

        <FI
          label="Numéro de pièce ou d’identifiant"
          value={value.noPiece}
          onChange={fieldValue =>
            update('noPiece', fieldValue)
          }
          disabled={identifierReadOnly}
        />

      </div>
    </div>
  );
}
