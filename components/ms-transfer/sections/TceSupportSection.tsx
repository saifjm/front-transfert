import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import { verifyTce } from '../transfer.api';
import { getUserMessage } from '../transfer.errors';
import type {
  ClientData,
  RegulatorySupportData,
  TceAllocation,
  TransferOrder,
} from '../transfer.types';
import { FI, FR } from '../transfer.ui';
import {
  createTceAllocation,
  formatTceAllocationTotals,
  hasDuplicateTceAllocation,
  validateTceAllocation,
  validateTceAllocations,
} from '../transfer.tce';

function TceAllocationCard({
  allocation,
  index,
  onUpdate,
  onRemove,
}: {
  allocation: TceAllocation;
  index: number;
  onUpdate: (allocation: TceAllocation) => void;
  onRemove: () => void;
}) {
  const validation = validateTceAllocation(allocation);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>TCE {index + 1}</CardTitle>
            <CardDescription>
              {allocation.codeTitre} — {allocation.numDomi}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                validation.valid
                  ? 'gap-1 border-green-200 bg-green-50 text-green-700'
                  : 'gap-1 border-amber-200 bg-amber-50 text-amber-700'
              }
            >
              {validation.valid ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <CircleAlert className="h-3 w-3" />
              )}
              {validation.valid ? 'Valide' : 'À compléter'}
            </Badge>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
            >
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <FR label="Code titre" value={allocation.codeTitre} />
          <FR label="N° domiciliation" value={allocation.numDomi} mono />
          <FR label="Date domiciliation" value={allocation.dateDomi} />
          <FR label="Devise" value={allocation.devise || '—'} />

          <FR
            label="Disponible au dernier contrôle"
            value={
              allocation.montantDisponibleControle
                ? `${allocation.montantDisponibleControle} ${allocation.devise}`
                : '—'
            }
          />

          <div className="md:col-span-2">
            <FI
              label={`Montant affecté (${allocation.devise || 'devise TCE'})`}
              value={allocation.montantAffecte}
              onChange={montantAffecte =>
                onUpdate({
                  ...allocation,
                  montantAffecte,
                })
              }
              required
              placeholder="0,000"
            />
          </div>

          <FR
            label="Réservation"
            value={
              allocation.reservationStatus === 'RESERVED'
                ? allocation.reservationReference || 'Réservé'
                : 'Non exécutée à ce stade'
            }
          />
        </div>

        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              {validation.errors[0]}
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground">
          Le disponible affiché est un snapshot du contrôle. Le reliquat
          doit être recontrôlé par titre au moment de la réservation.
        </p>
      </CardContent>
    </Card>
  );
}

export function TceSupportSection({
  client,
  order,
  value,
  onChange,
}: {
  client: ClientData | null;
  order: TransferOrder;
  value: RegulatorySupportData;
  onChange: (value: RegulatorySupportData) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validation = useMemo(
    () => validateTceAllocations(value.tceAllocations, order),
    [value.tceAllocations, order],
  );

  const updateSearch = (
    field: keyof RegulatorySupportData['tceSearch'],
    fieldValue: string,
  ) => {
    setError('');
    onChange({
      ...value,
      tceSearch: {
        ...value.tceSearch,
        [field]: fieldValue,
      },
    });
  };

  const addVerifiedTce = async () => {
    if (!client) {
      setError(
        'Identifiez d’abord le client avant de consulter un titre.',
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyTce(value.tceSearch, client);

      if (result.state !== 'success' || !result.appartient) {
        setError(
          result.libelleErreur
          || 'Le titre ne peut pas être rattaché à cette opération.',
        );
        return;
      }

      const allocation = createTceAllocation(result);

      if (
        hasDuplicateTceAllocation(
          value.tceAllocations,
          allocation,
        )
      ) {
        setError(
          'Ce titre est déjà rattaché à l’opération.',
        );
        return;
      }

      onChange({
        ...value,
        tceAllocations: [
          ...value.tceAllocations,
          allocation,
        ],
        tceSearch: {
          ...value.tceSearch,
          numDomi: '',
        },
      });
    } catch (reason) {
      setError(
        getUserMessage(
          reason,
          'Le titre de commerce extérieur n’a pas pu être vérifié.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const updateAllocation = (updated: TceAllocation) => {
    onChange({
      ...value,
      tceAllocations: value.tceAllocations.map(allocation =>
        allocation.id === updated.id ? updated : allocation
      ),
    });
  };

  const removeAllocation = (id: string) => {
    onChange({
      ...value,
      tceAllocations: value.tceAllocations.filter(
        allocation => allocation.id !== id,
      ),
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un titre de commerce extérieur</CardTitle>
          <CardDescription>
            Chaque titre est consulté individuellement puis ajouté à la
            collection de supports de l’opération.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FI
              label="Code titre"
              value={value.tceSearch.codeTitre}
              onChange={fieldValue =>
                updateSearch('codeTitre', fieldValue)
              }
              required
            />
            <FI
              label="N° domiciliation"
              value={value.tceSearch.numDomi}
              onChange={fieldValue =>
                updateSearch('numDomi', fieldValue)
              }
              required
            />
            <FI
              label="Date domiciliation"
              value={value.tceSearch.dateDomi}
              onChange={fieldValue =>
                updateSearch('dateDomi', fieldValue)
              }
              type="date"
              required
            />
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                onClick={addVerifiedTce}
                disabled={loading || !client}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Vérifier et ajouter
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            Titres rattachés ({value.tceAllocations.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            {value.tceAllocations.length
              ? `Montants affectés : ${formatTceAllocationTotals(value.tceAllocations)}`
              : 'Aucun titre rattaché.'}
          </p>
        </div>

        <Badge
          variant="outline"
          className={
            validation.valid
              ? 'gap-1 border-green-200 bg-green-50 text-green-700'
              : 'gap-1 border-amber-200 bg-amber-50 text-amber-700'
          }
        >
          {validation.valid ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <CircleAlert className="h-3 w-3" />
          )}
          {validation.valid
            ? 'Supports TCE complets'
            : 'Supports TCE à compléter'}
        </Badge>
      </div>

      {validation.warnings.map(warning => (
        <Alert key={warning}>
          <CircleAlert className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}

      {value.tceAllocations.map((allocation, index) => (
        <TceAllocationCard
          key={allocation.id}
          allocation={allocation}
          index={index}
          onUpdate={updateAllocation}
          onRemove={() => removeAllocation(allocation.id)}
        />
      ))}

      {value.tceAllocations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Plus className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">
              Aucun titre de commerce extérieur rattaché
            </p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Utilisez le formulaire ci-dessus pour vérifier puis ajouter
              le premier titre.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
