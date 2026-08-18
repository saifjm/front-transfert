import React, { useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Loader2,
  Search,
  UserRound,
} from 'lucide-react';

import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import {
  beneficiaryIdentifierTypeLabel,
  searchBankClientBeneficiaries,
} from '../transfer.beneficiary';
import {
  createEmptyCbprParty,
  getPrefilledCbprPartyLockedFields,
  normalizeCbprParty,
  type CbprPartyFieldPath,
} from '../transfer.cbpr-party';
import { getUserMessage } from '../transfer.errors';
import type {
  BankClientBeneficiaryCandidate,
  CbprPartyData,
  CountryOption,
} from '../transfer.types';
import { FI } from '../transfer.ui';
import { CbprPartyForm } from './CbprPartyForm';

type BeneficiaryEntryMode = 'MANUAL' | 'BANK_CLIENT';

interface BeneficiarySectionProps {
  value: CbprPartyData;
  countries: CountryOption[];
  countriesLoading?: boolean;
  onChange: (value: CbprPartyData) => void;
}

export function BeneficiarySection({
  value,
  countries,
  countriesLoading = false,
  onChange,
}: BeneficiarySectionProps) {
  const [mode, setMode] = useState<BeneficiaryEntryMode>('MANUAL');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [candidates, setCandidates] = useState<
    BankClientBeneficiaryCandidate[]
  >([]);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState('');
  const [lockedFields, setLockedFields] = useState<
    CbprPartyFieldPath[]
  >([]);

  const requestSequenceRef = useRef(0);

  const manualDraftRef = useRef<CbprPartyData>(
    normalizeCbprParty(value),
  );

  const handlePartyChange = (
    nextValue: CbprPartyData,
  ) => {
    onChange(nextValue);

    if (mode === 'MANUAL') {
      manualDraftRef.current = {
        ...nextValue,
      };
    }
  };

  const changeMode = (
    nextMode: BeneficiaryEntryMode,
  ) => {
    if (nextMode === mode) return;

    setSearchError('');

    if (nextMode === 'BANK_CLIENT') {
      manualDraftRef.current = normalizeCbprParty(value);

      onChange(createEmptyCbprParty());
    } else {
      onChange({
        ...manualDraftRef.current,
      });
    }

    setMode(nextMode);
    setSelectedCandidateKey('');
    setLockedFields([]);
    setCandidates([]);
    setSearchPerformed(false);
    setSearchValue('');
  };

  const searchBeneficiary = async (
    event?: React.FormEvent,
  ) => {
    event?.preventDefault();

    const normalizedSearchValue = String(
      searchValue ?? '',
    )
      .trim()
      .toUpperCase();

    if (!normalizedSearchValue) {
      setSearchError(
        'Renseignez un numéro de pièce ou identifiant client.',
      );
      setCandidates([]);
      setSearchPerformed(false);
      return;
    }

    const requestSequence =
      ++requestSequenceRef.current;

    setSearching(true);
    setSearchError('');
    setSearchPerformed(true);

    try {
      const results =
        await searchBankClientBeneficiaries(
          {
            noPiece: normalizedSearchValue,
          },
          countries,
        );

      if (
        requestSequence
        !== requestSequenceRef.current
      ) {
        return;
      }

      setCandidates(results);
    } catch (reason) {
      if (
        requestSequence
        !== requestSequenceRef.current
      ) {
        return;
      }

      setCandidates([]);
      setSearchError(
        getUserMessage(
          reason,
          'La recherche du bénéficiaire n’a pas pu aboutir.',
        ),
      );
    } finally {
      if (
        requestSequence
        === requestSequenceRef.current
      ) {
        setSearching(false);
      }
    }
  };

  const importCandidate = (
    candidate: BankClientBeneficiaryCandidate,
  ) => {
    if (!candidate.party) return;

    const importedParty: CbprPartyData =
      normalizeCbprParty(candidate.party);

    onChange(importedParty);
    setSelectedCandidateKey(candidate.key);

    // Every actual customer-file value is read-only except Nm.
    setLockedFields(
      getPrefilledCbprPartyLockedFields(
        importedParty,
      ),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bénéficiaire — Cdtr</CardTitle>
        <CardDescription>
          Structure CBPR+ avec saisie manuelle ou import d’un client de
          la banque.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={
              mode === 'MANUAL'
                ? 'default'
                : 'outline'
            }
            onClick={() => changeMode('MANUAL')}
          >
            <UserRound className="mr-2 h-4 w-4" />
            Saisie manuelle
          </Button>

          <Button
            type="button"
            variant={
              mode === 'BANK_CLIENT'
                ? 'default'
                : 'outline'
            }
            onClick={() =>
              changeMode('BANK_CLIENT')
            }
          >
            <Building2 className="mr-2 h-4 w-4" />
            Client de la banque
          </Button>
        </div>

        {mode === 'BANK_CLIENT' && (
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]"
              onSubmit={searchBeneficiary}
            >
              <FI
                label="Numéro de pièce / identifiant client"
                value={searchValue}
                onChange={fieldValue => {
                  setSearchValue(
                    String(fieldValue ?? '')
                      .toUpperCase(),
                  );
                  setSearchError('');
                  setSearchPerformed(false);
                  setCandidates([]);
                }}
                placeholder="Saisir l’identifiant"
              />

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={
                    searching
                    || countriesLoading
                  }
                >
                  {searching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Rechercher
                </Button>
              </div>
            </form>

            {searchError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {searchError}
                </AlertDescription>
              </Alert>
            )}

            {!searching
              && searchPerformed
              && !searchError
              && candidates.length === 0
              && (
                <Alert>
                  <AlertDescription>
                    Aucun client ne correspond à l’identifiant renseigné.
                  </AlertDescription>
                </Alert>
              )}

            {candidates.length > 0 && (
              <div className="space-y-2">
                {candidates.map(candidate => {
                  const selected =
                    selectedCandidateKey
                    === candidate.key;

                  return (
                    <div
                      key={candidate.key}
                      className="flex flex-col gap-3 rounded-lg border bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {candidate.nomRaison
                            || 'Client sans libellé'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {beneficiaryIdentifierTypeLabel(
                            candidate.typePiece,
                            candidate.numericTypePiece,
                          )}
                          {' — '}
                          {candidate.noPiece || '—'}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant={
                          selected
                            ? 'outline'
                            : 'default'
                        }
                        disabled={!candidate.supported}
                        onClick={() =>
                          importCandidate(candidate)
                        }
                      >
                        {selected && (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {selected
                          ? 'Importé'
                          : 'Importer'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedCandidateKey && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Les champs réellement importés depuis la fiche client
                  sont en lecture seule, sauf « Nom et prénom / Raison
                  sociale ». Les champs absents restent complétables.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <CbprPartyForm
          title="Informations du bénéficiaire"
          role="CREDITOR"
          value={normalizeCbprParty(value)}
          onChange={handlePartyChange}
          countries={countries}
          countriesLoading={countriesLoading}
          accountRequired
          countryRequired
          lockedFields={
            mode === 'BANK_CLIENT'
              ? lockedFields
              : []
          }
        />
      </CardContent>
    </Card>
  );
}
