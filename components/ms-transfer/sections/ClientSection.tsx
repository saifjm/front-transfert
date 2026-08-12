import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Search,
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
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

import { ClientSearchResult } from '../client/ClientSearchResult';
import { ClientAccountsTable } from '../client/ClientAccountsTable';
import {
  getClientTndActiveAccounts,
  searchClientWithAgencyScope,
} from '../transfer.api';
import {
  agencyOptionLabel,
  isCommissionAccountValid,
  resolveDefaultClientAgencyCode,
  type ClientAgencyOption,
} from '../transfer.client-agency';
import {
  FINANCIAL_CUSTOMER_ID_OPTIONS,
  getCustomerIdentifierFieldLabel,
  getCustomerIdentifierHelp,
  getCustomerIdentifierMaxLength,
  getCustomerIdentifierPlaceholder,
  getCustomerIdTypeLabel,
  isCommercialTransfer,
  isRneCustomerIdType,
  normalizeCustomerIdentifier,
  resolveCustomerIdType,
  validateCustomerIdentifier,
  validateRneRealtime,
} from '../transfer.client-identification';
import {
  getUserMessage,
  isClientNotFoundError,
} from '../transfer.errors';
import type {
  AccountRow,
  ClientData,
  CustomerIdType,
  TransferType,
} from '../transfer.types';

interface ClientSectionProps {
  transferType: TransferType;
  client: ClientData | null;
  eligibleAgencies: ClientAgencyOption[];
  selectedClientAgency: string;
  agencyAccounts: AccountRow[];
  commissionAccount: string;
  onClientLoaded: (client: ClientData) => void;
  onClientCleared: () => void;
  onEligibleAgenciesChange: (agencies: ClientAgencyOption[]) => void;
  onClientAgencyChange: (agencyCode: string) => void;
  onAgencyAccountsChange: (accounts: AccountRow[]) => void;
  onCommissionAccountChange: (account: string) => void;
}

type ClientSearchStatus =
  | 'IDLE'
  | 'LOADING'
  | 'SUCCESS'
  | 'NO_RESULT'
  | 'AGENCY_BLOCKED'
  | 'ERROR';

