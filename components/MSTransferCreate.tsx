import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Loader2,
  RotateCcw,
  Search,
  Send,
} from 'lucide-react';

import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

import {
  createAgencyInitiationIdempotencyKey,
  getCountries,
  getQuotedCurrencies,
  submitAgencyInitiation,
} from './ms-transfer/transfer.api';
import {
  INITIAL_ORDER,
  INITIAL_REGULATORY_DATA,
  INITIAL_SUPPORT_DATA,
  MOCK_QUOTED_CURRENCIES,
} from './ms-transfer/transfer.mock';
import { getUserMessage } from './ms-transfer/transfer.errors';
import {
  isCommissionAccountValid,
  type ClientAgencyOption,
} from './ms-transfer/transfer.client-agency';
import type {
  AccountRow,
  AgencyInitiationResult,
  ClientData,
  CountryOption,
  Modality,
  PartyData,
  QuotedCurrency,
  RegulatoryData,
  RegulatorySupportData,
  TransferInitiationSource,
  TransferNavigationHandler,
  TransferOrder,
  TransferSubmissionPayload,
  TransferType,
} from './ms-transfer/transfer.types';
import { TypeBadge } from './ms-transfer/transfer.ui';
import {
  calculateCoverage,
  clientToParty,
  isOrderComplete,
  isSupportComplete,
  requiresDebitAccount,
  requiresFinancingFile,
} from './ms-transfer/transfer.utils';
import { ClientSection } from './ms-transfer/sections/ClientSection';
import {
  NAVIGATION_ITEMS,
  SimpleSectionNavigation,
} from './ms-transfer/sections/SimpleSectionNavigation';
import { OrderSection } from './ms-transfer/sections/OrderSection';
import { PaymentModalitiesSection } from './ms-transfer/sections/PaymentModalitiesSection';
import { RecapSection } from './ms-transfer/sections/RecapSection';
import { RegulatoryDataSection } from './ms-transfer/sections/RegulatoryDataSection';
import { RegulatorySupportSection } from './ms-transfer/sections/RegulatorySupportSection';
import { SuccessModal } from './ms-transfer/sections/SuccessModal';
import { TransferTypeSection } from './ms-transfer/sections/TransferTypeSection';

export interface MSTransferCreateProps {
  onNavigate?: TransferNavigationHandler;
}

const INITIATION_SOURCE: TransferInitiationSource = 'AGENCE';

function clearModalityAccountSelection(modality: Modality): Modality {
  return {
    ...modality,
    compteADebiter: '',
    deviseCompte: '',
    montantDebit: '',
  };
}

