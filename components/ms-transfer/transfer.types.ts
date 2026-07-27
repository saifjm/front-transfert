export type TransferType = 'commercial' | 'financier';

export type TransferInitiationSource = 'AGENCE' | 'AUTRE_BANQUE_PLACE';

export type CustomerIdType = 'CIN' | 'PASSPORT' | 'MF' | 'RC';

export type PartyType = 'PERSONNE_MORALE' | 'PERSONNE_PHYSIQUE';

export type SupportType = 'FI' | 'TCE' | null;

/**
 * Conserved for compatibility with earlier screens. New code should use
 * SupportType and RegulatoryData instead.
 */
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
  code: string;
  label: string;
  bctCode: string;
}

export interface AccountRow {
  numero: string;
  devise: string;
  type: string;
  statut: 'ACTIF' | 'INACTIF' | 'BLOQUE';
  solde: string;
  principal: boolean;
  professionnel: boolean;
  eligibleCommission: boolean;
}

export interface ClientData {
  idClient: string;
  noPiece: string;
  typePiece: CustomerIdType;
  nomRaison: string;
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
  totalementExportatrice: boolean;
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
}

export interface PartyData {
  nomRaison: string;
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

export type TransferNavigationHandler = (
  section: string,
  dossierNum?: string,
) => void;