export function ClientSection({
  transferType,
  client,
  eligibleAgencies,
  selectedClientAgency,
  agencyAccounts,
  commissionAccount,
  onClientLoaded,
  onClientCleared,
  onEligibleAgenciesChange,
  onClientAgencyChange,
  onAgencyAccountsChange,
  onCommissionAccountChange,
}: ClientSectionProps) {
  const commercial = isCommercialTransfer(transferType);

  const [financialTypePiece, setFinancialTypePiece] =
    useState<CustomerIdType>(() => (
      client && client.typePiece !== 'MF'
        ? client.typePiece
        : 'CIN'
    ));
  const [noPiece, setNoPiece] = useState(client?.noPiece ?? '');
  const [searchStatus, setSearchStatus] =
    useState<ClientSearchStatus>(() => {
      if (!client) return 'IDLE';
      return eligibleAgencies.length > 0
        ? 'SUCCESS'
        : 'AGENCY_BLOCKED';
    });
  const [identifierError, setIdentifierError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [showFicheClient, setShowFicheClient] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState('');

  const onClientClearedRef = useRef(onClientCleared);
  const onClientAgencyChangeRef = useRef(onClientAgencyChange);
  const onEligibleAgenciesChangeRef = useRef(onEligibleAgenciesChange);
  const onAgencyAccountsChangeRef = useRef(onAgencyAccountsChange);
  const onCommissionAccountChangeRef = useRef(onCommissionAccountChange);
  const commissionAccountRef = useRef(commissionAccount);
  const previousTransferTypeRef = useRef(transferType);
  const searchSequenceRef = useRef(0);
  const accountsSequenceRef = useRef(0);

  const effectiveTypePiece = useMemo(
    () => resolveCustomerIdType(
      transferType,
      financialTypePiece,
    ),
    [financialTypePiece, transferType],
  );

  const usesRneControl = isRneCustomerIdType(effectiveTypePiece);

  const rneFeedback = useMemo(
    () => (
      usesRneControl
        ? validateRneRealtime(noPiece)
        : null
    ),
    [noPiece, usesRneControl],
  );

  const loading = searchStatus === 'LOADING';
  const clientNotFound = searchStatus === 'NO_RESULT';
  const agencyBlocked = searchStatus === 'AGENCY_BLOCKED';
  const clientFound =
    client != null
    && (searchStatus === 'SUCCESS' || agencyBlocked);

  const realtimeIdentifierError =
    usesRneControl
    && noPiece.length > 0
    && (
      rneFeedback?.state === 'INVALID_FORMAT'
      || rneFeedback?.state === 'INVALID_CONTROL_LETTER'
    )
      ? rneFeedback.message
      : '';

  const displayedIdentifierError =
    identifierError || realtimeIdentifierError;

  const identifierHasError = Boolean(
    displayedIdentifierError
    || clientNotFound
    || searchError,
  );

  const identifierInputClassName = [
    'flex-1',
    identifierHasError
      ? 'border-red-500 focus-visible:ring-red-500'
      : '',
    clientFound && !identifierHasError
      ? 'border-green-500 focus-visible:ring-green-500'
      : '',
  ].filter(Boolean).join(' ');

  const identifierLabel = getCustomerIdentifierFieldLabel(
    effectiveTypePiece,
  );
  const identifierPlaceholder = getCustomerIdentifierPlaceholder(
    effectiveTypePiece,
  );
  const identifierHelp = getCustomerIdentifierHelp(
    effectiveTypePiece,
  );
  const identifierTypeLabel = getCustomerIdTypeLabel(
    effectiveTypePiece,
  );

  useEffect(() => {
    onClientClearedRef.current = onClientCleared;
  }, [onClientCleared]);

  useEffect(() => {
    onClientAgencyChangeRef.current = onClientAgencyChange;
  }, [onClientAgencyChange]);

  useEffect(() => {
    onEligibleAgenciesChangeRef.current = onEligibleAgenciesChange;
  }, [onEligibleAgenciesChange]);

  useEffect(() => {
    onAgencyAccountsChangeRef.current = onAgencyAccountsChange;
  }, [onAgencyAccountsChange]);

  useEffect(() => {
    onCommissionAccountChangeRef.current = onCommissionAccountChange;
  }, [onCommissionAccountChange]);

  useEffect(() => {
    commissionAccountRef.current = commissionAccount;
  }, [commissionAccount]);

  useEffect(() => {
    if (previousTransferTypeRef.current === transferType) return;

    previousTransferTypeRef.current = transferType;
    searchSequenceRef.current += 1;
    accountsSequenceRef.current += 1;
    setFinancialTypePiece('CIN');
    setNoPiece('');
    setSearchStatus('IDLE');
    setIdentifierError('');
    setSearchError('');
    setAccountsError('');
    setLoadingAccounts(false);
    setShowFicheClient(false);
    onEligibleAgenciesChangeRef.current([]);
    onClientAgencyChangeRef.current('');
    onAgencyAccountsChangeRef.current([]);
    onCommissionAccountChangeRef.current('');
    onClientClearedRef.current();
  }, [transferType]);

  useEffect(() => {
    if (!client || !selectedClientAgency) {
      accountsSequenceRef.current += 1;
      setLoadingAccounts(false);
      setAccountsError('');
      onAgencyAccountsChangeRef.current([]);
      return;
    }

    const requestSequence = ++accountsSequenceRef.current;
    let active = true;

    setLoadingAccounts(true);
    setAccountsError('');
    onAgencyAccountsChangeRef.current([]);

    getClientTndActiveAccounts(
      client.typePiece,
      client.noPiece,
      selectedClientAgency,
    )
      .then(accounts => {
        if (!active || requestSequence !== accountsSequenceRef.current) {
          return;
        }

        onAgencyAccountsChangeRef.current(accounts);

        const selectedCommissionAccount = commissionAccountRef.current;

        if (
          selectedCommissionAccount
          && !isCommissionAccountValid(
            accounts,
            selectedClientAgency,
            selectedCommissionAccount,
          )
        ) {
          onCommissionAccountChangeRef.current('');
        }

        if (accounts.length === 0) {
          onCommissionAccountChangeRef.current('');
        }
      })
      .catch(reason => {
        if (!active || requestSequence !== accountsSequenceRef.current) {
          return;
        }

        onAgencyAccountsChangeRef.current([]);
        onCommissionAccountChangeRef.current('');
        setAccountsError(
          getUserMessage(
            reason,
            'Les comptes du client n’ont pas pu être chargés. Réessayez ultérieurement.',
          ),
        );
      })
      .finally(() => {
        if (active && requestSequence === accountsSequenceRef.current) {
          setLoadingAccounts(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    client,
    selectedClientAgency,
  ]);

  const clearPreviousResult = () => {
    searchSequenceRef.current += 1;
    accountsSequenceRef.current += 1;
    setSearchStatus('IDLE');
    setIdentifierError('');
    setSearchError('');
    setAccountsError('');
    setLoadingAccounts(false);
    setShowFicheClient(false);
    onEligibleAgenciesChange([]);
    onClientAgencyChange('');
    onAgencyAccountsChange([]);
    onCommissionAccountChange('');
    onClientCleared();
  };

  const handleFinancialTypePieceChange = (value: string) => {
    setFinancialTypePiece(value as CustomerIdType);
    setNoPiece('');
    clearPreviousResult();
  };

  const handleNoPieceChange = (value: string) => {
    setNoPiece(value.toUpperCase());
    clearPreviousResult();
  };

  const handleNoPieceBlur = () => {
    if (!noPiece.trim()) return;

    const normalizedNoPiece = normalizeCustomerIdentifier(noPiece);
    const validationError = validateCustomerIdentifier(
      effectiveTypePiece,
      normalizedNoPiece,
    );

    setIdentifierError(validationError ?? '');
  };

  const search = async () => {
    const normalizedNoPiece = normalizeCustomerIdentifier(noPiece);
    const validationError = validateCustomerIdentifier(
      effectiveTypePiece,
      normalizedNoPiece,
    );

    if (validationError) {
      setIdentifierError(validationError);
      setSearchError('');
      setSearchStatus('IDLE');
      setShowFicheClient(false);
      onEligibleAgenciesChange([]);
      onClientAgencyChange('');
      onAgencyAccountsChange([]);
      onCommissionAccountChange('');
      onClientCleared();
      return;
    }

    setIdentifierError('');
    setSearchError('');
    setAccountsError('');
    onEligibleAgenciesChange([]);
    onAgencyAccountsChange([]);
    onCommissionAccountChange('');
    const requestSequence = ++searchSequenceRef.current;
    setSearchStatus('LOADING');
    setShowFicheClient(false);
    onClientAgencyChange('');
    onClientCleared();

    try {
      const result = await searchClientWithAgencyScope(
        effectiveTypePiece,
        normalizedNoPiece,
      );

      if (requestSequence !== searchSequenceRef.current) return;

      onEligibleAgenciesChange(result.eligibleAgencies);

      if (!result.client) {
        setSearchStatus('AGENCY_BLOCKED');
        return;
      }

      onClientLoaded(result.client);

      if (result.eligibleAgencies.length === 0) {
        setSearchStatus('AGENCY_BLOCKED');
        return;
      }

      const defaultAgencyCode = resolveDefaultClientAgencyCode(
        result.eligibleAgencies,
      );

      onClientAgencyChange(defaultAgencyCode);
      setSearchStatus('SUCCESS');
    } catch (reason) {
      if (requestSequence !== searchSequenceRef.current) return;

      onEligibleAgenciesChange([]);
      onClientAgencyChange('');
      onAgencyAccountsChange([]);
      onCommissionAccountChange('');

      if (isClientNotFoundError(reason)) {
        setSearchStatus('NO_RESULT');
        setSearchError('');
      } else {
        setSearchStatus('ERROR');
        setSearchError(
          getUserMessage(
            reason,
            'La recherche du client n’a pas pu aboutir. Réessayez ultérieurement.',
          ),
        );
      }
    }
  };

  const handleAgencyChange = (agencyCode: string) => {
    accountsSequenceRef.current += 1;
    setAccountsError('');
    setLoadingAccounts(false);
    onAgencyAccountsChange([]);
    onCommissionAccountChange('');
    onClientAgencyChange(agencyCode);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Identification du client donneur d’ordre
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {commercial
            ? 'Recherchez la société par son matricule fiscal / RNE.'
            : 'Sélectionnez le type de pièce et renseignez le numéro d’identification du client.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recherche du client</CardTitle>
          <CardDescription>
            Identifiez le donneur d’ordre, puis choisissez l’agence dans
            laquelle l’opération sera initiée.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form
            onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void search();
            }}
          >
            <div
              className={
                commercial
                  ? 'space-y-4'
                  : 'grid grid-cols-1 gap-4 md:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] md:items-start'
              }
            >
              {!commercial && (
                <div className="space-y-2">
                  <Label htmlFor="typePieceClient">
                    Type de pièce *
                  </Label>

                  <select
                    id="typePieceClient"
                    value={financialTypePiece}
                    onChange={event =>
                      handleFinancialTypePieceChange(event.target.value)
                    }
                    disabled={loading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {FINANCIAL_CUSTOMER_ID_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="noPieceClient">
                  {identifierLabel} *
                </Label>

                <div className="flex gap-2">
                  <Input
                    id="noPieceClient"
                    value={noPiece}
                    onChange={event =>
                      handleNoPieceChange(event.target.value)
                    }
                    onBlur={handleNoPieceBlur}
                    placeholder={identifierPlaceholder}
                    className={identifierInputClassName}
                    maxLength={getCustomerIdentifierMaxLength(
                      effectiveTypePiece,
                    )}
                    autoComplete="off"
                    aria-invalid={identifierHasError}
                    aria-describedby="client-identifier-feedback client-identifier-format"
                  />

                  <Button
                    type="submit"
                    size="icon"
                    variant="outline"
                    disabled={loading || !noPiece.trim()}
                    title="Rechercher le client"
                    aria-label={`Rechercher le client par ${identifierTypeLabel}`}
                  >
                    {loading ? (
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                      />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div
                  id="client-identifier-feedback"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {loading && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-blue-600">
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                      />
                      <span>Recherche en cours...</span>
                    </div>
                  )}

                  {displayedIdentifierError && !loading && (
                    <p className="mt-1 text-xs text-red-600">
                      ❌ {displayedIdentifierError}
                    </p>
                  )}

                  {!displayedIdentifierError
                    && !loading
                    && usesRneControl
                    && rneFeedback?.state === 'INCOMPLETE'
                    && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {rneFeedback.message}
                      </p>
                    )}

                  {clientNotFound
                    && !loading
                    && !displayedIdentifierError
                    && (
                      <p className="mt-1 text-xs text-red-600">
                        ❌ Client non trouvé pour ce numéro {usesRneControl ? 'RNE' : identifierTypeLabel}
                      </p>
                    )}

                  {clientFound && !loading && !displayedIdentifierError && (
                    <ClientSearchResult
                      client={client}
                      open={showFicheClient}
                      onOpenChange={setShowFicheClient}
                    />
                  )}
                </div>

                <p
                  id="client-identifier-format"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  {identifierHelp}
                </p>
              </div>
            </div>
          </form>

          {searchStatus === 'ERROR' && searchError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {agencyBlocked && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Aucune agence disponible pour ce client.</strong>{' '}
                Vous ne disposez pas d’une agence permettant d’initier cette
                opération pour ce client.
              </AlertDescription>
            </Alert>
          )}

          {clientFound && !agencyBlocked && eligibleAgencies.length > 0 && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="clientAgency">
                    Agence client *
                  </Label>

                  <select
                    id="clientAgency"
                    value={selectedClientAgency}
                    onChange={event => handleAgencyChange(event.target.value)}
                    disabled={loadingAccounts}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {eligibleAgencies.length > 1 && (
                      <option value="">
                        Sélectionner une agence
                      </option>
                    )}

                    {eligibleAgencies.map(agency => (
                      <option key={agency.code} value={agency.code}>
                        {agencyOptionLabel(agency)}
                      </option>
                    ))}
                  </select>

                  <p className="text-xs text-muted-foreground">
                    Sélectionnez l’agence dans laquelle l’opération sera
                    initiée. Les comptes disponibles seront chargés pour
                    cette agence.
                  </p>
                </div>

                {eligibleAgencies.length === 1 && (
                  <Badge variant="secondary" className="w-fit">
                    Agence unique disponible
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {client
        && searchStatus === 'SUCCESS'
        && eligibleAgencies.length > 1
        && !selectedClientAgency
        && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Plusieurs agences sont disponibles pour ce client. Sélectionnez
              l’agence dans laquelle l’opération doit être initiée.
            </AlertDescription>
          </Alert>
        )}

      {client
        && searchStatus === 'SUCCESS'
        && selectedClientAgency
        && (
          <>
            {!loadingAccounts
              && !accountsError
              && agencyAccounts.length === 0
              && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Aucun compte TND actif n’est disponible pour ce client
                    dans l’agence sélectionnée.
                  </AlertDescription>
                </Alert>
              )}

            {(loadingAccounts
              || Boolean(accountsError)
              || agencyAccounts.length > 0)
              && (
                <ClientAccountsTable
                  agencyCode={selectedClientAgency}
                  accounts={agencyAccounts}
                  loading={loadingAccounts}
                  error={accountsError}
                  commissionAccount={commissionAccount}
                  onCommissionAccountChange={onCommissionAccountChange}
                />
              )}
          </>
        )}
    </div>
  );
}