export function MSTransferCreate({ onNavigate }: MSTransferCreateProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [transferType, setTransferType] =
    useState<TransferType | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [eligibleClientAgencies, setEligibleClientAgencies] = useState<
    ClientAgencyOption[]
  >([]);
  const [selectedClientAgency, setSelectedClientAgency] = useState('');
  const [clientAgencyAccounts, setClientAgencyAccounts] = useState<
    AccountRow[]
  >([]);
  const [commissionAccount, setCommissionAccount] = useState('');
  const [quotedCurrencies, setQuotedCurrencies] = useState<
    QuotedCurrency[]
  >(MOCK_QUOTED_CURRENCIES);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countryReferenceError, setCountryReferenceError] = useState('');
  const [referenceError, setReferenceError] = useState('');
  const [order, setOrder] = useState<TransferOrder>(INITIAL_ORDER);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [regulatoryData, setRegulatoryData] =
    useState<RegulatoryData>(INITIAL_REGULATORY_DATA);
  const [support, setSupport] =
    useState<RegulatorySupportData>(INITIAL_SUPPORT_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<AgencyInitiationResult | null>(null);
  const [submissionError, setSubmissionError] = useState('');
  const idempotencyKeyRef = useRef(
    createAgencyInitiationIdempotencyKey(),
  );
  const previousCommissionAccountRef = useRef('');

  useEffect(() => {
    let active = true;

    getQuotedCurrencies()
      .then(currencies => {
        if (active) setQuotedCurrencies(currencies);
      })
      .catch(() => {
        if (active) {
          setReferenceError(
            'La liste des devises n’a pas pu être actualisée.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setCountriesLoading(true);
    setCountryReferenceError('');

    getCountries()
      .then(countryOptions => {
        if (active) {
          setCountries(countryOptions);
        }
      })
      .catch(() => {
        if (active) {
          setCountries([]);
          setCountryReferenceError(
            'La liste des pays n’a pas pu être chargée.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setCountriesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setModalities(current =>
      current.map(modality => ({
        ...modality,
        deviseOrdre: order.deviseOrdre,
        coursIndicatif: order.coursConversion,
      })),
    );
  }, [order.deviseOrdre, order.coursConversion]);

  const modalitiesComplete = () => {
    const coverage = calculateCoverage(
      modalities,
      order.montantOrdre,
    );

    return (
      modalities.length > 0 &&
      coverage.complete &&
      modalities.every(
        modality =>
          !requiresDebitAccount(modality.type) ||
          Boolean(modality.compteADebiter),
      ) &&
      modalities.every(
        modality =>
          !requiresFinancingFile(modality.type) ||
          Boolean(modality.dossierFinancementId),
      ) &&
      modalities.every(
        modality =>
          modality.fxRateMode === 'NORMAL' ||
          Boolean(modality.coursSaisi),
      )
    );
  };

  const regulatoryComplete = () =>
    Boolean(regulatoryData.codeNatureOperation) &&
    (!regulatoryData.authorizationRequired ||
      Boolean(regulatoryData.selectedAuthorizationId));

  const partyCountryIsValid = (
    party: PartyData,
    required: boolean,
  ) => {
    if (!party.codePays && !party.pays) {
      return !required;
    }

    if (!party.codePays || !party.pays) {
      return false;
    }

    return countries.some(
      country =>
        country.alpha2 === party.codePays
        && country.label === party.pays,
    );
  };

  const orderPartyCountriesAreValid = () => (
    partyCountryIsValid(order.debtor, true)
    && partyCountryIsValid(order.beneficiary, true)
    && (
      !order.ultimateDebtorEnabled
      || partyCountryIsValid(order.ultimateDebtor, true)
    )
    && (
      !order.ultimateCreditorEnabled
      || partyCountryIsValid(order.ultimateCreditor, true)
    )
  );

  const debtorAccountIsValid = () => (
    Boolean(order.debtor.compte)
    && clientAgencyAccounts.some(
      account =>
        account.numero === order.debtor.compte
        && account.codeAgence === selectedClientAgency
        && account.statut === 'ACTIF',
    )
  );

  const canProceed = () => {
    if (currentSection === 0) return transferType !== null;
    if (currentSection === 1) {
      return (
        Boolean(client)
        && client?.statut !== 'SUSPENDU'
        && client?.statut !== 'CLOTURE'
        && Boolean(selectedClientAgency)
        && isCommissionAccountValid(
          clientAgencyAccounts,
          selectedClientAgency,
          commissionAccount,
        )
      );
    }
    if (currentSection === 2) {
      return (
        isOrderComplete(order)
        && !countriesLoading
        && orderPartyCountriesAreValid()
        && debtorAccountIsValid()
      );
    }
    if (currentSection === 3) return modalitiesComplete();
    if (currentSection === 4) return regulatoryComplete();
    if (currentSection === 5) return isSupportComplete(support);
    return true;
  };

  const resetForm = () => {
    setCurrentSection(0);
    setTransferType(null);
    setClient(null);
    setEligibleClientAgencies([]);
    setSelectedClientAgency('');
    setClientAgencyAccounts([]);
    setCommissionAccount('');
    previousCommissionAccountRef.current = '';
    setOrder(INITIAL_ORDER);
    setModalities([]);
    setRegulatoryData(INITIAL_REGULATORY_DATA);
    setSupport(INITIAL_SUPPORT_DATA);
    setSubmitting(false);
    setShowSuccess(false);
    setSubmissionResult(null);
    setSubmissionError('');
    idempotencyKeyRef.current = createAgencyInitiationIdempotencyKey();
  };

  const openConsultation = () => {
    setShowSuccess(false);
    onNavigate?.('ms-tr-consultation');
  };

  const selectTransferType = (type: TransferType) => {
    setTransferType(type);
    setEligibleClientAgencies([]);
    setSelectedClientAgency('');
    setClientAgencyAccounts([]);
    setCommissionAccount('');
    previousCommissionAccountRef.current = '';
    setModalities(current => current.map(clearModalityAccountSelection));
    setRegulatoryData(INITIAL_REGULATORY_DATA);
    setSupport({
      ...INITIAL_SUPPORT_DATA,
      type: type === 'financier' ? 'FI' : null,
      ficheInformation: {
        ...INITIAL_SUPPORT_DATA.ficheInformation,
        devise: order.deviseOrdre,
      },
    });
    setCurrentSection(1);
  };

  const handleClientLoaded = (loadedClient: ClientData) => {
    setClient(loadedClient);
    setSelectedClientAgency('');
    setClientAgencyAccounts([]);
    setCommissionAccount('');
    previousCommissionAccountRef.current = '';

    setOrder(current => ({
      ...current,
      debtor: {
        ...clientToParty(loadedClient),
        compte: '',
      },
    }));
    setModalities(current => current.map(clearModalityAccountSelection));

    setRegulatoryData(INITIAL_REGULATORY_DATA);
    setSupport(current => ({ ...current, tceResult: null }));
  };

  const handleClientAgencyChange = (agencyCode: string) => {
    previousCommissionAccountRef.current = '';
    setSelectedClientAgency(agencyCode);
    setClientAgencyAccounts([]);
    setCommissionAccount('');
    setOrder(current => ({
      ...current,
      debtor: {
        ...current.debtor,
        compte: '',
      },
    }));
    setModalities(current => current.map(clearModalityAccountSelection));
  };

  const handleCommissionAccountChange = (accountNumber: string) => {
    const previousCommissionAccount =
      previousCommissionAccountRef.current;

    setCommissionAccount(accountNumber);

    setOrder(current => {
      const currentDebtorAccount = current.debtor.compte;
      const shouldApplyCommissionAsDefault =
        !currentDebtorAccount
        || currentDebtorAccount === previousCommissionAccount;

      return {
        ...current,
        debtor: {
          ...current.debtor,
          compte: shouldApplyCommissionAsDefault
            ? accountNumber
            : currentDebtorAccount,
        },
      };
    });

    previousCommissionAccountRef.current = accountNumber;
  };

  const handleAgencyAccountsChange = (accounts: AccountRow[]) => {
    setClientAgencyAccounts(accounts);

    setOrder(current => {
      const currentDebtorAccount = current.debtor.compte;
      const currentAccountStillAvailable =
        Boolean(currentDebtorAccount)
        && accounts.some(
          account =>
            account.numero === currentDebtorAccount
            && account.codeAgence === selectedClientAgency
            && account.statut === 'ACTIF',
        );

      if (currentAccountStillAvailable) {
        return current;
      }

      const commissionAccountAvailable =
        Boolean(commissionAccount)
        && accounts.some(
          account =>
            account.numero === commissionAccount
            && account.codeAgence === selectedClientAgency
            && account.statut === 'ACTIF',
        );

      return {
        ...current,
        debtor: {
          ...current.debtor,
          compte: commissionAccountAvailable
            ? commissionAccount
            : '',
        },
      };
    });
  };



  const handleClientCleared = () => {
    setClient(null);
    setEligibleClientAgencies([]);
    setSelectedClientAgency('');
    setClientAgencyAccounts([]);
    setCommissionAccount('');
    previousCommissionAccountRef.current = '';
    setOrder(current => ({
      ...current,
      debtor: { ...INITIAL_ORDER.debtor },
    }));
    setModalities(current => current.map(clearModalityAccountSelection));
    setRegulatoryData(INITIAL_REGULATORY_DATA);
    setSupport(current => ({
      ...current,
      tceResult: null,
    }));
  };

  const handlePrevious = () => {
    if (currentSection === 0) {
      openConsultation();
      return;
    }

    setCurrentSection(section => section - 1);
  };

  const handleNext = () => {
    if (!canProceed()) return;

    setCurrentSection(section =>
      Math.min(NAVIGATION_ITEMS.length - 1, section + 1),
    );
  };

  const buildSubmissionPayload =
    (): TransferSubmissionPayload | null => {
      if (!transferType || !client) return null;

      return {
        initiationSource: INITIATION_SOURCE,
        transferType,
        clientId: client.idClient,
        clientTypePiece: client.typePiece,
        clientNoPiece: client.noPiece,
        commissionAccount,
        order,
        modalities,
        regulatoryData,
        regulatorySupport: support,
      };
    };

  const handleSaveDraft = () => {
    const payload = buildSubmissionPayload();

    if (payload) {
      sessionStorage.setItem(
        'ms_tr_draft',
        JSON.stringify({
          ...payload,
          clientAgencyCode: selectedClientAgency,
        }),
      );
    }
  };

  const handleSubmit = async () => {
    const payload = buildSubmissionPayload();
    if (!payload) return;

    if (!selectedClientAgency) {
      setSubmissionError(
        'Sélectionnez une agence client autorisée avant de créer le brouillon.',
      );
      return;
    }

    setSubmitting(true);
    setSubmissionError('');

    try {
      const result = await submitAgencyInitiation(payload, {
        operationRef: null,
        idempotencyKey: idempotencyKeyRef.current,
        branchCode: selectedClientAgency,
      });

      setSubmissionResult(result);
      setShowSuccess(true);

      // A future retry after a successful creation must target a new command.
      idempotencyKeyRef.current = createAgencyInitiationIdempotencyKey();
    } catch (reason) {
      setSubmissionError(
        getUserMessage(
          reason,
          "Le brouillon agence n'a pas pu être créé. Vérifiez les données puis réessayez.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white/95 backdrop-blur-sm">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-xl font-semibold tracking-wide text-foreground">
            Création du brouillon agence en cours...
          </p>
        </div>
      )}

      <SuccessModal
        open={showSuccess}
        transferType={transferType}
        result={submissionResult}
        onClose={openConsultation}
        onNew={resetForm}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Dossier Transfert
            </h1>
            <Badge variant="outline">Origine : Agence</Badge>
            {transferType && <TypeBadge type={transferType} />}
          </div>
          <p className="mt-1 text-muted-foreground">
            Saisie d’un transfert commercial ou financier émis vers
            l’étranger
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={openConsultation}
          >
            <Search className="mr-2 h-4 w-4" />
            Consultation
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </div>

      {referenceError && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {referenceError} La liste actuellement disponible reste
            utilisable.
          </AlertDescription>
        </Alert>
      )}

      {countryReferenceError && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {countryReferenceError} Les pays des intervenants doivent être
            sélectionnés dans la liste disponible avant de poursuivre.
          </AlertDescription>
        </Alert>
      )}

      {submissionError && (
        <Alert variant="destructive">
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      <SimpleSectionNavigation
        current={currentSection}
        transferType={transferType}
        client={client}
        onChange={setCurrentSection}
      />

      <div className="space-y-6">
        {currentSection === 0 && (
          <TransferTypeSection
            selected={transferType}
            onSelect={selectTransferType}
          />
        )}

        {currentSection === 1 && transferType && (
          <ClientSection
            transferType={transferType}
            client={client}
            eligibleAgencies={eligibleClientAgencies}
            selectedClientAgency={selectedClientAgency}
            agencyAccounts={clientAgencyAccounts}
            commissionAccount={commissionAccount}
            onClientLoaded={handleClientLoaded}
            onClientCleared={handleClientCleared}
            onEligibleAgenciesChange={setEligibleClientAgencies}
            onClientAgencyChange={handleClientAgencyChange}
            onAgencyAccountsChange={handleAgencyAccountsChange}
            onCommissionAccountChange={handleCommissionAccountChange}
          />
        )}

        {currentSection === 2 && (
          <OrderSection
            order={order}
            client={client}
            quotedCurrencies={quotedCurrencies}
            countries={countries}
            countriesLoading={countriesLoading}
            clientAccounts={clientAgencyAccounts}
            commissionAccount={commissionAccount}
            onChange={setOrder}
          />
        )}

        {currentSection === 3 && (
          <PaymentModalitiesSection
            modalities={modalities}
            order={order}
            accounts={clientAgencyAccounts}
            onChange={setModalities}
          />
        )}

        {currentSection === 4 && (
          <RegulatoryDataSection
            client={client}
            value={regulatoryData}
            onChange={setRegulatoryData}
          />
        )}

        {currentSection === 5 && (
          <RegulatorySupportSection
            transferType={transferType}
            client={client}
            order={order}
            value={support}
            onChange={setSupport}
          />
        )}

        {currentSection === 6 && (
          <RecapSection
            transferType={transferType}
            client={client}
            commissionAccount={commissionAccount}
            order={order}
            modalities={modalities}
            regulatoryData={regulatoryData}
            support={support}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </div>

      {currentSection < NAVIGATION_ITEMS.length - 1 && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentSection === 0
                ? 'Retour à la consultation'
                : 'Précédent'}
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
