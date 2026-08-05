import React from 'react';

import type { PartyData } from '../transfer.types';
import { FI } from '../transfer.ui';

export function PartyForm({
  title,
  value,
  onChange,
  beneficiary = false,
}: {
  title: string;
  value: PartyData;
  onChange: (value: PartyData) => void;
  beneficiary?: boolean;
}) {
  const update = <K extends keyof PartyData>(
    field: K,
    fieldValue: PartyData[K],
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{title}</h3>

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
            update('type', fieldValue as PartyData['type'])
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
        <FI
          label="Code pays"
          value={value.codePays}
          onChange={fieldValue =>
            update('codePays', fieldValue.toUpperCase())
          }
          placeholder="DE"
          required={beneficiary}
        />
        <FI
          label="Pays"
          value={value.pays}
          onChange={fieldValue => update('pays', fieldValue)}
          required={beneficiary}
        />
        <FI
          label="Ville"
          value={value.townName}
          onChange={fieldValue => update('townName', fieldValue)}
          required={beneficiary}
        />
        <FI
          label={
            beneficiary ? 'Compte bénéficiaire / IBAN' : 'Compte'
          }
          value={value.compte}
          onChange={fieldValue =>
            update(
              'compte',
              fieldValue.replace(/\s/g, '').toUpperCase(),
            )
          }
          required={beneficiary}
        />
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
            { value: '', label: 'Non renseignée' },
            { value: 'RESIDENT', label: 'Résident' },
            { value: 'NON_RESIDENT', label: 'Non-résident' },
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
        />
        <FI
          label="Numéro de pièce ou d’identifiant"
          value={value.noPiece}
          onChange={fieldValue => update('noPiece', fieldValue)}
        />
      </div>
    </div>
  );
}
