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
import { getUserMessage } from '../transfer.errors';
import type {
  BankClientBeneficiaryCandidate,
  CountryOption,
  PartyData,
} from '../transfer.types';
import { FI } from '../transfer.ui';
import { PartyForm } from './PartyForm';

type BeneficiaryEntryMode = 'MANUAL' | 'BANK_CLIENT';

interface BeneficiarySectionProps {
  value: PartyData;
  countries: CountryOption[];
  countriesLoading?: boolean;
  onChange: (value: PartyData) => void;
}

export function BeneficiarySection({
  value,
  countries,
  countriesLoading = false,
  onChange,
}: BeneficiarySectionProps) {
  const [mode, setMode] = useState<BeneficiaryEntryMode>('MANUAL');
  const [searchValue, setSearchValue] = useState(value.noPiece || '');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [candidates, setCandidates] = useState<
    BankClientBeneficiaryCandidate[]
  >([]);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState('');
  const requestSequenceRef = useRef(0);

  const changeMode = (nextMode: BeneficiaryEntryMode) => {
    setMode(nextMode);
    setSearchError('');

    if (nextMode === 'BANK_CLIENT' && !searchValue && value.noPiece) {
      setSearchValue(value.noPiece);
    }
  };

  const searchBeneficiary = async (event?: React.FormEvent) => {
    event?.preventDefault();

    const normalizedSearchValue = searchValue.trim().toUpperCase();

    if (!normalizedSearchValue) {
      setSearchError(
        'Renseignez un numéro de pièce ou identifiant client.',
      );
      setCandidates([]);
      setSearchPerformed(false);
      return;
    }

    const requestSequence = ++requestSequenceRef.current;
    setSearching(true);
    setSearchError('');
    setSearchPerformed(true);
    setSelectedCandidateKey('');

    try {
      const results = await searchBankClientBeneficiaries(
        { noPiece: normalizedSearchValue },
        countries,
      );

      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setCandidates(results);
    } catch (reason) {
      if (requestSequence !== requestSequenceRef.current) {
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
      if (requestSequence === requestSequenceRef.current) {
        setSearching(false);
      }
    }
  };

  const importCandidate = (
    candidate: BankClientBeneficiaryCandidate,
  ) => {
    if (!candidate.party) {
      return;
    }

    onChange(candidate.party);
    setSelectedCandidateKey(candidate.key);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bénéficiaire</CardTitle>
        <CardDescription>
          Sélectionnez un client de la banque ou renseignez le bénéficiaire
          manuellement. Les données utilisées dans l’opération restent
          modifiables.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mode de saisie du bénéficiaire">
          <Button
            type="button"
            variant={mode === 'MANUAL' ? 'default' : 'outline'}
            onClick={() => changeMode('MANUAL')}
          >
            <UserRound className="mr-2 h-4 w-4" />
            Saisie manuelle
          </Button>

          <Button
            type="button"
            variant={mode === 'BANK_CLIENT' ? 'default' : 'outline'}
            onClick={() => changeMode('BANK_CLIENT')}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Client de la banque
          </Button>
        </div>

        {mode === 'BANK_CLIENT' && (
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium">
                Rechercher un client de la banque
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pour cette première version, la recherche utilise le numéro
                de pièce ou l’identifiant client. La sélection reste explicite
                lorsqu’au moins un résultat est retourné.
              </p>
            </div>

            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]"
              onSubmit={searchBeneficiary}
            >
              <FI
                label="Numéro de pièce / identifiant client"
                value={searchValue}
                onChange={fieldValue => {
                  setSearchValue(fieldValue.toUpperCase());
                  setSearchError('');
                  setSearchPerformed(false);
                  setCandidates([]);
                  setSelectedCandidateKey('');
                }}
                placeholder="Ex. 07458963"
              />

              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={searching || countriesLoading}
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

            {countriesLoading && (
              <p className="text-xs text-muted-foreground">
                Chargement du référentiel pays avant la recherche…
              </p>
            )}

            {searchError && (
              <Alert variant="destructive">
                <AlertDescription>{searchError}</AlertDescription>
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
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Résultats ({candidates.length})
                </p>

                <div className="space-y-2">
                  {candidates.map(candidate => {
                    const selected = selectedCandidateKey === candidate.key;

                    return (
                      <div
                        key={candidate.key}
                        className="flex flex-col gap-3 rounded-lg border bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">
                            {candidate.nomRaison || 'Client sans libellé'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {beneficiaryIdentifierTypeLabel(
                              candidate.typePiece,
                              candidate.numericTypePiece,
                            )}
                            {' — '}
                            {candidate.noPiece || 'Identifiant non renseigné'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              Nationalité : {candidate.nationalite || '—'}
                            </span>
                            <span>
                              Référence client : {candidate.internalReference || '—'}
                            </span>
                          </div>

                          {!candidate.supported && (
                            <p className="text-xs text-destructive">
                              Le type de pièce retourné n’est pas encore pris
                              en charge par MS-TR.
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant={selected ? 'outline' : 'default'}
                          disabled={!candidate.supported}
                          onClick={() => importCandidate(candidate)}
                        >
                          {selected && (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          {selected ? 'Importé' : 'Importer'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedCandidateKey && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Les données disponibles correspondant aux champs du
                  bénéficiaire ont été importées dans l’ordre et restent
                  modifiables. Les champs non fournis par la recherche actuelle
                  — notamment ville, résidence, code postal et compte/IBAN —
                  doivent être complétés lorsqu’ils sont requis.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <PartyForm
          title="Informations du bénéficiaire"
          value={value}
          onChange={onChange}
          beneficiary
          countryLov
          countryOptions={countries}
          countryLoading={countriesLoading}
          countryRequired
        />
      </CardContent>
    </Card>
  );
}
