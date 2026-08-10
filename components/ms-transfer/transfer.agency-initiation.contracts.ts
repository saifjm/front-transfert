export type AgencyTransferTypeCode = 'C' | 'F';
export type AgencyPartyType = 'ORG' | 'INDV' | 'BANK';
export type AgencyPartyRole = 'DBTR' | 'CDTR' | 'CDTR_AGT';
export type YesNoCode = 'Y' | 'N';

export interface AgencyTransferInstructionCommand {
  orderAmount: number;
  orderCurrency: string;
  transferCurrency: string;
  valueDate: string;
  swiftPriority: string;
  serviceLevelCode: string;
  categoryPurposeCode: string;
  purposeCode: string;
  purposeProprietary: string;
  remittanceUnstructured: string;
  chargeBearer: string;
  noCompteCommission: string;
}

export interface AgencyPartyCommand {
  partyRole: AgencyPartyRole;
  partyType: AgencyPartyType;
  sequenceNo: number;
  customerId?: number;
  externalPartyRef?: string;
  identificationType?: string;
  identificationValue?: string;
  name: string;
  countryCode?: string;
  residencyStatus?: 'RESIDENT' | 'NON_RESIDENT';
  accountIban?: string;
  accountNumber?: string;
  accountCurrency?: string;
  accountName?: string;
  bic?: string;
  bankName?: string;
  bankCountryCode?: string;
}

export interface AgencyPaymentModalityCommand {
  sequenceNo: number;
  modalityType: string;
  coveragePercentage: number;
  coveredTransferAmount: number | null;
  coveredTransferCurrency: string;
  debitAccountNumber: string | null;
  debitAccountCurrency: string | null;
  debitAmount: number | null;
  fxRequired: YesNoCode;
  fxType: 'NORMAL' | 'NEGOTIATED' | 'FORWARD' | null;
  fxRate: number | null;
  resourceType: string;
  resourceReference: string | null;
  blockingRequired: YesNoCode;
}

export interface AgencyRegulatorySupportCommand {
  sequenceNo: number;
  typeSupport: string;
  codeSupportBct: number;
  codeTitre: string;
  numSupport: string;
  dateSupport: string;
  numIdentification: string;
  dateIdentification: string;
  codeNatureOperation: string;
  codePays: string;
  codeRd: string;
  modeReglement: number;
  deviseSupport: string;
  montantUtiliseCourant: number | null;
  montantTnd: number | null;
  coursConversion: number | null;
}

export interface AgencyWorkflowCommandRequest {
  operationRef: string | null;
  transferType: AgencyTransferTypeCode;
  transferInstruction: AgencyTransferInstructionCommand;
  parties: {
    parties: AgencyPartyCommand[];
  };
  paymentModalities: {
    modalities: AgencyPaymentModalityCommand[];
  };
  regulatorySupports: {
    supports: AgencyRegulatorySupportCommand[];
  };
}

export interface AgencyWorkflowCommandResponse {
  operationRef?: string | null;
  refOrdre?: string | null;
  referenceOrdre?: string | null;
  refOperation?: string | null;
  id?: string | number | null;
  status?: string | null;
  operationStatus?: string | null;
  statut?: string | null;
  statutOperation?: string | null;
  message?: string | null;
  [key: string]: unknown;
}
