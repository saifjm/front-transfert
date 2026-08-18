import { UserMessageError } from './transfer.errors';
import type {
  AgencyPartyCommand,
  AgencyPaymentModalityCommand,
  AgencyRegulatorySupportCommand,
  AgencyWorkflowCommandRequest,
} from './transfer.agency-initiation.contracts';
import { toBnaCustomerIdType } from './transfer.mappers';
import type {
  ClientData,
  Modality,
  PartyData,
  TransferSubmissionPayload,
} from './transfer.types';
import {
  determineCommercialNatureOperationBct,
  normalizeBctNatureCode,
} from './transfer.regulatory';
import { parseAmount } from './transfer.utils';

const COUNTRY_ALPHA2_TO_NUMERIC: Record<string, string> = {
  TN: '788',
  FR: '250',
  DE: '276',
  IT: '380',
  ES: '724',
  GB: '826',
  US: '840',
  AE: '784',
  SA: '682',
  QA: '634',
};

const CATEGORY_PURPOSE_COMPATIBILITY: Record<string, string> = {
  SUPP: 'SUPP',
  GDDS: 'SUPP',
  SVCS: 'SUPP',
  FEES: 'SUPP',
  SALA: 'SALA',
  DIVD: 'DIVD',
};

function requiredText(value: unknown, label: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new UserMessageError(`${label} est obligatoire.`);
  }
  return normalized;
}


function toIsoDate(value: string, label: string): string {
  const normalized = requiredText(value, label);

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const frenchDate = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frenchDate) {
    return `${frenchDate[3]}-${frenchDate[2]}-${frenchDate[1]}`;
  }

  throw new UserMessageError(
    `${label} doit respecter le format AAAA-MM-JJ ou JJ/MM/AAAA.`,
  );
}

function toCustomerId(value: string): number | undefined {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return undefined;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function toPartyType(party: PartyData): 'ORG' | 'INDV' {
  return party.type === 'PERSONNE_PHYSIQUE' ? 'INDV' : 'ORG';
}

function normalizeCountryAlpha2(value: string, label: string): string {
  const normalized = requiredText(value, label).toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new UserMessageError(`${label} doit contenir un code pays alpha-2.`);
  }
  return normalized;
}

function toCountryNumeric(value: string): string {
  const normalized = value.trim().toUpperCase();

  if (/^\d{3}$/.test(normalized)) return normalized;

  const mapped = COUNTRY_ALPHA2_TO_NUMERIC[normalized];
  if (!mapped) {
    throw new UserMessageError(
      `Aucune correspondance pays BCT n'est configurée pour ${normalized}.`,
    );
  }

  return mapped;
}

function isIban(value: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(
    value.replace(/\s/g, '').toUpperCase(),
  );
}

function mapDebtor(
  client: ClientData,
  accountNumber: string,
  accountCurrency: string,
): AgencyPartyCommand {
  const party = client.typeClient === 'PERSONNE_PHYSIQUE'
    ? 'INDV'
    : 'ORG';

  return {
    partyRole: 'DBTR',
    partyType: party,
    sequenceNo: 1,
    customerId: toCustomerId(client.idClient),
    externalPartyRef: client.noPiece,
    identificationType: String(toBnaCustomerIdType(client.typePiece)),
    identificationValue: client.noPiece,
    name: requiredText(client.nomRaison, 'Le nom du donneur d’ordre'),
    countryCode: normalizeCountryAlpha2(
      client.codePays,
      'Le pays du donneur d’ordre',
    ),
    residencyStatus: client.resident ? 'RESIDENT' : 'NON_RESIDENT',
    accountCurrency,
    accountName: 'Compte donneur d’ordre',
    accountNumber,
  };
}

function mapCreditor(payload: TransferSubmissionPayload): AgencyPartyCommand {
  const beneficiary = payload.order.beneficiary;
  const account = requiredText(
    beneficiary.compte,
    'Le compte du bénéficiaire',
  ).replace(/\s/g, '').toUpperCase();

  return {
    partyRole: 'CDTR',
    partyType: toPartyType(beneficiary),
    sequenceNo: 2,
    name: requiredText(beneficiary.nomRaison, 'Le nom du bénéficiaire'),
    countryCode: normalizeCountryAlpha2(
      beneficiary.codePays,
      'Le pays du bénéficiaire',
    ),
    residencyStatus:
      beneficiary.residence === 'RESIDENT'
        ? 'RESIDENT'
        : 'NON_RESIDENT',
    ...(isIban(account)
      ? { accountIban: account }
      : { accountNumber: account }),
    accountCurrency: requiredText(
      payload.order.deviseTransfert,
      'La devise du transfert',
    ).toUpperCase(),
    accountName: beneficiary.nomRaison,
  };
}

function mapCreditorAgent(payload: TransferSubmissionPayload): AgencyPartyCommand {
  const bank = payload.order.beneficiaryBank;

  return {
    partyRole: 'CDTR_AGT',
    partyType: 'BANK',
    sequenceNo: 3,
    name: requiredText(bank.nom, 'Le nom de la banque bénéficiaire'),
    bic: requiredText(bank.bicfi, 'Le BIC de la banque bénéficiaire')
      .toUpperCase(),
    bankName: bank.nom,
    bankCountryCode: normalizeCountryAlpha2(
      bank.codePays,
      'Le pays de la banque bénéficiaire',
    ),
  };
}

