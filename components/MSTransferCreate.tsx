import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Search,
  Send,
} from 'lucide-react';
import { getQuotedCurrencies } from './ms-transfer/transfer.api';
import {
  INITIAL_ORDER,
  INITIAL_REGULATORY_DATA,
  INITIAL_SUPPORT_DATA,
  MOCK_QUOTED_CURRENCIES,
} from './ms-transfer/transfer.mock';
import type {
  ClientData,
  Modality,
  QuotedCurrency,
  RegulatoryData,
  RegulatorySupportData,
  TransferInitiationSource,
  TransferNavigationHandler,
  TransferOrder,
  TransferSubmissionPayload,
  TransferType,
} from './ms-transfer/transfer.types';
import { HDR, TypeBadge } from './ms-transfer/transfer.ui';
import {
  calculateCoverage,
  clientToParty,
  isOrderComplete,
  isSupportComplete,
  requiresDebitAccount,
  requiresFinancingFile,
} from './ms-transfer/transfer.utils';
import { ClientSection } from './ms-transfer/sections/ClientSection';
import { NAVIGATION_ITEMS, SimpleSectionNavigation } from './ms-transfer/sections/SimpleSectionNavigation';
import { OrderSection } from './ms-transfer/sections/OrderSection';
import { PaymentModalitiesSection } from './ms-transfer/sections/PaymentModalitiesSection';
import { RecapSection } from './ms-transfer/sections/RecapSection';
import { RegulatoryDataSection } from './ms-transfer/sections/RegulatoryDataSection';
import { RegulatorySupportSection } from './ms-transfer/sections/RegulatorySupportSection';
import { SuccessModal } from './ms-transfer/sections/SuccessModal';
import { SummaryPanel } from './ms-transfer/sections/SummaryPanel';
import { TransferTypeSection } from './ms-transfer/sections/TransferTypeSection';

export interface MSTransferCreateProps {
  onNavigate?: TransferNavigationHandler;
}

const INITIATION_SOURCE: TransferInitiationSource = 'AGENCE';

