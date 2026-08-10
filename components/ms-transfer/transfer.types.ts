export type TransferType = 'commercial' | 'financier';

export type TransferInitiationSource = 'AGENCE' | 'AUTRE_BANQUE_PLACE';

export type CustomerIdType = 'CIN' | 'PASSPORT' | 'MF' | 'RC';

export type PartyType = 'PERSONNE_MORALE' | 'PERSONNE_PHYSIQUE';

export type SupportType = 'FI' | 'TCE' | null;

export type RegulatoryType =
  | 'autorisation_bct'
  | 'fiche_information'
  | 'autre_support'
  | null;

export type FxRateMode = 'NORMAL' | 'NEGOCIE' | 'TERME';

export type ModalityType =
  | 'ACHAT_DEVISE_COMPTE_TND'
  | 'DEBIT_COMPTE_DEVISE'
  | 'CONTRAT_TERME'
  | 'FINANCEMENT_IMPORT'
  | 'FONDS_AUTRE_BANQUE'
  | 'NEGOCIATION_INTERBANCAIRE';

export interface AgencyInfo {
  /** BCT agency code, normalized to three digits. */
  code: string;
  label: string;
  bctCode: string;
}

export type ClientAgencyEligibilityReason =
  | 'ELIGIBLE'
  | 'CLIENT_NOT_FOUND'
  | 'SESSION_AGENCY_MISSING'
  | 'USER_NOT_AUTHORIZED_IN_CURRENT_AGENCY'
  | 'CLIENT_NOT_ATTACHED_TO_CURRENT_AGENCY'
  | 'UNKNOWN_REFUSAL';

export interface ClientAgencyEligibility {
  eligible: boolean;
  currentAgency: AgencyInfo | null;
  authorizedAgencies: AgencyInfo[];
  clientAgencies: AgencyInfo[];
  reason: ClientAgencyEligibilityReason;
  message: string;

  /** Compatibility fields for components created before the strict-agency rule. */
  userAgencyCode: string;
  clientAgency: AgencyInfo | null;
}

export interface AccountRow {
  numero: string;
  codeAgence: string;
  devise: string;
  type: string;
  statut: 'ACTIF' | 'INACTIF' | 'BLOQUE';
  dateCloture?: string | null;
  principal: boolean;
  professionnel: boolean;
  eligibleCommission: boolean;
}

export interface ClientActivityCode {
  section?: string;
  division?: number;
  groupe?: number;
  classe?: number;
}

export interface ClientData {
  idClient: string;
  noPiece: string;
  typePiece: CustomerIdType;
  nomRaison: string;
  nom?: string;
  prenom?: string;
  nationalite?: string;
  telephone?: string;
  email?: string;
  typeRefClientInterne?: string;
  numRefClientInterne?: string;
  typeClient: PartyType;
  resident: boolean;
  residence: string;
  pays: string;
  codePays: string;
  ville: string;
  adresse: string;
  agence: string;
  codeAgence: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  niveauRisque: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  taxable?: boolean;
  totalementExportatrice: boolean;
  clientProhibe?: boolean;
  codeDouane?: string;
  activiteCode?: string;
  activitePrincipale?: ClientActivityCode;
  activiteSecondaire?: ClientActivityCode;
  comptes: AccountRow[];
}

export interface QuotedCurrency {
  code: string;
  label: string;
  decimals: number;
}

export interface CounterValueResult {
  codeDevise: string;
  montantOrdre: number;
  coursConversion: number;
  contreValeurTnd: number;
  indicative: boolean;
  dateValeur?: string;
}

export interface PartyData {
  nomRaison: string;
  nom?: string;
  prenom?: string;
  nationalite?: string;
  telephone?: string;
  email?: string;
  typeRefClientInterne?: string;
  numRefClientInterne?: string;
  type: PartyType;
  codePays: string;
  pays: string;
  townName: string;
  compte: string;
  adresseLigne1: string;
  adresseLigne2: string;
  codePostal: string;
  residence: 'RESIDENT' | 'NON_RESIDENT' | '';
  typePiece: string;
  noPiece: string;
}

export interface BankData {
  bicfi: string;
  nom: string;
  codePays: string;
  pays: string;
  townName: string;
  adresse: string;
  active?: boolean;
}

export interface NostroAccount {
  currency: string;
  accountRef: string;
  bicfi: string;
  routeType: string;
}

export interface TransferOrder {
  montantOrdre: string;
  deviseOrdre: string;
  deviseTransfert: string;
  dateValeur: string;
  coursConversion: string;
  contreValeurTnd: string;
  serviceLevel: string;
  purposeCode: string;
  refFacture: string;
  chargeBearer: string;
  motifPaiement: string;
  observations: string;
  debtor: PartyData;
  ultimateDebtorEnabled: boolean;
  ultimateDebtor: PartyData;
  beneficiary: PartyData;
  ultimateCreditorEnabled: boolean;
  ultimateCreditor: PartyData;
  beneficiaryBank: BankData;
}

export interface Modality {
  id: string;
  type: ModalityType;
  montant: string;
  deviseOrdre: string;
  compteADebiter: string;
  deviseCompte: string;
  dossierFinancementId: string;
  fxRateMode: FxRateMode;
  coursIndicatif: string;
  coursSaisi: string;
  montantDebit: string;
  refDeal: string;
  blocage: boolean;
}

export interface BctAuthorization {
  id: string;
  reference: string;
  type: 'F1' | 'F2';
  dateEmission: string;
  dateValidite: string;
  montantAutorise: string;
  montantDisponible: string;
  devise: string;
  objet: string;
}