function resolveModalityType(modality: Modality): string {
  if (
    modality.type === 'ACHAT_DEVISE_COMPTE_TND'
    && modality.fxRateMode === 'NORMAL'
  ) {
    return 'TND_FX_PURCHASE_NORMAL';
  }

  throw new UserMessageError(
    `La modalité ${modality.type}/${modality.fxRateMode} n'est pas encore raccordée à AgencyIntegrationApi.`,
  );
}

function mapPaymentModality(
  modality: Modality,
  index: number,
  orderAmount: number,
  transferCurrency: string,
): AgencyPaymentModalityCommand {
  const coveredAmount = parseAmount(modality.montant);
  if (coveredAmount <= 0) {
    throw new UserMessageError(
      `Le montant de la modalité ${index + 1} doit être strictement positif.`,
    );
  }

  const coveragePercentage = Number(
    ((coveredAmount / orderAmount) * 100).toFixed(6),
  );

  const debitAccountNumber = requiredText(
    modality.compteADebiter,
    `Le compte à débiter de la modalité ${index + 1}`,
  );

  return {
    sequenceNo: index + 1,
    modalityType: resolveModalityType(modality),
    valueDate: toIsoDate(
      modality.dateValeur,
      `La date de valeur de la modalité ${index + 1}`,
    ),
    coveragePercentage,
    // Agency initiation creates a draft. Final covered amounts are calculated
    // and secured later; no blocking or reservation is executed here.
    coveredTransferAmount: null,
    coveredTransferCurrency: transferCurrency,
    debitAccountNumber,
    debitAccountCurrency: requiredText(
      modality.deviseCompte,
      `La devise du compte de la modalité ${index + 1}`,
    ).toUpperCase(),
    debitAmount: null,
    fxRequired: 'Y',
    fxType: 'NORMAL',
    fxRate: null,
    resourceType: 'ACCOUNT',
    resourceReference: debitAccountNumber,
    blockingRequired: modality.blocage ? 'Y' : 'N',
  };
}


function mapBctNatureCode(
  payload: TransferSubmissionPayload,
): string {
  const receivedCode = normalizeBctNatureCode(
    payload.regulatoryData.codeNatureOperationBct,
  );

  if (payload.transferType === 'commercial') {
    const calculatedCode = determineCommercialNatureOperationBct(
      payload.order.commercialValuationBasis,
    );

    // When calculable, use the authoritative frontend rule result.
    // When not calculable, keep the value optional/non-blocking.
    return calculatedCode ?? receivedCode;
  }

  return receivedCode;
}

function mapRegulatorySupport(
  payload: TransferSubmissionPayload,
  allocation: import('./transfer.types').TceAllocation,
  index: number,
): AgencyRegulatorySupportCommand {
  const supportNumber = requiredText(
    allocation.numDomi,
    `Le numéro de domiciliation TCE ${index + 1}`,
  );
  const supportDate = toIsoDate(
    allocation.dateDomi,
    `La date de domiciliation TCE ${index + 1}`,
  );
  const beneficiaryCountry =
    payload.order.beneficiaryBank.codePays
    || payload.order.beneficiary.codePays;

  if (
    allocation.verificationState !== 'success'
    || !allocation.appartient
  ) {
    throw new UserMessageError(
      `Le TCE ${supportNumber} doit être vérifié et appartenir au client.`,
    );
  }

  const allocatedAmount = parseAmount(allocation.montantAffecte);
  if (allocatedAmount <= 0) {
    throw new UserMessageError(
      `Le montant affecté au TCE ${supportNumber} doit être strictement positif.`,
    );
  }

  const availableAmount = parseAmount(
    allocation.montantDisponibleControle,
  );
  if (availableAmount > 0 && allocatedAmount > availableAmount) {
    throw new UserMessageError(
      `Le montant affecté au TCE ${supportNumber} dépasse le disponible constaté.`,
    );
  }

  return {
    sequenceNo: index + 1,
    typeSupport: 'TCE',
    codeSupportBct: 3,
    codeTitre: requiredText(
      allocation.codeTitre,
      `Le code titre TCE ${index + 1}`,
    ),
    numSupport: supportNumber,
    dateSupport: supportDate,
    numIdentification: supportNumber,
    dateIdentification: supportDate,
    codeNatureOperation: mapBctNatureCode(payload),
    codePays: toCountryNumeric(beneficiaryCountry),
    codeRd: '10',
    modeReglement: 1,
    deviseSupport: requiredText(
      allocation.devise || payload.order.deviseOrdre,
      `La devise du TCE ${index + 1}`,
    ).toUpperCase(),
    // The frontend sends one amount per attached title. Reservation and the
    // authoritative remaining amount are still re-checked by the backend.
    montantUtiliseCourant: allocatedAmount,
    montantTnd: null,
    coursConversion: null,
  };
}

