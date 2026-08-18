import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

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
import {
  assessRegulatoryNature,
  determineCommercialNatureOperationBct,
  getBctNatureOperationLabel,
  getCommercialValuationBasisLabel,
} from '../transfer.regulatory';
import type {
  BctAuthorization,
  ClientData,
  RegulatoryData,
  TransferOrder,
  TransferType,
} from '../transfer.types';
import { FI, FR } from '../transfer.ui';

export function RegulatoryDataSection({
  transferType,
  order,
  client,
  value,
  onChange,
}: {
  transferType: TransferType | null;
  order: TransferOrder;
  client: ClientData | null;
  value: RegulatoryData;
  onChange: (value: RegulatoryData) => void;
}) {
  const [authorizations, setAuthorizations] = useState<
    BctAuthorization[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCommercial = transferType === 'commercial';

  const commercialNatureCode = useMemo(
    () => (
      isCommercial
        ? determineCommercialNatureOperationBct(
            order.commercialValuationBasis,
          )
        : null
    ),
    [isCommercial, order.commercialValuationBasis],
  );

  // For commercial transfers the value is system-managed when determinable.
  // If the basis is not yet known, an empty value is accepted and non-blocking.
  useEffect(() => {
    if (!isCommercial) return;

    const calculatedCode = commercialNatureCode ?? '';
    if (value.codeNatureOperationBct === calculatedCode) return;

    onChange({
      ...value,
      codeNatureOperationBct: calculatedCode,
    });
  }, [commercialNatureCode, isCommercial, onChange, value]);

  useEffect(() => {
    let active = true;

    if (!client) {
      setAuthorizations([]);
      setLoading(false);
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
          setAuthorizations([]);
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

  const natureAssessment = assessRegulatoryNature(
    transferType,
    order,
    value,
  );

  const commercialNatureLabel = commercialNatureCode
    ? getBctNatureOperationLabel(commercialNatureCode)
    : '';

  const handleFinancialNatureCodeChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 4);
    onChange({
      ...value,
      codeNatureOperationBct: digitsOnly,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Données règlementaires BCT
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le code nature opération BCT qualifie économiquement le
          transfert. Il est déterminé automatiquement lorsqu’une règle
          fiable est disponible, sans bloquer la poursuite du dossier.
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
            {isCommercial
              ? 'Le code BCT est calculé à partir des données de l’opération lorsqu’elles permettent de distinguer FOB/équivalent de CAF/équivalent.'
              : 'Le code BCT peut être renseigné lorsqu’il est disponible. Son absence ne bloque pas la poursuite du dossier.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FI
              label="Code nature opération BCT"
              value={value.codeNatureOperationBct}
              onChange={
                isCommercial
                  ? undefined
                  : handleFinancialNatureCodeChange
              }
              placeholder={
                isCommercial
                  ? 'Non déterminé'
                  : 'Ex : 0861'
              }
              disabled={isCommercial}
            />

            {isCommercial && (
              <FR
                label="Base de valorisation commerciale"
                value={getCommercialValuationBasisLabel(
                  order.commercialValuationBasis,
                )}
              />
            )}

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

          {isCommercial && commercialNatureCode && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge
                variant="outline"
                className="gap-1 bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle2 className="h-3 w-3" />
                Calcul automatique
              </Badge>
              <span className="text-muted-foreground">
                {commercialNatureCode} — {commercialNatureLabel}
              </span>
            </div>
          )}

          {natureAssessment.warnings.length > 0 && (
            <Alert>
              <CircleAlert className="h-4 w-4" />
              <AlertDescription>
                {natureAssessment.warnings[0]} Vous pouvez poursuivre
                la saisie du dossier ; ce point sera enrichi ou contrôlé
                ultérieurement.
              </AlertDescription>
            </Alert>
          )}

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
