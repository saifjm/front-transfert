import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import { getActiveClientAuthorizations } from '../transfer.api';
import { getUserMessage } from '../transfer.errors';
import type {
  BctAuthorization,
  ClientData,
  RegulatoryData,
} from '../transfer.types';
import { FI, FR } from '../transfer.ui';

export function RegulatoryDataSection({
  client,
  value,
  onChange,
}: {
  client: ClientData | null;
  value: RegulatoryData;
  onChange: (value: RegulatoryData) => void;
}) {
  const [authorizations, setAuthorizations] = useState<
    BctAuthorization[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!client) {
      setAuthorizations([]);
      return;
    }

    setLoading(true);
    setError('');

    getActiveClientAuthorizations(
      client.typePiece,
      client.noPiece,
    )
      .then(items => {
        if (active) setAuthorizations(items);
      })
      .catch(reason => {
        if (active) {
          setError(
            getUserMessage(
              reason,
              'Les autorisations BCT n’ont pas pu être chargées. Réessayez ultérieurement.',
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client]);

  const selectedAuthorization = authorizations.find(
    authorization =>
      authorization.id === value.selectedAuthorizationId,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Données règlementaires BCT
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseignez la nature de l’opération et l’autorisation BCT
          active lorsque celle-ci est requise.
        </p>
      </div>

      {!client && (
        <Alert>
          <AlertDescription>
            Identifiez d’abord le client pour charger ses autorisations
            BCT actives.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nature de l’opération</CardTitle>
          <CardDescription>
            Déterminez si une autorisation BCT F1 ou F2 doit être
            associée au dossier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FI
              label="Code nature opération"
              value={value.codeNatureOperation}
              onChange={codeNatureOperation =>
                onChange({ ...value, codeNatureOperation })
              }
              placeholder="Ex : 12"
              required
            />
            <FI
              label="Autorisation BCT requise"
              value={value.authorizationRequired ? 'oui' : 'non'}
              onChange={selection =>
                onChange({
                  ...value,
                  authorizationRequired: selection === 'oui',
                  selectedAuthorizationId:
                    selection === 'oui'
                      ? value.selectedAuthorizationId
                      : '',
                })
              }
              select
              opts={[
                { value: 'non', label: 'Non' },
                { value: 'oui', label: 'Oui' },
              ]}
            />

            {value.authorizationRequired && (
              <FI
                label="Autorisation active du client"
                value={value.selectedAuthorizationId}
                onChange={selectedAuthorizationId =>
                  onChange({
                    ...value,
                    selectedAuthorizationId,
                  })
                }
                select
                required
                disabled={!client || loading}
                opts={[
                  {
                    value: '',
                    label: loading
                      ? 'Chargement...'
                      : 'Sélectionner une autorisation',
                  },
                  ...authorizations.map(authorization => ({
                    value: authorization.id,
                    label: `${authorization.reference} — ${authorization.type} — ${authorization.montantDisponible} ${authorization.devise}`,
                  })),
                ]}
              />
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des autorisations actives...
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedAuthorization && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Autorisation BCT sélectionnée</CardTitle>
                <CardDescription>
                  Cette autorisation sera associée au dossier.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="gap-1 bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <FR
                label="Référence"
                value={selectedAuthorization.reference}
                mono
              />
              <FR label="Type" value={selectedAuthorization.type} />
              <FR
                label="Date émission"
                value={selectedAuthorization.dateEmission}
              />
              <FR
                label="Date validité"
                value={selectedAuthorization.dateValidite}
              />
              <FR
                label="Montant autorisé"
                value={`${selectedAuthorization.montantAutorise} ${selectedAuthorization.devise}`}
              />
              <FR
                label="Montant disponible"
                value={`${selectedAuthorization.montantDisponible} ${selectedAuthorization.devise}`}
              />
              <div className="lg:col-span-2">
                <FR
                  label="Objet"
                  value={selectedAuthorization.objet}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-green-700">
              <ShieldCheck className="h-4 w-4" />
              Autorisation prête à être associée au dossier
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