export interface RegulatoryData {
  codeNatureOperation: string;
  authorizationRequired: boolean;
  selectedAuthorizationId: string;
}

export interface TCEResult {
  state: 'success' | 'warning' | 'error';
  codeTitre: string;
  numDomi: string;
  dateDomi: string;
  devise: string;
  montantDispo: string;
  appartient: boolean;
  typeEchec?: string;
  codeErreur?: string;
  libelleErreur?: string;
}

export interface FicheInformationData {
  numero: string;
  date: string;
  objet: string;
  montant: string;
  devise: string;
  commentaire: string;
}

export interface TceSearchData {
  codeTitre: string;
  numDomi: string;
  dateDomi: string;
}

export interface RegulatorySupportData {
  type: SupportType;
  ficheInformation: FicheInformationData;
  tceSearch: TceSearchData;
  tceResult: TCEResult | null;
}

export interface TransferListItem {
  ref: string;
  type: TransferType;
  client: string;
  montant: string;
  devise: string;
  support: string;
  statut: string;
  etape: string;
  maj: string;
}

export interface TransferSubmissionPayload {
  initiationSource: TransferInitiationSource;
  transferType: TransferType;
  clientId: string;
  clientTypePiece: CustomerIdType;
  clientNoPiece: string;
  commissionAccount: string;
  order: TransferOrder;
  modalities: Modality[];
  regulatoryData: RegulatoryData;
  regulatorySupport: RegulatorySupportData;
}

export interface FundsBlockRequest {
  typePieceClient: CustomerIdType;
  noPieceClient: string;
  compteRib: string;
  montantBlocage: number;
  codeDevise: string;
  referenceOperationIbansys: string;
}

export type FundsBlockResult =
  | {
      statut: 'OK';
      referenceBlocage: string;
      montantEffectivementBloque: number;
      montantRestantBloque: number;
      codeDevise: string;
    }
  | {
      statut: 'KO';
      codeErreur: string;
      messageErreur: string;
    };

export interface FundsReleaseRequest {
  referenceBlocage: string;
  typePieceClient: CustomerIdType;
  noPieceClient: string;
  compteRib: string;
  montantALiberer: number;
  codeDevise: string;
  referenceOperationIbansys: string;
}

export type FundsReleaseResult =
  | {
      statut: 'OK';
      montantEffectivementLibere: number;
      montantRestantBloque: number;
      codeDevise: string;
      referenceDeblocage?: string;
    }
  | {
      statut: 'KO';
      motifEchec: string;
    };

export type FinancingResourceType =
  | 'COMPTE_CLIENT'
  | 'DOSSIER_FINANCEMENT_IMPORT'
  | 'FONDS_RECUS_AUTRE_BANQUE'
  | 'NEGOCIATION_INTERBANCAIRE'
  | string;

export interface FinancingResourceSearchCriteria {
  typePieceClient: CustomerIdType;
  noPieceClient: string;
  typeRessource?: FinancingResourceType;
  statutRessource?: string;
  codeDevise?: string;
  dateValiditeDebut?: string;
  dateValiditeFin?: string;
  identifiantRessource?: string;
}

export interface FinancingResource {
  typeRessource: FinancingResourceType;
  identifiantRessource: string;
  statutRessource: string;
  eligible: boolean;
  codeDeviseRessource: string;
  montantRessourceOrigine?: number;
  montantDisponible?: number;
  dateDebutValidite?: string;
  dateFinValidite?: string;
  motifIneligibilite?: string | null;
}

export interface FinancingAllocationRequest {
  referenceOperationIbansys: string;
  sequenceRessource: string | number;
  typeRessource: FinancingResourceType;
  identifiantRessource: string;
  montantDemandeOrigine: number;
  codeDeviseRessource: string;
  codeDeviseTransfert: string;
  typePieceClient: CustomerIdType;
  noPieceClient: string;
}

export type FinancingAllocationResult =
  | {
      statut: 'OK';
      referenceAffectation: string;
      montantEffectivementAffecte: number;
      codeDeviseRessource: string;
      reliquatDisponible?: number;
    }
  | {
      statut: 'KO';
      codeErreur: string;
      messageErreur: string;
    };

export interface FinancingReleaseRequest {
  referenceOperationIbansys: string;
  referenceAffectation: string;
  sequenceRessource: string | number;
  typeRessource: FinancingResourceType;
  identifiantRessource: string;
  montantALiberer: number;
  codeDeviseRessource: string;
  motifLiberation: string;
}

export type FinancingReleaseResult =
  | {
      statut: 'OK';
      montantEffectivementLibere: number;
      reliquatAffecte?: number;
      message?: string;
    }
  | {
      statut: 'KO';
      codeErreur?: string;
      messageErreur?: string;
      motifEchec?: string;
    };

export interface AsyncReceptionAck {
  accuseReception: 'ACK';
  messageId?: string;
  referenceOperationIbansys?: string;
}

export interface BackOfficeResult {
  referenceOperationIbansys: string;
  statutTraitement: 'OK' | 'KO' | string;
  motifEchec?: string | null;
  lastUpdatedAt: string;
}

export interface DocumentReference {
  documentId: string;
  createdAt?: string;
  [key: string]: unknown;
}

export type TransferNavigationHandler = (
  section: string,
  dossierNum?: string,
) => void;

export interface AgencyInitiationResult {
  operationRef: string;
  status: string;
  message?: string | null;
  raw: Record<string, unknown>;
}
