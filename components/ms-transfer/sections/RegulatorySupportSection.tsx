import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  Loader2,
  Search,
  XCircle,
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
  SupportType,
  TransferOrder,
  TransferType,
} from '../transfer.types';
import { FI, FR } from '../transfer.ui';
import { resolveSupportRule } from '../transfer.utils';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const rule = resolveSupportRule(transferType, client);

  useEffect(() => {
    if (rule === 'FI' && value.type !== 'FI') {
      onChange({
        ...value,
        type: 'FI',
        ficheInformation: {
          ...value.ficheInformation,
          objet:
            value.ficheInformation.objet || order.motifPaiement,
          montant:
            value.ficheInformation.montant || order.montantOrdre,
          devise: order.deviseOrdre,
        },
        tceResult: null,
      });
    }

    if (rule === 'TCE' && value.type !== 'TCE') {
      onChange({ ...value, type: 'TCE' });
    }
  }, [rule, order.deviseOrdre, order.montantOrdre, order.motifPaiement]);

  const selectType = (type: SupportType) => {
    onChange({
      ...value,
      type,
      tceResult: type === 'TCE' ? value.tceResult : null,
      ficheInformation: {
        ...value.ficheInformation,
        objet:
          value.ficheInformation.objet || order.motifPaiement,
        montant:
          value.ficheInformation.montant || order.montantOrdre,
        devise: order.deviseOrdre,
      },
    });
  };

  const runTceVerification = async () => {
    if (!client) {
      setError(
        'Le client doit être identifié avant la vérification du TCE.',
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tceResult = await verifyTce(value.tceSearch, client);
      onChange({ ...value, tceResult });
    } catch (reason) {
      setError(
        getUserMessage(
          reason,
          'La vérification du TCE n’a pas pu aboutir. Réessayez ultérieurement.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Support règlementaire
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le support dépend du type de transfert et du statut
          exportateur du client.
        </p>
      </div>

      {!transferType || !client ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Sélectionnez le type de transfert et identifiez le client
            pour déterminer le support applicable.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {rule === 'FI' && (
              <>
                <strong>Transfert financier :</strong> la fiche
                d’information est le support règlementaire.
              </>
            )}
            {rule === 'TCE' && (
              <>
                <strong>
                  Transfert commercial — client non totalement
                  exportateur :
                </strong>{' '}
                le TCE est obligatoire.
              </>
            )}
            {rule === 'CHOICE' && (
              <>
                <strong>
                  Transfert commercial — client totalement exportateur :
                </strong>{' '}
                choisissez TCE ou FI.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {rule === 'CHOICE' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            {
              type: 'TCE' as const,
              title: 'Titre de commerce extérieur',
              icon: FileText,
            },
            {
              type: 'FI' as const,
              title: 'Fiche d’information',
              icon: ClipboardList,
            },
          ].map(item => {
            const Icon = item.icon;
            const selected = value.type === item.type;

            return (
              <Card
                key={item.type}
                className={
                  selected
                    ? 'border-primary ring-1 ring-primary'
                    : undefined
                }
              >
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {selected
                          ? 'Support sélectionné'
                          : 'Sélectionner ce support'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? 'secondary' : 'outline'}
                    onClick={() => selectType(item.type)}
                  >
                    Choisir
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {value.type === 'FI' && (
        <Card>
          <CardHeader>
            <CardTitle>Fiche d’information</CardTitle>
            <CardDescription>
              Renseignez les références et les montants déclarés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FI
                label="Numéro FI"
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
                placeholder="FI-2026-000099"
              />
              <FI
                label="Date FI"
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
                type="date"
                required
              />
              <FI
                label="Devise"
                value={value.ficheInformation.devise}
                disabled
              />
              <FI
                label="Objet déclaré"
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
              <FI
                label="Montant déclaré"
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
              />
              <div className="md:col-span-3">
                <FI
                  label="Commentaire règlementaire"
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
                  multiline
                />
              </div>
            </div>

            {value.ficheInformation.numero &&
              value.ficheInformation.date &&
              value.ficheInformation.objet && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-green-50 text-green-700 border-green-200"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Fiche d’information complète
                </Badge>
              )}
          </CardContent>
        </Card>
      )}

      {value.type === 'TCE' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Consultation du titre de commerce extérieur
              </CardTitle>
              <CardDescription>
                Renseignez les références du TCE à associer au transfert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FI
                  label="Code titre"
                  value={value.tceSearch.codeTitre}
                  onChange={codeTitre =>
                    onChange({
                      ...value,
                      tceSearch: {
                        ...value.tceSearch,
                        codeTitre,
                      },
                      tceResult: null,
                    })
                  }
                  required
                />
                <FI
                  label="Numéro de domiciliation"
                  value={value.tceSearch.numDomi}
                  onChange={numDomi =>
                    onChange({
                      ...value,
                      tceSearch: {
                        ...value.tceSearch,
                        numDomi,
                      },
                      tceResult: null,
                    })
                  }
                  required
                  placeholder="DOM-2026-0001"
                />
                <FI
                  label="Date de domiciliation"
                  value={value.tceSearch.dateDomi}
                  onChange={dateDomi =>
                    onChange({
                      ...value,
                      tceSearch: {
                        ...value.tceSearch,
                        dateDomi,
                      },
                      tceResult: null,
                    })
                  }
                  type="date"
                  required
                />
              </div>

              <Button
                type="button"
                onClick={runTceVerification}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Vérifier le TCE
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {value.tceResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {value.tceResult.state === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <CardTitle>
                      {value.tceResult.state === 'success'
                        ? 'TCE valide'
                        : 'Vérification impossible'}
                    </CardTitle>
                    <CardDescription>
                      Résultat de la consultation du titre
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {value.tceResult.state === 'success' ? (
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <FR
                      label="Code titre"
                      value={value.tceResult.codeTitre}
                    />
                    <FR
                      label="Numéro domiciliation"
                      value={value.tceResult.numDomi}
                      mono
                    />
                    <FR
                      label="Date domiciliation"
                      value={value.tceResult.dateDomi}
                    />
                    <FR
                      label="Devise"
                      value={value.tceResult.devise}
                    />
                    <FR
                      label="Montant disponible"
                      value={`${value.tceResult.montantDispo} ${value.tceResult.devise}`}
                    />
                    <FR
                      label="Appartient au client"
                      value={
                        value.tceResult.appartient ? 'Oui' : 'Non'
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-destructive">
                    {value.tceResult.libelleErreur}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