function mapRegulatorySupports(
  payload: TransferSubmissionPayload,
): AgencyRegulatorySupportCommand[] {
  if (payload.regulatorySupport.type !== 'TCE') {
    throw new UserMessageError(
      "La première intégration Agency Initiation couvre uniquement un transfert commercial adossé à un TCE.",
    );
  }

  const allocations = payload.regulatorySupport.tceAllocations;
  if (!allocations.length) {
    throw new UserMessageError(
      'Au moins un TCE doit être rattaché avant la création du brouillon agence.',
    );
  }

  const seen = new Set<string>();
  allocations.forEach(allocation => {
    const key = [
      allocation.codeTitre.trim().toUpperCase(),
      allocation.numDomi.trim().toUpperCase(),
      allocation.dateDomi.trim(),
    ].join('|');

    if (seen.has(key)) {
      throw new UserMessageError(
        `Le TCE ${allocation.numDomi} est rattaché plusieurs fois.`,
      );
    }
    seen.add(key);
  });

  return allocations.map((allocation, index) =>
    mapRegulatorySupport(payload, allocation, index)
  );
}

export function buildAgencyInitiationCommand(
  payload: TransferSubmissionPayload,
  operationRef: string | null = null,
): AgencyWorkflowCommandRequest {
  if (payload.initiationSource !== 'AGENCE') {
    throw new UserMessageError(
      "AgencyIntegrationApi ne traite que les initiations effectuées en agence.",
    );
  }

  if (payload.transferType !== 'commercial') {
    throw new UserMessageError(
      "La première intégration Agency Initiation couvre uniquement le transfert commercial TCE.",
    );
  }

  const orderAmount = parseAmount(payload.order.montantOrdre);
  if (orderAmount <= 0) {
    throw new UserMessageError(
      "Le montant de l'ordre doit être strictement positif.",
    );
  }

  if (!payload.modalities.length) {
    throw new UserMessageError(
      'Au moins une modalité de paiement est obligatoire.',
    );
  }

  const orderCurrency = requiredText(
    payload.order.deviseOrdre,
    "La devise de l'ordre",
  ).toUpperCase();
  const transferCurrency = requiredText(
    payload.order.deviseTransfert,
    'La devise du transfert',
  ).toUpperCase();

  const debitAccount = payload.modalities[0]?.compteADebiter
    || payload.order.debtor.compte
    || payload.commissionAccount;
  const debitAccountCurrency = payload.modalities[0]?.deviseCompte
    || 'TND';

  const categoryPurposeCode =
    CATEGORY_PURPOSE_COMPATIBILITY[
      payload.order.purposeCode.trim().toUpperCase()
    ]
    || payload.order.purposeCode.trim().toUpperCase();

  return {
    operationRef,
    transferType: 'C',
    transferInstruction: {
      orderAmount,
      orderCurrency,
      transferCurrency,
      valueDate: toIsoDate(payload.order.dateValeur, 'La date valeur'),
      swiftPriority: 'N',
      serviceLevelCode: requiredText(
        payload.order.serviceLevel,
        "Le niveau de service",
      ).toUpperCase(),
      categoryPurposeCode: requiredText(
        categoryPurposeCode,
        'La catégorie du paiement',
      ),
      purposeCode: mapBctNatureCode(payload),
      purposeProprietary: requiredText(
        payload.order.motifPaiement,
        'Le motif de paiement',
      ),
      remittanceUnstructured:
        payload.order.refFacture.trim()
        || payload.order.observations.trim()
        || payload.order.motifPaiement.trim(),
      chargeBearer: requiredText(
        payload.order.chargeBearer,
        'La répartition des frais',
      ).toUpperCase(),
      noCompteCommission: requiredText(
        payload.commissionAccount,
        'Le compte de commission',
      ),
    },
    parties: {
      parties: [
        mapDebtor(
          {
            idClient: payload.clientId,
            noPiece: payload.clientNoPiece,
            typePiece: payload.clientTypePiece,
            nomRaison: payload.order.debtor.nomRaison,
            typeClient: payload.order.debtor.type,
            resident: payload.order.debtor.residence === 'RESIDENT',
            residence: payload.order.debtor.residence,
            pays: payload.order.debtor.pays,
            codePays: payload.order.debtor.codePays,
            ville: payload.order.debtor.townName,
            adresse: payload.order.debtor.adresseLigne1,
            agence: '',
            codeAgence: '',
            statut: 'ACTIF',
            niveauRisque: 'MOYEN',
            totalementExportatrice: false,
            comptes: [],
          },
          requiredText(debitAccount, 'Le compte du donneur d’ordre'),
          debitAccountCurrency.toUpperCase(),
        ),
        mapCreditor(payload),
        mapCreditorAgent(payload),
      ],
    },
    paymentModalities: {
      modalities: payload.modalities.map((modality, index) =>
        mapPaymentModality(
          modality,
          index,
          orderAmount,
          transferCurrency,
        ),
      ),
    },
    regulatorySupports: {
      supports: mapRegulatorySupports(payload),
    },
  };
}
