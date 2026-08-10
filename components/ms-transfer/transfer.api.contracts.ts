export interface BnaErrorPayload {
  status?: number;
  codeErreur?: string;
  message?: string;
  messageErreur?: string;
  champ?: string | null;
  correlationId?: string | null;
  timestamp?: string;
}

export interface BnaAuthorizationResponse {
  habilite: boolean;
  agenceCourante: string | number;
  agencesAutorisees: Array<string | number>;
  clientAgences: Array<string | number>;
  codeMotifRefus: string | null;
}

export interface BnaPostalAddress {
  department?: string | null;
  subDepartment?: string | null;
  streetName?: string | null;
  buildingNumber?: string | null;
  buildingName?: string | null;
  floor?: string | null;
  postBox?: string | null;
  room?: string | null;
  postCode?: string | null;
  townName?: string | null;
  townLocationName?: string | null;
  districtName?: string | null;
  countrySubDivision?: string | null;
  countryNumericCode?: string | number | null;
  countryAlpha2?: string | null;
  countryName?: string | null;
}

export interface BnaNat09Activity {
  section?: string | null;
  division?: number | null;
  groupe?: number | null;
  classe?: number | null;
}

export interface BnaClientActivity {
  principale?: BnaNat09Activity | null;
  secondaire?: BnaNat09Activity | null;
}

export interface BnaClientProfileResponse {
  idFiche: string;
  noPiecePersonne: string;
  typePiecePersonne: number;
  nom: string;
  prenom?: string | null;
  nationalite?: string | null;
  telephone?: string | null;
  email?: string | null;
  typeRefClientInterne?: string | null;
  numRefClientInterne?: string | null;
  natureClient: 'P' | 'M';
  residentON: 'O' | 'N';
  taxable?: 'O' | 'N';
  totalementExportatrice: 'O' | 'N';
  clientProhibe?: 'O' | 'N' | null;
  codeDouane?: string | null;
  activite?: BnaClientActivity | string | null;
  codeActivite?: string | null;
  statut?: string;
  niveauRisque?: string;
  codeAgenceBct?: string | number | null;
  libelleAgence?: string | null;
  postalAddress?: BnaPostalAddress;
  adresse?: BnaPostalAddress;
}

export interface BnaAccountRow {
  typePieceClient?: number;
  noPieceClient?: string;
  codeAgenceBct: string | number;
  compteRib: string;
  codeDevise: string | number;
  compteProfessionnelON: 'O' | 'N';
  etatCompte: 'V' | 'N';
  dateCloture?: string | null;
  principal?: boolean;
  principalON?: 'O' | 'N';
  typeCompte?: string;
}

export interface BnaAccountSearchResponse {
  agenceCourante: string | number;
  comptes: BnaAccountRow[];
}

export interface BnaFxRateResponse {
  codeDevise: string | number;
  coursAchat: number | string;
  coursVente: number | string;
  dateValeur: string;
}

export interface BnaBankResponse {
  bicfi: string;
  bankName?: string;
  nom?: string;
  name?: string;
  raisonSociale?: string;
  countryCode?: string;
  codePays?: string;
  countryAlpha2?: string;
  countryName?: string;
  pays?: string;
  townName?: string;
  ville?: string;
  adresse?: string;
  active?: boolean;
  postalAddress?: BnaPostalAddress;
}

export interface BnaNostroResponse {
  currency: string;
  accountRef: string;
  bicfi: string;
  routeType: string;
}

export interface BnaFundsBlockResponse {
  statut: 'OK' | 'KO';
  referenceBlocage?: string;
  montantEffectivementBloque?: number;
  montantRestantBloque?: number;
  codeDevise?: number;
  codeErreur?: string;
  messageErreur?: string;
}

export interface BnaFundsReleaseResponse {
  statut: 'OK' | 'KO';
  montantEffectivementLibere?: number;
  montantRestantBloque?: number;
  codeDevise?: number;
  referenceDeblocage?: string;
  motifEchec?: string;
}

export interface BnaFinancingResource {
  typeRessource: string;
  identifiantRessource: string;
  statutRessource: string;
  eligible: boolean;
  codeDeviseRessource: number;
  montantRessourceOrigine?: number;
  montantDisponible?: number;
  dateDebutValidite?: string;
  dateFinValidite?: string;
  motifIneligibilite?: string | null;
}

export interface BnaFinancingSearchResponse {
  ressources: BnaFinancingResource[];
}

export interface BnaFinancingAllocationResponse {
  statut: 'OK' | 'KO';
  referenceAffectation?: string;
  montantEffectivementAffecte?: number;
  codeDeviseRessource?: number;
  reliquatDisponible?: number;
  codeErreur?: string;
  messageErreur?: string;
}

export interface BnaFinancingReleaseResponse {
  statut: 'OK' | 'KO';
  montantEffectivementLibere?: number;
  reliquatAffecte?: number;
  message?: string;
  codeErreur?: string;
  messageErreur?: string;
  motifEchec?: string;
}

export interface BnaAsyncAck {
  accuseReception: 'ACK';
  messageId?: string;
  referenceOperationIbansys?: string;
}

export interface BnaBackOfficeResult {
  referenceOperationIbansys: string;
  statutTraitement: string;
  motifEchec?: string | null;
  lastUpdatedAt: string;
}

export interface BnaDocumentCreateResponse {
  statut: 'OK';
  documentId: string;
}

export interface BnaDocumentListResponse {
  documents: Array<Record<string, unknown>>;
}
