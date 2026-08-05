import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
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

import {
  getClientAgence,
  getClientCompteCom,
} from '../transfer.api';
import { getUserMessage } from '../transfer.errors';
import type {
  ClientAgencyEligibility,
  ClientData,
  CustomerIdType,
} from '../transfer.types';
import { FI, FR } from '../transfer.ui';

interface ClientSectionProps {
  client: ClientData | null;
  commissionAccount: string;
  onClientLoaded: (client: ClientData) => void;
  onClientCleared: () => void;
  onCommissionAccountChange: (account: string) => void;
}

function agencyListLabel(codes: Array<{ code: string }>): string {
  return codes.length > 0
    ? codes.map(agency => agency.code).join(', ')
    : 'Aucune';
}

export function ClientSection({
  client,
  commissionAccount,
  onClientLoaded,
  onClientCleared,
  onCommissionAccountChange,
}: ClientSectionProps) {
  const [typePiece, setTypePiece] =
    useState<CustomerIdType>('CIN');
  const [noPiece, setNoPiece] = useState('');
  const [eligibility, setEligibility] =
    useState<ClientAgencyEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearPreviousResult = () => {
    setEligibility(null);
    setError('');
    onClientCleared();
  };

  const handleTypePieceChange = (value: string) => {
    setTypePiece(value as CustomerIdType);
    clearPreviousResult();
  };

  const handleNoPieceChange = (value: string) => {
    setNoPiece(value.toUpperCase());
    clearPreviousResult();
  };

  const search = async () => {
    const normalizedNoPiece = noPiece.trim();

    if (!normalizedNoPiece) {
      setError('Veuillez saisir le numéro de pièce.');
      setEligibility(null);
      onClientCleared();
      return;
    }

    setError('');
    setEligibility(null);
    setLoading(true);
    onClientCleared();

    try {
      const agencyEligibility = await getClientAgence(
        typePiece,
        normalizedNoPiece,
      );

      setEligibility(agencyEligibility);

      if (!agencyEligibility.eligible) {
        return;
      }

      const foundClient = await getClientCompteCom(
        typePiece,
        normalizedNoPiece,
        agencyEligibility,
      );

      onClientLoaded(foundClient);
    } catch (reason) {
      setEligibility(null);
      setError(
        getUserMessage(
          reason,
          'La recherche du client n’a pas pu aboutir. Réessayez ultérieurement.',
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
          Identification du client donneur d’ordre
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le client peut initier un transfert uniquement dans son agence
          de rattachement. L’agence courante provient de la session de
          l’utilisateur connecté.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recherche du client</CardTitle>
          <CardDescription>
            L’éligibilité est contrôlée avant la consultation de la fiche
            client et des comptes de l’agence courante.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FI
              label="Type de pièce"
              value={typePiece}
              onChange={handleTypePieceChange}
              select
              opts={[
                { value: 'CIN', label: 'CIN' },
                { value: 'PASSPORT', label: 'Passeport' },
                { value: 'MF', label: 'Matricule fiscal' },
                { value: 'RC', label: 'Registre de commerce' },
              ]}
            />

            <FI
              label="Numéro de pièce"
              value={noPiece}
              onChange={handleNoPieceChange}
              placeholder="Ex : 07458963"
              required
              error={error || undefined}
            />

            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                onClick={search}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher
                  </>
                )}
              </Button>
            </div>
          </div>

          {eligibility?.eligible && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Client éligible.</strong>{' '}
                {eligibility.message}
                <div className="mt-1 text-xs">
                  Agence courante :{' '}
                  <strong>{eligibility.currentAgency?.code}</strong>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {eligibility && !eligibility.eligible && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Client non éligible.</strong>{' '}
                {eligibility.message}
                <div className="mt-1 text-xs">
                  Agence courante :{' '}
                  <strong>
                    {eligibility.currentAgency?.code || 'Non déterminée'}
                  </strong>
                  {' · '}Agences du client :{' '}
                  <strong>
                    {agencyListLabel(eligibility.clientAgencies)}
                  </strong>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            Démonstration du serveur bancaire : utilisateur{' '}
            <strong>U00458</strong>, agence courante{' '}
            <strong>012</strong>, client{' '}
            <strong>CIN / 07458963</strong>.
          </p>
        </CardContent>
      </Card>

      {client && eligibility?.eligible && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Informations client</CardTitle>
                  <CardDescription>
                    Données d’identification et situation du client
                  </CardDescription>
                </div>

                <Badge
                  variant="outline"
                  className="gap-1 border-green-200 bg-green-50 text-green-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Client éligible
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <FR label="Référence client" value={client.idClient} />
                <FR label="Numéro de pièce" value={client.noPiece} mono />
                <FR label="Type client" value={client.typeClient} />
                <FR
                  label="Résident"
                  value={client.resident ? 'Oui' : 'Non'}
                />
                <div className="lg:col-span-2">
                  <FR
                    label="Nom / Raison sociale"
                    value={client.nomRaison}
                  />
                </div>
                <FR
                  label="Pays de résidence"
                  value={`${client.codePays} — ${client.pays}`}
                />
                <FR label="Ville" value={client.ville} />
                <FR
                  label="Agence de rattachement"
                  value={client.agence}
                />
                <FR
                  label="Statut exportateur"
                  value={
                    client.totalementExportatrice
                      ? 'Totalement exportatrice'
                      : 'Non totalement exportatrice'
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700"
                >
                  Statut : {client.statut}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Risque : {client.niveauRisque}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compte commission</CardTitle>
              <CardDescription>
                Seuls les comptes valides, non professionnels et
                retournés pour l’agence courante sont proposés. Aucun
                solde ni provision n’est consulté sur cette interface.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {client.comptes.length === 0 ? (
                <div className="p-6">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Aucun compte accessible n’a été retourné pour
                      l’agence courante.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-y bg-muted/50">
                      <tr>
                        {[
                          'Numéro compte',
                          'Agence',
                          'Devise',
                          'Type',
                          'Principal',
                          'Statut',
                          'Sélection',
                        ].map(header => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {client.comptes.map(account => {
                        const selectable = account.eligibleCommission;
                        const selected =
                          commissionAccount === account.numero;

                        return (
                          <tr
                            key={account.numero}
                            onClick={() => {
                              if (selectable) {
                                onCommissionAccountChange(account.numero);
                              }
                            }}
                            className={`border-b transition-colors ${
                              selectable
                                ? 'cursor-pointer hover:bg-muted/40'
                                : 'opacity-60'
                            } ${selected ? 'bg-primary/5' : ''}`}
                          >
                            <td className="px-4 py-3 font-mono text-xs font-medium">
                              {account.numero}
                            </td>
                            <td className="px-4 py-3">
                              {account.codeAgence}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {account.devise}
                            </td>
                            <td className="px-4 py-3">
                              {account.type}
                            </td>
                            <td className="px-4 py-3">
                              {account.principal ? 'Oui' : 'Non'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className="border-green-200 bg-green-50 text-green-700"
                              >
                                {account.statut}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="radio"
                                name="commission-account"
                                checked={selected}
                                onChange={() =>
                                  onCommissionAccountChange(account.numero)
                                }
                                disabled={!selectable}
                                aria-label={`Sélectionner le compte ${account.numero}`}
                                className="h-4 w-4 accent-primary"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