export function MSTransferCreate({ onNavigate }: MSTransferCreateProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [transferType, setTransferType] = useState<TransferType | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [commissionAccount, setCommissionAccount] = useState('');
  const [quotedCurrencies, setQuotedCurrencies] = useState<QuotedCurrency[]>(MOCK_QUOTED_CURRENCIES);
  const [referenceError, setReferenceError] = useState('');
  const [order, setOrder] = useState<TransferOrder>(INITIAL_ORDER);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [regulatoryData, setRegulatoryData] = useState<RegulatoryData>(INITIAL_REGULATORY_DATA);
  const [support, setSupport] = useState<RegulatorySupportData>(INITIAL_SUPPORT_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    getQuotedCurrencies()
      .then(currencies => {
        if (active) setQuotedCurrencies(currencies);
      })
      .catch(reason => {
        if (active) setReferenceError('La liste des devises n’a pas pu être actualisée.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setModalities(current => current.map(modality => ({
      ...modality,
      deviseOrdre: order.deviseOrdre,
      coursIndicatif: order.coursConversion,
    })));
  }, [order.deviseOrdre, order.coursConversion]);

  const modalitiesComplete = () => {
    const coverage = calculateCoverage(modalities, order.montantOrdre);
    return modalities.length > 0
      && coverage.complete
      && modalities.every(modality => !requiresDebitAccount(modality.type) || Boolean(modality.compteADebiter))
      && modalities.every(modality => !requiresFinancingFile(modality.type) || Boolean(modality.dossierFinancementId))
      && modalities.every(modality => modality.fxRateMode === 'NORMAL' || Boolean(modality.coursSaisi));
  };

  const regulatoryComplete = () => Boolean(regulatoryData.codeNatureOperation)
    && (!regulatoryData.authorizationRequired || Boolean(regulatoryData.selectedAuthorizationId));

  const canProceed = () => {
    if (currentSection === 0) return transferType !== null;
    if (currentSection === 1) return client?.statut === 'ACTIF' && Boolean(commissionAccount);
    if (currentSection === 2) return isOrderComplete(order);
    if (currentSection === 3) return modalitiesComplete();
    if (currentSection === 4) return regulatoryComplete();
    if (currentSection === 5) return isSupportComplete(support);
    return true;
  };

  const resetForm = () => {
    setCurrentSection(0);
    setTransferType(null);
    setClient(null);
    setCommissionAccount('');
    setOrder(INITIAL_ORDER);
    setModalities([]);
    setRegulatoryData(INITIAL_REGULATORY_DATA);
    setSupport(INITIAL_SUPPORT_DATA);
    setSubmitting(false);
    setShowSuccess(false);
  };

  const openConsultation = () => {
    setShowSuccess(false);
    onNavigate?.('ms-tr-consultation');
  };

  const selectTransferType = (type: TransferType) => {
    setTransferType(type);
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
    const defaultCommissionAccount = loadedClient.comptes.find(account => account.devise === 'TND' && account.eligibleCommission)
      ?? loadedClient.comptes.find(account => account.eligibleCommission);
    setCommissionAccount(defaultCommissionAccount?.numero ?? '');
    setOrder(current => ({
      ...current,
      debtor: {
        ...clientToParty(loadedClient),
        compte: defaultCommissionAccount?.numero ?? '',
      },
    }));
    setRegulatoryData(INITIAL_REGULATORY_DATA);
    setSupport(current => ({ ...current, tceResult: null }));
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
    setCurrentSection(section => Math.min(NAVIGATION_ITEMS.length - 1, section + 1));
  };

  const buildSubmissionPayload = (): TransferSubmissionPayload | null => {
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
      sessionStorage.setItem('ms_tr_draft', JSON.stringify(payload));
    }
  };

  const handleSubmit = () => {
    const payload = buildSubmissionPayload();
    if (!payload) return;

    setSubmitting(true);
    // TODO: replace with the production submission call.
    window.setTimeout(() => {
      void payload;
      setSubmitting(false);
      setShowSuccess(true);
    }, 1200);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 page-transition">
      {showSuccess && (
        <SuccessModal
          transferType={transferType}
          onClose={openConsultation}
          onNew={resetForm}
        />
      )}

      <div className="rounded-2xl p-5 text-white anim-fade-in-up" style={HDR}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Send size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Dossier Transfert</h1>
              <p className="text-xs text-white/70 mt-0.5">
                Nouveau dossier — transfert initié en agence et émis vers l’étranger
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openConsultation}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/20 hover:bg-white/30 transition-all border border-white/20"
          >
            <Search size={15} />Consultation
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5 anim-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openConsultation}
              className="w-9 h-9 rounded-xl border border-[#d1dce6] hover:bg-[#F4F8FC] flex items-center justify-center transition-all"
              aria-label="Retour à la consultation"
            >
              <ArrowLeft size={16} className="text-[#435B7B]" />
            </button>
            <div>
              <h2 className="text-base font-bold text-[#2D3E54]">Saisie d’un ordre de transfert</h2>
              <p className="text-xs text-[#7A90A4]">Naviguez librement entre les rubriques du dossier.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F4F8FC] text-[#435B7B]">
              Origine : Agence
            </span>
            {transferType && <TypeBadge type={transferType} />}
          </div>
        </div>
      </div>

      {referenceError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{referenceError} La liste actuellement disponible reste utilisable.</p>
        </div>
      )}

      <SimpleSectionNavigation
        current={currentSection}
        transferType={transferType}
        client={client}
        onChange={setCurrentSection}
      />

      <div className={`flex gap-5 anim-fade-in-up delay-100 ${currentSection > 0 ? '' : 'justify-center'}`}>
        <div className="flex-1 min-w-0">
          {currentSection === 0 && (
            <TransferTypeSection selected={transferType} onSelect={selectTransferType} />
          )}

          {currentSection === 1 && (
            <ClientSection
              client={client}
              commissionAccount={commissionAccount}
              onClientLoaded={handleClientLoaded}
              onCommissionAccountChange={setCommissionAccount}
            />
          )}

          {currentSection === 2 && (
            <OrderSection
              order={order}
              client={client}
              quotedCurrencies={quotedCurrencies}
              onChange={setOrder}
            />
          )}

          {currentSection === 3 && (
            <PaymentModalitiesSection
              modalities={modalities}
              order={order}
              accounts={client?.comptes ?? []}
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

          {currentSection < NAVIGATION_ITEMS.length - 1 && (
            <div className="flex items-center justify-between mt-5">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d1dce6] text-sm font-semibold text-[#435B7B] hover:bg-[#F4F8FC] transition-all"
              >
                <ArrowLeft size={14} />
                {currentSection === 0 ? 'Consultation' : 'Précédent'}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                style={HDR}
              >
                Suivant <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {currentSection > 0 && (
          <SummaryPanel
            transferType={transferType}
            client={client}
            commissionAccount={commissionAccount}
            order={order}
            modalities={modalities}
            regulatoryData={regulatoryData}
            support={support}
            section={currentSection}
          />
        )}
      </div>
    </div>
  );
}
