import React, { useEffect } from 'react';
import { FileText, Landmark } from 'lucide-react';

import { Alert, AlertDescription } from '../../ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import type {
  ClientData,
  RegulatorySupportData,
  SupportType,
  TransferOrder,
  TransferType,
} from '../transfer.types';
import { FI } from '../transfer.ui';
import { TceSupportSection } from './TceSupportSection';

function allowedSupportTypes(
  transferType: TransferType | null,
  client: ClientData | null,
): SupportType[] {
  if (transferType === 'financier') {
    return ['FI'];
  }

  if (transferType === 'commercial') {
    return client?.totalementExportatrice
      ? ['TCE', 'FI']
      : ['TCE'];
  }

  return [];
}

export function RegulatorySupportSection({
  transferType,
  client,
  order,
  value,
  onChange,
}: {
  transferType: TransferType | null;
  client: ClientData | null;
  order: TransferOrder;
  value: RegulatorySupportData;
  onChange: (value: RegulatorySupportData) => void;
}) {
  const allowed = allowedSupportTypes(transferType, client);

  useEffect(() => {
    if (allowed.length !== 1) return;

    const forcedType = allowed[0];
    if (value.type !== forcedType) {
      onChange({
        ...value,
        type: forcedType,
      });
    }
  }, [allowed.join('|'), value, onChange]);

  const setType = (type: SupportType) => {
    onChange({
      ...value,
      type,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Support réglementaire
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rattachez les supports réglementaires utilisés par
          l’opération.
        </p>
      </div>

      {!transferType && (
        <Alert>
          <AlertDescription>
            Sélectionnez d’abord le type de transfert.
          </AlertDescription>
        </Alert>
      )}

      {allowed.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Type de support</CardTitle>
            <CardDescription>
              Sélectionnez le support utilisé pour cette opération.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setType('TCE')}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  value.type === 'TCE'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <Landmark className="mb-2 h-5 w-5" />
                <strong>Titre de commerce extérieur</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Un ou plusieurs titres peuvent être rattachés.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setType('FI')}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  value.type === 'FI'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <FileText className="mb-2 h-5 w-5" />
                <strong>Fiche d’information</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Utilisez la fiche d’information lorsque le cas
                  réglementaire l’autorise.
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {value.type === 'TCE' && (
        <TceSupportSection
          client={client}
          order={order}
          value={value}
          onChange={onChange}
        />
      )}

      {value.type === 'FI' && (
        <Card>
          <CardHeader>
            <CardTitle>Fiche d’information</CardTitle>
            <CardDescription>
              Renseignez les informations de la fiche associée à
              l’opération.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FI
                label="Numéro"
                value={value.ficheInformation.numero}
                onChange={numero =>
                  onChange({
                    ...value,
                    ficheInformation: {
                      ...value.ficheInformation,
                      numero,
                    },
                  })
                }
                required
              />
              <FI
                label="Date"
                type="date"
                value={value.ficheInformation.date}
                onChange={date =>
                  onChange({
                    ...value,
                    ficheInformation: {
                      ...value.ficheInformation,
                      date,
                    },
                  })
                }
                required
              />
              <FI
                label="Devise"
                value={value.ficheInformation.devise}
                onChange={devise =>
                  onChange({
                    ...value,
                    ficheInformation: {
                      ...value.ficheInformation,
                      devise,
                    },
                  })
                }
                required
              />
              <FI
                label="Montant"
                value={value.ficheInformation.montant}
                onChange={montant =>
                  onChange({
                    ...value,
                    ficheInformation: {
                      ...value.ficheInformation,
                      montant,
                    },
                  })
                }
                required
              />
              <div className="md:col-span-2">
                <FI
                  label="Objet"
                  value={value.ficheInformation.objet}
                  onChange={objet =>
                    onChange({
                      ...value,
                      ficheInformation: {
                        ...value.ficheInformation,
                        objet,
                      },
                    })
                  }
                  required
                />
              </div>
              <div className="md:col-span-3">
                <FI
                  label="Commentaire"
                  value={value.ficheInformation.commentaire}
                  onChange={commentaire =>
                    onChange({
                      ...value,
                      ficheInformation: {
                        ...value.ficheInformation,
                        commentaire,
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
