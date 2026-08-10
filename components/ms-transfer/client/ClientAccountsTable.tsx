import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '../../ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import type { AccountRow } from '../transfer.types';

interface ClientAccountsTableProps {
  agencyCode: string;
  accounts: AccountRow[];
  loading: boolean;
  error?: string;
  commissionAccount: string;
  onCommissionAccountChange: (accountNumber: string) => void;
}

export function ClientAccountsTable({
  agencyCode,
  accounts,
  loading,
  error = '',
  commissionAccount,
  onCommissionAccountChange,
}: ClientAccountsTableProps) {
  if (!agencyCode) {
    return null;
  }

  const commissionEligibleCount = accounts.filter(
    account => account.eligibleCommission,
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comptes disponibles</CardTitle>

        <CardDescription>
          Comptes actifs du client dans l’agence {agencyCode}.
          Sélectionnez le compte à utiliser pour les commissions de
          l’opération.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {loading && (
          <div className="flex items-center gap-2 p-6 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Chargement des comptes...</span>
          </div>
        )}

        {!loading && error && (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />

              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!loading && !error && accounts.length === 0 && (
          <div className="p-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />

              <AlertDescription>
                Aucun compte actif n’est disponible pour ce client
                dans l’agence {agencyCode}. Sélectionnez une autre
                agence si elle est disponible ; sinon, l’opération
                ne peut pas être poursuivie.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!loading && !error && accounts.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-y bg-muted/50">
                  <tr>
                    {[
                      'Numéro compte',
                      'Devise',
                      'Type',
                      'Principal',
                      'Compte commission',
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
                  {accounts.map(account => {
                    const selectable =
                      account.eligibleCommission;

                    const selected =
                      commissionAccount === account.numero;

                    return (
                      <tr
                        key={`${account.codeAgence}:${account.numero}`}
                        onClick={() => {
                          if (selectable) {
                            onCommissionAccountChange(
                              account.numero,
                            );
                          }
                        }}
                        className={`border-b transition-colors ${
                          selectable
                            ? 'cursor-pointer hover:bg-muted/40'
                            : 'opacity-60'
                        } ${
                          selected
                            ? 'bg-primary/5'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium">
                          {account.numero}
                        </td>

                        <td className="px-4 py-3 font-medium">
                          {account.devise || '—'}
                        </td>

                        <td className="px-4 py-3">
                          {account.type || '—'}
                        </td>

                        <td className="px-4 py-3">
                          {account.principal ? 'Oui' : 'Non'}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="commission-account"
                              checked={selected}
                              onChange={() => {
                                if (selectable) {
                                  onCommissionAccountChange(
                                    account.numero,
                                  );
                                }
                              }}
                              disabled={!selectable}
                              aria-label={`Sélectionner le compte ${account.numero} en ${account.devise || 'devise non renseignée'} comme compte commission`}
                              className="h-4 w-4 accent-primary"
                            />

                            {!selectable && (
                              <span className="text-xs text-muted-foreground">
                                Non disponible
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {commissionEligibleCount === 0 && (
              <div className="border-t p-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />

                  <AlertDescription>
                    Aucun des comptes disponibles ne peut être utilisé
                    comme compte de commission. L’opération ne peut
                    pas être poursuivie sans compte de commission
                    valide.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}