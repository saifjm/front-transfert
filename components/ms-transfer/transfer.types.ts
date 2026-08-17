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
  resident?: boolean;
  residence?: string;
  pays?: string;
  codePays?: string;
  ville?: string;
  adresse: string;
  agence?: string;
  codeAgence?: string;
  statut?: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  niveauRisque?: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  taxable?: boolean;
  totalementExportatrice?: boolean;
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

/**
 * Search abstraction used by the beneficiary UI.
 * For now REF only exposes search by noPieceClient. Additional criteria can be
 * added here later without coupling the component to the transport contract.
 */
export interface BeneficiarySearchCriteria {
  noPiece: string;
}

export interface BankClientBeneficiaryCandidate {
  key: string;
  numericTypePiece: number;
  typePiece: CustomerIdType | null;
  noPiece: string;
  nomRaison: string;
  nationalite: string;
  internalReference: string;
  supported: boolean;
  /** Null when REF returns an identifier type not supported by MS-TR. */
  party: PartyData | null;
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
