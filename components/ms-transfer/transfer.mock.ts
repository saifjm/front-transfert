import type {
  AgencyInfo,
  BankData,
  BctAuthorization,
  ClientData,
  Modality,
  QuotedCurrency,
  RegulatoryData,
  RegulatorySupportData,
  TCEResult,
  TransferListItem,
  TransferOrder,
} from './transfer.types';

export const MOCK_AGENCIES: AgencyInfo[] = [
  { code: '0010', label: 'Agence Tunis Centre', bctCode: 'BCT-10' },
  { code: '0021', label: 'Agence Lac 1', bctCode: 'BCT-21' },
];

export const MOCK_CLIENT: ClientData = {
  idClient: '1001',
  noPiece: '12345678',
  typePiece: 'MF',
  nomRaison: 'SOCIETE IMPORTATRICE TUNISIENNE',
  typeClient: 'PERSONNE_MORALE',
  resident: true,
  residence: 'Résident',
  pays: 'Tunisie',
  codePays: 'TN',
  ville: 'Tunis',
  adresse: 'Avenue Habib Bourguiba',
  agence: 'Agence Tunis Centre — BCT-10',
  codeAgence: '0010',
  statut: 'ACTIF',
  niveauRisque: 'FAIBLE',
  totalementExportatrice: false,
  comptes: [
    {
      numero: '01001000000000123456',
      devise: 'TND',
      type: 'Courant',
      statut: 'ACTIF',
      solde: '245 000,000',
      principal: true,
      professionnel: false,
      eligibleCommission: true,
    },
    {
      numero: '01001000000000999999',
      devise: 'EUR',
      type: 'Devises',
      statut: 'ACTIF',
      solde: '32 500,000',
      principal: true,
      professionnel: false,
      eligibleCommission: true,
    },
    {
      numero: '01001000000000777777',
      devise: 'USD',
      type: 'Devises',
      statut: 'ACTIF',
      solde: '8 200,000',
      principal: false,
      professionnel: false,
      eligibleCommission: false,
    },
    {
      numero: '01001000000000444444',
      devise: 'TND',
      type: 'Professionnel',
      statut: 'ACTIF',
      solde: '15 000,000',
      principal: false,
      professionnel: true,
      eligibleCommission: false,
    },
  ],
};

export const MOCK_TOTAL_EXPORTER_CLIENT: ClientData = {
  ...MOCK_CLIENT,
  idClient: '1002',
  noPiece: '1234',
  nomRaison: 'TEXTILES EXPORT TUNISIE SA',
  totalementExportatrice: true,
};

export const MOCK_QUOTED_CURRENCIES: QuotedCurrency[] = [
  { code: 'EUR', label: 'Euro', decimals: 3 },
  { code: 'USD', label: 'Dollar américain', decimals: 3 },
  { code: 'GBP', label: 'Livre sterling', decimals: 3 },
  { code: 'CHF', label: 'Franc suisse', decimals: 3 },
  { code: 'CAD', label: 'Dollar canadien', decimals: 3 },
  { code: 'JPY', label: 'Yen japonais', decimals: 0 },
];

export const MOCK_RATES: Record<string, number> = {
  EUR: 3.35,
  USD: 3.08,
  GBP: 3.96,
  CHF: 3.49,
  CAD: 2.27,
  JPY: 0.0207,
};

export const MOCK_BCT_AUTHORIZATIONS: BctAuthorization[] = [
  {
    id: 'AUTH-447',
    reference: 'BCT-2026/447',
    type: 'F1',
    dateEmission: '2026-03-15',
    dateValidite: '2026-12-31',
    montantAutorise: '10 000,000',
    montantDisponible: '8 500,000',
    devise: 'EUR',
    objet: 'Frais de scolarité',
  },
  {
    id: 'AUTH-512',
    reference: 'BCT-2026/512',
    type: 'F2',
    dateEmission: '2026-05-04',
    dateValidite: '2027-05-03',
    montantAutorise: '25 000,000',
    montantDisponible: '25 000,000',
    devise: 'USD',
    objet: 'Investissement à l’étranger',
  },
];

export const MOCK_BANKS: Record<string, BankData> = {
  DEUTDEFFXXX: {
    bicfi: 'DEUTDEFFXXX',
    nom: 'DEUTSCHE BANK AG',
    codePays: 'DE',
    pays: 'Allemagne',
    townName: 'Frankfurt am Main',
    adresse: 'Taunusanlage 12',
  },
  BNPAFRPPXXX: {
    bicfi: 'BNPAFRPPXXX',
    nom: 'BNP PARIBAS',
    codePays: 'FR',
    pays: 'France',
    townName: 'Paris',
    adresse: '16 Boulevard des Italiens',
  },
};

export const MOCK_TCE: TCEResult = {
  state: 'success',
  codeTitre: '31',
  numDomi: 'DOM-2026-0001',
  dateDomi: '30/06/2026',
  devise: 'EUR',
  montantDispo: '50 000,000',
  appartient: true,
};

const EMPTY_PARTY = {
  nomRaison: '',
  type: 'PERSONNE_MORALE' as const,
  codePays: '',
  pays: '',
  townName: '',
  compte: '',
  adresseLigne1: '',
  adresseLigne2: '',
  codePostal: '',
  residence: '' as const,
  typePiece: '',
  noPiece: '',
};

