export interface RefErrorPayload {
  status?: number;
  codeErreur?: string;
  message?: string;
  messageErreur?: string;
  champ?: string | null;
  correlationId?: string | null;
  timestamp?: string;
}

export interface RefAuthorizationResponse {
  habilite: boolean;
  agenceCourante: string | number;
  agencesAutorisees: Array<string | number>;
  clientAgences: Array<string | number>;
  codeMotifRefus: string | null;
}

export interface RefPersonneIdResponse {
  noPiecePersonne: string;
  typePiecePersonne: number;
}

export interface RefPersonneResponse {
  id: RefPersonneIdResponse;
  dateDelPiece: string;
  lieuDelPiece: string;
  nom: string;
  prenom: string;
  adrRes1: string;
  adrRes2: string;
  adrRes3: string;
  adrRes4: string;
  nationalite: string;
  telephone: string;
  email: string;
  dateCreation: string;
  typRefCltInt: string;
  numRefCltInt: string;
  npMigration: string;
  tpMigration: number;
  activite: string;
  fax: string;
  adrCor4: string;
  adrCor1: string;
  adrCor2: string;
  adrCor3: string;
}

export type RefPersonneSearchResponse = RefPersonneResponse[];

export interface RefAccountRowResponse {
  typePieceClient: number;
  noPieceClient: string;
  codeAgenceBct: string | number;
  compteRib: string;
  codeDevise: string | number;
  compteProfessionnelON: string;
  etatCompte: string;
  dateCloture?: string | null;
  principal?: boolean;
  principalON?: string;
  typeCompte?: string;
}

export interface RefAccountSearchResponse {
  agenceCourante: unknown;
  comptes: RefAccountRowResponse[];
}

export interface RefDeviseResponse {
  codeDevise: number;
  codeIso: string;
  sigleDevise: string;
  libDevise: string;
  uniteDevise: number;
  decimalDevise: number;
  quote: string;
  isCote: boolean;
}

export type RefDeviseListResponse = RefDeviseResponse[];

export interface RefPaysResponse {
  codePays: number;
  siglePays: string;
  libPays: string;
  nationalite: string;
  codeContinent: string;
  codeZone: number;
  convention: string;
  liste: string;
  lun: string;
  mar: string;
  mer: string;
  jeu: string;
  ven: string;
  sam: string;
  dim: string;
  langue: string;
  codePaysIso: string;
  codeIso: string;
}

export type RefPaysListResponse = RefPaysResponse[];

export interface RefCoursJourneeAvaResponse {
  codeDevise: number;
  dateJournee: string;
  cours: number;
}

export interface RefBankPostalAddress {
  townName?: string | null;
  postCode?: string | null;
  streetName?: string | null;
  buildingNumber?: string | null;
  country?: string | null;
}

export interface RefBankResponse {
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
  postalAddress?: RefBankPostalAddress;
}

export interface RefNostroResponse {
  currency: string;
  codeDevise: number;
  accountRef: string;
  cptNostro: string;
  cptIban: string;
  bicfi: string;
  routeType: string;
  clearingON: string;
  compteReel: string;
  codeBnqEtr: number;
  codeAgenceEtr: number;
  codeAgenceBna: number;
}