export const INITIAL_ORDER: TransferOrder = {
  montantOrdre: '20000',
  deviseOrdre: 'EUR',
  deviseTransfert: 'EUR',
  dateValeur: '2026-06-30',
  coursConversion: '3.35000000',
  contreValeurTnd: '67 000,000',
  serviceLevel: 'NURG',
  purposeCode: 'GDDS',
  refFacture: 'FACT-2026-00123',
  chargeBearer: 'SHAR',
  motifPaiement: 'Import marchandises',
  observations: '',
  debtor: { ...EMPTY_PARTY },
  ultimateDebtorEnabled: false,
  ultimateDebtor: { ...EMPTY_PARTY },
  beneficiary: {
    ...EMPTY_PARTY,
    nomRaison: 'EUROPE SUPPLIER GMBH',
    codePays: 'DE',
    pays: 'Allemagne',
    townName: 'Frankfurt am Main',
    compte: 'DE89370400440532013000',
    residence: 'NON_RESIDENT',
  },
  ultimateCreditorEnabled: false,
  ultimateCreditor: { ...EMPTY_PARTY },
  beneficiaryBank: { ...MOCK_BANKS.DEUTDEFFXXX },
};

export const INITIAL_MODALITY: Modality = {
  id: 'initial-modality',
  type: 'ACHAT_DEVISE_COMPTE_TND',
  montant: '20000',
  deviseOrdre: 'EUR',
  compteADebiter: '01001000000000123456',
  deviseCompte: 'TND',
  dossierFinancementId: '',
  fxRateMode: 'NORMAL',
  coursIndicatif: '3.35000000',
  coursSaisi: '',
  montantDebit: '67 000,000',
  refDeal: '',
  blocage: true,
};

export const INITIAL_REGULATORY_DATA: RegulatoryData = {
  codeNatureOperation: '',
  authorizationRequired: false,
  selectedAuthorizationId: '',
};

export const INITIAL_SUPPORT_DATA: RegulatorySupportData = {
  type: null,
  ficheInformation: {
    numero: '',
    date: '',
    objet: '',
    montant: '',
    devise: 'EUR',
    commentaire: '',
  },
  tceSearch: {
    codeTitre: '31',
    numDomi: '',
    dateDomi: '',
  },
  tceResult: null,
};

export const MODALITY_TYPE_OPTIONS = [
  { value: 'ACHAT_DEVISE_COMPTE_TND', label: 'Achat devise sur compte TND' },
  { value: 'DEBIT_COMPTE_DEVISE', label: 'Débit compte en devises' },
  { value: 'CONTRAT_TERME', label: 'Contrat à terme' },
  { value: 'FINANCEMENT_IMPORT', label: 'Dossier de financement import' },
  { value: 'FONDS_AUTRE_BANQUE', label: "Fonds reçus d'une autre banque" },
  { value: 'NEGOCIATION_INTERBANCAIRE', label: 'Négociation interbancaire' },
] as const;

export const RECENT_TRANSFERS: TransferListItem[] = [
  {
    ref: 'TR-2026-000023',
    type: 'commercial',
    client: 'MECANIQUE TUNISIENNE SA',
    montant: '45 000,000',
    devise: 'EUR',
    support: 'TCE DOM-2026-0023',
    statut: 'en_cours_agence',
    etape: 'Saisie opérateur',
    maj: '13/07/2026 09:41',
  },
  {
    ref: 'TR-2026-000022',
    type: 'financier',
    client: 'BEN ALI KARIM',
    montant: '8 500,000',
    devise: 'USD',
    support: 'Autorisation BCT 2026/447',
    statut: 'attente_sc',
    etape: 'Validation services centraux',
    maj: '12/07/2026 15:20',
  },
  {
    ref: 'TR-2026-000021',
    type: 'commercial',
    client: 'AGROTECH IMPORT SARL',
    montant: '120 000,000',
    devise: 'EUR',
    support: 'TCE DOM-2026-0019',
    statut: 'valide',
    etape: 'Exécution du transfert',
    maj: '11/07/2026 11:05',
  },
  {
    ref: 'TR-2026-000020',
    type: 'financier',
    client: 'TRABELSI INES',
    montant: '2 000,000',
    devise: 'EUR',
    support: 'Fiche info FI-2026-099',
    statut: 'rejete',
    etape: 'Rejeté — motif réglementaire',
    maj: '10/07/2026 14:32',
  },
  {
    ref: 'TR-2026-000019',
    type: 'commercial',
    client: 'TEXTILES SFAX EXPORT',
    montant: '88 000,000',
    devise: 'GBP',
    support: 'TCE DOM-2026-0015',
    statut: 'brouillon',
    etape: 'Non soumis',
    maj: '09/07/2026 10:17',
  },
];

export const STATUS_CFG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  brouillon: { label: 'Brouillon', bg: '#F8F9FA', text: '#6B7280', dot: '#9CA3AF' },
  en_cours_agence: { label: 'En cours agence', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  attente_sc: { label: 'En attente services centraux', bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  attente_bo: { label: 'En attente BO', bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  valide: { label: 'Validé', bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  rejete: { label: 'Rejeté', bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  annule: { label: 'Annulé', bg: '#F9FAFB', text: '#374151', dot: '#6B7280' },
};
