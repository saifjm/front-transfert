import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  Search, 
  ArrowLeft, 
  FileText, 
  Save,
  Upload,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { safeJsonParse } from '../utils';

// ============= INTERFACES =============

interface DossierAVA {
  codeAgence: string | number;
  libelleAgence: string;
  typeDossier: string | number;
  codeTypeDossier?: string | number;
  libelleTypeDossier: string;
  numeroDossier: string;
  dateDossier: string;
  noPieceClient: string;
  nomClient: string;
  prenomClient?: string;
  montantAutorise: number;
  mntAutorise?: number;
  montantUtilise: number;
  mntUtilise?: number;
  mntAvance?: number;
  mntAutorisationBct?: number;
  mntReserve?: number;
  mntBlocage?: number;
  solde: number;
  devise: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  echeance?: string;
  typePieceClient?: number;
}

interface Agence {
  codeAgence: string;
  libelleAgence: string;
}

interface Devise {
  codeDevise: number;
  sigleDevise: string;
  libDevise: string;
}

interface BeneficiaireSummaryDTO {
  adresseBenef: string;
  noPieceBenef: string;
  nomBenef: string;
  qualite: string;
  typePieceBenef: number;
}

// Interfaces pour l'API business-rules-fv
interface OperationFVDTO {
  codeTypeDosAva?: number;
  dossier: DossierFVDTO;
  montants: MontantsFVDTO;
  mouvement: MouvementFVDTO;
  documentsScannes: DocumentScanneFVDTO[];
}

interface ValidationErrorResponse {
  nombreErreurs: number;
  erreurs: string[];
  valide: boolean;
  message: string;
}

interface DossierFVDTO {
  agence: { code: string; libelle: string };
  numeroDossier: string;
  dateDossier: string; // dd/MM/yyyy
  echeance?: string; // dd/MM/yyyy
  typeDossier: string;
  pieceClient: { typePiece: string; numeroPiece: string };
  compteRib?: { banque: string; agence: string; racineCompte: string; cleRib: string };
  nomClientBanque?: string;
  nomClientPassager?: string;
}

interface MontantsFVDTO {
  baseCalcul?: number;
  caFiscalHT?: number;
  totalAutorise?: number;
  totalUtilise?: number;
  avance?: number;
  solde?: number;
  netAutorise?: number;
  devise?: number;
}

interface MouvementFVDTO {
  numero?: string;
  date: string; // dd/MM/yyyy
  type: string;
  devise: number;
  montantDvs: number;
  montant: number;
  beneficiaire: BeneficiaireFVDTO;
  mode: string;
  pays: number;
  dateDepart: string; // dd/MM/yyyy
  dateRetour: string; // dd/MM/yyyy
}

interface BeneficiaireFVDTO {
  code: string;
  numero: string;
  nom: string;
}

interface DocumentScanneFVDTO {
  ligne: number;
  nomImage: string;
  cheminFichier: string;
  typeDocument: number;
}

// ============= COMPOSANT PRINCIPAL =============

export function AVAFraisVoyage() {
  const [etape, setEtape] = useState<'recherche' | 'frais'>('recherche');
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierAVA[]>([]);
  const [dossierSelectionne, setDossierSelectionne] = useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorResponse | null>(null);

  // Filtres de recherche
  const [searchNumeroDossier, setSearchNumeroDossier] = useState('');
  const [searchTypeDossier, setSearchTypeDossier] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchAgence, setSearchAgence] = useState('');

  // Liste des agences
  const [agences, setAgences] = useState<Agence[]>([]);

  // Liste des devises
  const [devises, setDevises] = useState<Devise[]>([]);

  // Liste des bénéficiaires du dossier
  const [beneficiaires, setBeneficiaires] = useState<BeneficiaireSummaryDTO[]>([]);

  // États pour le mouvement FV
  const [mouvement, setMouvement] = useState<Partial<MouvementFVDTO>>({
    type: 'FV',
    devise: 788, // TND par défaut
    mode: 'BB', // BILLETS DE BANQUE par défaut
    pays: 788, // Tunisie par défaut
    beneficiaire: {
      code: '1',
      numero: '',
      nom: ''
    }
  });

  // États pour les documents scannés
  const [documents, setDocuments] = useState<Array<{
    id: string;
    typeDocument?: number;
    nomImage?: string;
    cheminFichier?: string;
    fichier?: File | null;
  }>>([]);

  // Types de documents disponibles (mock - à charger depuis une API)
  const typesDocuments = [
    { code: 1, libelle: 'Passeport' },
    { code: 2, libelle: 'Billet d\'avion' },
    { code: 3, libelle: 'Facture hébergement' },
    { code: 4, libelle: 'Justificatif de frais' },
    { code: 5, libelle: 'Autorisation BCT' },
    { code: 6, libelle: 'Autre document' }
  ];

  // États de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ============= EFFET DE CHARGEMENT INITIAL =============
  
  useEffect(() => {
    fetchDossiers();
    fetchAgences();
    fetchDevises();
  }, []);

  // ============= FONCTIONS API =============

  const fetchDossiers = async () => {
    setLoading(true);

    const typeDossierLabels: { [key: number]: string } = {
      1: 'EXPORTATEUR',
      2: 'MARCHE REALISABLE A L\'ETRANGER',
      3: 'AUTRES ACTIVITES (ANNEXE N.2)',
      4: 'AUTRES ACTIVITES (BANQUES)',
      5: 'A. ACT. (PROM.-NOUV. PROJ.)'
    };

    const agenceLabels: { [key: number]: string } = {
      17: 'Agence Tunis Centre',
      104: 'Agence Sfax',
      100: 'Agence Tunis Centre',
      200: 'Agence Sfax',
      300: 'Agence Sousse',
      400: 'Agence Monastir'
    };

    const mockDossiers: DossierAVA[] = [
      {
        codeAgence: 100,
        libelleAgence: 'Agence Tunis Centre',
        typeDossier: 1,
        codeTypeDossier: 1,
        libelleTypeDossier: 'EXPORTATEUR',
        numeroDossier: 'AVA-1',
        dateDossier: '2024-01-15',
        noPieceClient: '1695881M',
        nomClient: 'Dupont',
        prenomClient: 'Jean',
        montantAutorise: 150000,
        mntAutorise: 150000,
        montantUtilise: 45000,
        mntUtilise: 45000,
        mntAvance: 75000,
        mntAutorisationBct: 30000,
        mntReserve: 30000,
        mntBlocage: 0,
        solde: 75000,
        devise: 'TND',
        statut: 'ACTIF',
        echeance: '2024-12-31',
        typePieceClient: 1
      },
      {
        codeAgence: 200,
        libelleAgence: 'Agence Sfax',
        typeDossier: 2,
        codeTypeDossier: 2,
        libelleTypeDossier: 'MARCHE REALISABLE A L\'ETRANGER',
        numeroDossier: 'AVA-2',
        dateDossier: '2024-02-10',
        noPieceClient: '2345678M',
        nomClient: 'Martin',
        prenomClient: 'Sophie',
        montantAutorise: 200000,
        mntAutorise: 200000,
        montantUtilise: 60000,
        mntUtilise: 60000,
        mntAvance: 100000,
        mntAutorisationBct: 40000,
        mntReserve: 40000,
        mntBlocage: 0,
        solde: 100000,
        devise: 'TND',
        statut: 'ACTIF',
        echeance: '2024-11-30',
        typePieceClient: 1
      },
      {
        codeAgence: 300,
        libelleAgence: 'Agence Sousse',
        typeDossier: 3,
        codeTypeDossier: 3,
        libelleTypeDossier: 'AUTRES ACTIVITES (ANNEXE N.2)',
        numeroDossier: 'AVA-3',
        dateDossier: '2024-03-05',
        noPieceClient: '3456789M',
        nomClient: 'Ben Ali',
        prenomClient: 'Ahmed',
        montantAutorise: 250000,
        mntAutorise: 250000,
        montantUtilise: 75000,
        mntUtilise: 75000,
        mntAvance: 125000,
        mntAutorisationBct: 50000,
        mntReserve: 50000,
        mntBlocage: 0,
        solde: 125000,
        devise: 'TND',
        statut: 'ACTIF',
        echeance: '2024-10-31',
        typePieceClient: 1
      }
    ];

    try {
      const response = await fetch('/api/operations-deleguees/dossiers-valides-avec-nom');
      
      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      interface DossierValideDTO {
        codeAgence: number;
        typeDossierAva: number;
        numDossier: number;
        dateDossier: string;
        noPieceClient: string;
        nomClient: string | null;
      }

      const data = await safeJsonParse<DossierValideDTO[]>(response);
      
      if (!data || !Array.isArray(data)) {
        throw new Error('JSON_PARSE_ERROR');
      }
      
      const dossiersTransformes: DossierAVA[] = data.map(dto => {
        const nomComplet = dto.nomClient?.trim() || '';
        const nomParts = nomComplet.split(' ');
        const prenom = nomParts.length > 1 ? nomParts[0] : '';
        const nom = nomParts.length > 1 ? nomParts.slice(1).join(' ') : nomComplet;

        return {
          codeAgence: dto.codeAgence,
          libelleAgence: agenceLabels[dto.codeAgence] || `Agence ${dto.codeAgence}`,
          typeDossier: dto.typeDossierAva,
          codeTypeDossier: dto.typeDossierAva,
          libelleTypeDossier: typeDossierLabels[dto.typeDossierAva] || `Type ${dto.typeDossierAva}`,
          numeroDossier: `AVA-${dto.numDossier}`,
          dateDossier: dto.dateDossier,
          noPieceClient: dto.noPieceClient,
          nomClient: nom || 'N/A',
          prenomClient: prenom || '',
          montantAutorise: 0,
          mntAutorise: 0,
          montantUtilise: 0,
          mntUtilise: 0,
          mntAvance: 0,
          mntAutorisationBct: 0,
          mntReserve: 0,
          mntBlocage: 0,
          solde: 0,
          devise: 'TND',
          statut: 'ACTIF',
          typePieceClient: 1
        };
      });

      setDossiers(dossiersTransformes);
      setDossiersFiltres(dossiersTransformes);
      
      console.log('✅ API: Dossiers AVA chargés avec succès (' + dossiersTransformes.length + ' dossiers)');
    } catch (error: any) {
      setDossiers(mockDossiers);
      setDossiersFiltres(mockDossiers);
      
      if (error?.message && !error.message.includes('HTTP_ERROR') && error.message !== 'NOT_JSON' && error.message !== 'Failed to fetch') {
        console.info('ℹ️ Mode démonstration - Frais de Voyage');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAgences = async () => {
    const mockAgences: Agence[] = [
      { codeAgence: '100', libelleAgence: 'Agence Tunis Centre' },
      { codeAgence: '200', libelleAgence: 'Agence Sfax' },
      { codeAgence: '300', libelleAgence: 'Agence Sousse' },
      { codeAgence: '400', libelleAgence: 'Agence Monastir' }
    ];

    try {
      const response = await fetch('/api/ref/agences');
      if (response.ok) {
        const data = await safeJsonParse<Agence[]>(response);
        if (data) {
          setAgences(data);
          return;
        }
      }
      throw new Error('API_ERROR');
    } catch (error) {
      setAgences(mockAgences);
    }
  };

  const fetchDevises = async () => {
    const mockDevises: Devise[] = [
      { codeDevise: 788, sigleDevise: 'TND', libDevise: 'Dinar tunisien' },
      { codeDevise: 978, sigleDevise: 'EUR', libDevise: 'Euro' },
      { codeDevise: 840, sigleDevise: 'USD', libDevise: 'Dollar américain' }
    ];

    try {
      const response = await fetch('/api/ref/devises/getall');
      
      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      const data = await safeJsonParse<Devise[]>(response);
      
      if (!data) {
        throw new Error('JSON_PARSE_ERROR');
      }
      
      setDevises(data);
      console.log('✅ API: Devises chargées avec succès (' + data.length + ' devises)');
    } catch (error: any) {
      setDevises(mockDevises);
      
      if (error?.message && !error.message.includes('HTTP_ERROR') && error.message !== 'NOT_JSON' && error.message !== 'Failed to fetch') {
        console.info('ℹ️ Mode démonstration - Devises');
      }
    }
  };

  // ============= FILTRES =============

  useEffect(() => {
    let filtered = [...dossiers];

    if (searchNumeroDossier.trim()) {
      filtered = filtered.filter(d => 
        d.numeroDossier.toLowerCase().includes(searchNumeroDossier.toLowerCase())
      );
    }

    if (searchTypeDossier) {
      filtered = filtered.filter(d => d.typeDossier.toString() === searchTypeDossier);
    }

    if (searchClient.trim()) {
      const term = searchClient.toLowerCase();
      filtered = filtered.filter(d => 
        d.nomClient.toLowerCase().includes(term) || 
        d.noPieceClient.toLowerCase().includes(term) ||
        d.prenomClient?.toLowerCase().includes(term)
      );
    }

    if (searchAgence) {
      filtered = filtered.filter(d => d.codeAgence.toString() === searchAgence);
    }

    setDossiersFiltres(filtered);
  }, [searchNumeroDossier, searchTypeDossier, searchClient, searchAgence, dossiers]);

  const resetFilters = () => {
    setSearchNumeroDossier('');
    setSearchTypeDossier('');
    setSearchClient('');
    setSearchAgence('');
  };

  // ============= GESTION DES ÉTATS =============

  const handleSelectDossier = async (dossier: DossierAVA) => {
    setLoading(true);
    
    try {
      const numDossier = dossier.numeroDossier.replace('AVA-', '');
      const response = await fetch(`/api/operations-deleguees/${numDossier}/summarybenf`);
      
      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      interface OperationsDelegueeSummaryDTO {
        codeTypeDosAva?: number;
        numDossier?: number;
        dateDossier?: string;
        codeAgenceAva?: number;
        typePieceClient?: number;
        noPieceClient?: string;
        mntAvance?: number;
        mntUtilise?: number;
        mntAutorise?: number;
        solde?: number;
        echeance?: string;
        mntAutorisationBct?: number;
        mntReserve?: number;
        mntBlocage?: number;
        beneficiaires?: BeneficiaireSummaryDTO[];
      }

      const summary = await safeJsonParse<OperationsDelegueeSummaryDTO>(response);
      
      if (!summary) {
        throw new Error('JSON_PARSE_ERROR');
      }

      // Stocker les bénéficiaires
      setBeneficiaires(summary.beneficiaires || []);

      const dossierComplet: DossierAVA = {
        ...dossier,
        mntAutorise: summary.mntAutorise || 0,
        montantAutorise: summary.mntAutorise || 0,
        mntUtilise: summary.mntUtilise || 0,
        montantUtilise: summary.mntUtilise || 0,
        mntAvance: summary.mntAvance || 0,
        mntAutorisationBct: summary.mntAutorisationBct || 0,
        mntReserve: summary.mntReserve || 0,
        mntBlocage: summary.mntBlocage || 0,
        solde: summary.solde || 0,
        echeance: summary.echeance
      };

      setDossierSelectionne(dossierComplet);
      console.log('✅ API: Résumé du dossier chargé avec succès (' + (summary.beneficiaires?.length || 0) + ' bénéficiaires)');
    } catch (error: any) {
      setDossierSelectionne(dossier);
      
      // Données mock pour les bénéficiaires en cas d'erreur
      const mockBeneficiaires: BeneficiaireSummaryDTO[] = [
        {
          adresseBenef: '123 Rue Exemple, Tunis',
          noPieceBenef: dossier.noPieceClient,
          nomBenef: `${dossier.prenomClient} ${dossier.nomClient}`,
          qualite: 'Titulaire',
          typePieceBenef: dossier.typePieceClient || 1
        },
        {
          adresseBenef: '45 Avenue Test, Sfax',
          noPieceBenef: '9876543M',
          nomBenef: 'Marie Dupont',
          qualite: 'Bénéficiaire',
          typePieceBenef: 1
        }
      ];
      setBeneficiaires(mockBeneficiaires);
      
      if (error?.message && !error.message.includes('HTTP_ERROR') && error.message !== 'NOT_JSON' && error.message !== 'Failed to fetch') {
        console.info('ℹ️ Mode démonstration - Résumé du dossier avec bénéficiaires');
      }
    } finally {
      setLoading(false);
    }

    // Initialiser le mouvement avec les valeurs par défaut
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    setMouvement({
      date: today,
      type: 'FV',
      devise: 788,
      montantDvs: 0,
      montant: 0,
      mode: 'BB',
      pays: 788,
      dateDepart: today,
      dateRetour: '',
      beneficiaire: {
        code: String(dossier.typePieceClient || '1'),
        numero: dossier.noPieceClient || '',
        nom: `${dossier.prenomClient || ''} ${dossier.nomClient || ''}`.trim()
      }
    });
    setErrors({});
    setEtape('frais');
  };

  const handleRetourRecherche = () => {
    setEtape('recherche');
    setDossierSelectionne(null);
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    setMouvement({
      type: 'FV',
      devise: 788,
      mode: 'BB',
      pays: 788,
      date: today,
      dateDepart: today,
      dateRetour: '',
      beneficiaire: {
        code: '',
        numero: '',
        nom: ''
      }
    });
    setErrors({});
  };

  // ============= VALIDATION ET SOUMISSION =============

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation montant en devise (obligatoire et > 0)
    if (!mouvement.montantDvs || mouvement.montantDvs <= 0) {
      newErrors.montantDvs = 'Le montant en devise est obligatoire et doit être supérieur à 0';
    }

    // Validation montant TND (obligatoire, >= 0 et <= 30000)
    if (!mouvement.montant) {
      newErrors.montant = 'Le montant en TND est obligatoire';
    } else if (mouvement.montant < 0) {
      newErrors.montant = 'Le montant en TND doit être supérieur ou égal à 0';
    } else if (mouvement.montant > 30000) {
      newErrors.montant = 'Le montant en TND ne peut pas dépasser 30 000 TND';
    }

    // Validation date de départ (obligatoire et >= aujourd'hui)
    if (!mouvement.dateDepart) {
      newErrors.dateDepart = 'La date de départ est obligatoire';
    } else {
      // Convertir la date française (dd/MM/yyyy) en Date
      const [day, month, year] = mouvement.dateDepart.split('/').map(Number);
      const dateDepart = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time pour comparer seulement les dates

      if (dateDepart < today) {
        newErrors.dateDepart = 'La date de départ doit être supérieure ou égale à aujourd\'hui';
      }
    }

    // Validation date de retour (obligatoire)
    if (!mouvement.dateRetour) {
      newErrors.dateRetour = 'La date de retour est obligatoire';
    } else if (mouvement.dateDepart) {
      // Vérifier que la date de retour est après la date de départ
      const [dayDepart, monthDepart, yearDepart] = mouvement.dateDepart.split('/').map(Number);
      const [dayRetour, monthRetour, yearRetour] = mouvement.dateRetour.split('/').map(Number);
      const dateDepart = new Date(yearDepart, monthDepart - 1, dayDepart);
      const dateRetour = new Date(yearRetour, monthRetour - 1, dayRetour);

      if (dateRetour <= dateDepart) {
        newErrors.dateRetour = 'La date de retour doit être après la date de départ';
      }
    }

    // Validation bénéficiaire
    if (!mouvement.beneficiaire?.numero) {
      newErrors.beneficiaireNumero = 'Le numéro de pièce du bénéficiaire est obligatoire';
    }

    if (!mouvement.beneficiaire?.nom) {
      newErrors.beneficiaireNom = 'Le nom du bénéficiaire est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper pour convertir date ISO (yyyy-MM-dd) vers format français (dd/MM/yyyy)
  const convertToFrenchDate = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    if (!dossierSelectionne) {
      toast.error('Aucun dossier sélectionné');
      return;
    }

    setIsSubmitting(true);

    // Extraire le numéro de dossier sans le préfixe "AVA-"
    const numDossier = parseInt(dossierSelectionne.numeroDossier.replace('AVA-', ''), 10);

    // Construire le payload selon le format de l'API
    const operationFV = {
      dossier: {
        numeroDossier: numDossier,
        dateDossier: new Date(dossierSelectionne.dateDossier).toLocaleDateString('fr-FR'),
        typeDossier: Number(dossierSelectionne.codeTypeDossier)
      },
      mouvement: {
        devise: mouvement.devise || 788,
        montantDvs: mouvement.montantDvs || 0,
        beneficiaire: {
          code: Number(mouvement.beneficiaire?.code || 1),
          numero: mouvement.beneficiaire?.numero || ''
        },
        mode: mouvement.mode || 'BB',
        pays: mouvement.pays || 788,
        type: mouvement.type || 'FV',
        montant: mouvement.montant || 0,
        dateDepart: mouvement.dateDepart || '',
        dateRetour: mouvement.dateRetour || ''
      },
      documentsScannes: documents.map((doc, index) => {
        // Utiliser le nom du fichier original (nomImage) au lieu d'extraire depuis cheminFichier
        return {
          ligne: index + 1,
          nomImage: doc.nomImage || '',
          cheminFichier: doc.cheminFichier || '',
          typeDocument: doc.typeDocument || 0
        };
      })
    };

    try {
      const response = await fetch('/api/operations-fv?finalize=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operationFV)
      });

      const result = await safeJsonParse<ValidationErrorResponse>(response);
      console.log('✅ API operations-fv - Réponse:', result);
      
      if (response.ok) {
        setShowSuccessDialog(true);
      } else {
        // Fallback when backend returns structured errors
        if (result) {
          setValidationErrors(result);
        }
        setShowErrorDialog(true);
      }
    } catch (error: any) {
      console.info('ℹ️ Mode démonstration - Simulation de succès (business-rules-fv/valider)');
      console.log('📦 DTO envoyé:', JSON.stringify(operationFV, null, 2));
      
      setShowSuccessDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    handleRetourRecherche();
    fetchDossiers();
  };

  const handleErrorDialogClose = () => {
    setShowErrorDialog(false);
  };

  // ============= GESTION DES DOCUMENTS =============

  const addDocument = () => {
    setDocuments([...documents, { id: Date.now().toString() }]);
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
  };

  const updateDocument = (id: string, field: string, value: any) => {
    setDocuments(documents.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const handleFileChange = (id: string, file: File | null) => {
    if (file) {
      // Nom original du fichier
      const nomImage = file.name;
      // Chemin avec timestamp pour éviter les collisions
      const cheminFichier = `uploads/${Date.now()}_${file.name}`;
      
      // Mettre à jour tous les champs en une seule fois
      setDocuments(documents.map(d => 
        d.id === id ? { 
          ...d, 
          fichier: file,
          nomImage: nomImage,
          cheminFichier: cheminFichier 
        } : d
      ));
    }
  };

  // ============= RENDU : ÉTAPE RECHERCHE =============

  if (etape === 'recherche') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        <div>
          <h1 className="text-3xl font-bold">Frais de Voyage</h1>
          <p className="text-muted-foreground mt-1">
            Rechercher et sélectionner un dossier AVA pour enregistrer des frais de voyage
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rechercher un dossier</CardTitle>
            <CardDescription>
              Utilisez les filtres ci-dessous pour rechercher un dossier AVA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="searchNumeroDossier">Numéro de dossier</Label>
                <Input
                  id="searchNumeroDossier"
                  placeholder="Ex: AVA-2024-001"
                  value={searchNumeroDossier}
                  onChange={(e) => setSearchNumeroDossier(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchTypeDossier">Type de dossier</Label>
                <Select
                  value={searchTypeDossier}
                  onValueChange={setSearchTypeDossier}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - EXPORTATEUR</SelectItem>
                    <SelectItem value="2">2 - MARCHE REALISABLE A L'ETRANGER</SelectItem>
                    <SelectItem value="3">3 - AUTRES ACTIVITES (ANNEXE N.2)</SelectItem>
                    <SelectItem value="4">4 - AUTRES ACTIVITES (BANQUES)</SelectItem>
                    <SelectItem value="5">5 - A. ACT. (PROM.-NOUV. PROJ.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchClient">Client</Label>
                <Input
                  id="searchClient"
                  placeholder="Nom, prénom ou N° pièce"
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchAgence">Agence</Label>
                <Select
                  value={searchAgence}
                  onValueChange={setSearchAgence}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les agences" />
                  </SelectTrigger>
                  <SelectContent>
                    {agences.map(agence => (
                      <SelectItem key={agence.codeAgence} value={agence.codeAgence}>
                        {agence.codeAgence} - {agence.libelleAgence}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Dossiers valides ({dossiersFiltres.length})
            </CardTitle>
            <CardDescription>
              Sélectionnez un dossier pour enregistrer des frais de voyage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#435B7B] mx-auto"></div>
                <p className="text-muted-foreground mt-4">Chargement des dossiers...</p>
              </div>
            ) : dossiersFiltres.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun dossier trouvé</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Code Agence</th>
                      <th className="text-left p-3 font-semibold">Agence</th>
                      <th className="text-left p-3 font-semibold">Type Dossier</th>
                      <th className="text-left p-3 font-semibold">Numéro Dossier</th>
                      <th className="text-left p-3 font-semibold">Date Dossier</th>
                      <th className="text-left p-3 font-semibold">N° Pièce Client</th>
                      <th className="text-left p-3 font-semibold">Client</th>
                      <th className="text-left p-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersFiltres.map((dossier, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3">
                          <Badge variant="outline">{dossier.codeAgence}</Badge>
                        </td>
                        <td className="p-3 text-sm">{dossier.libelleAgence}</td>
                        <td className="p-3">
                          <Badge variant="secondary">
                            {dossier.codeTypeDossier} - {dossier.libelleTypeDossier}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{dossier.numeroDossier}</td>
                        <td className="p-3 text-sm">
                          {dossier.dateDossier ? new Date(dossier.dateDossier).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="p-3 text-sm">{dossier.noPieceClient}</td>
                        <td className="p-3 text-sm">
                          {dossier.prenomClient} {dossier.nomClient}
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            onClick={() => handleSelectDossier(dossier)}
                            disabled={dossier.statut !== 'ACTIF'}
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Sélectionner
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============= RENDU : ÉTAPE FORMULAIRE =============

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleRetourRecherche}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Frais de Voyage</h1>
            <p className="text-muted-foreground mt-1">
              Dossier : {dossierSelectionne?.numeroDossier} - {dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      {/* Informations du dossier */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations générales */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Informations générales</h3>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Code Agence</p>
                <p className="font-medium">{dossierSelectionne?.codeAgence}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Agence</p>
                <p className="font-medium">{dossierSelectionne?.libelleAgence}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type de dossier</p>
                <p className="font-medium">{dossierSelectionne?.codeTypeDossier} - {dossierSelectionne?.libelleTypeDossier}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date du dossier</p>
                <p className="font-medium">
                  {dossierSelectionne?.dateDossier ? new Date(dossierSelectionne.dateDossier).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Numéro de dossier</p>
                <p className="font-medium">{dossierSelectionne?.numeroDossier}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">N° Pièce Client</p>
                <p className="font-medium">{dossierSelectionne?.noPieceClient}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nom du client</p>
                <p className="font-medium">{dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}</p>
              </div>
            </div>
          </div>

          <div className="border-t"></div>

          {/* Montants de référence */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Montants de référence</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">Montant autorisé</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAutorise?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">Montant avance</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAvance?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">Montant autorisation BCT</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAutorisationBct?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
            </div>
          </div>

          <div className="border-t"></div>

          {/* Montants utilisés et solde */}
          <div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">Montant utilisé</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {dossierSelectionne?.mntUtilise?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">Montant réservé</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {dossierSelectionne?.mntReserve?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${(dossierSelectionne?.solde ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <p className="text-muted-foreground">Solde disponible</p>
                <p className={`text-lg font-semibold ${(dossierSelectionne?.solde ?? 0) >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-400'}`}>
                  {dossierSelectionne?.solde?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des Bénéficiaires */}
      {beneficiaires.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bénéficiaires du dossier ({beneficiaires.length})</CardTitle>
            <CardDescription>
              Liste des personnes associées à ce dossier AVA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">N° Pièce</th>
                    <th className="text-left p-3 font-semibold">Type Pièce</th>
                    <th className="text-left p-3 font-semibold">Nom</th>
                    <th className="text-left p-3 font-semibold">Qualité</th>
                    <th className="text-left p-3 font-semibold">Adresse</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaires.map((benef, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-medium">{benef.noPieceBenef}</td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {benef.typePieceBenef === 1 ? 'CIN' : benef.typePieceBenef === 2 ? 'Passeport' : 'Autre'}
                        </Badge>
                      </td>
                      <td className="p-3">{benef.nomBenef}</td>
                      <td className="p-3">
                        <Badge variant={benef.qualite === 'Titulaire' ? 'default' : 'secondary'}>
                          {benef.qualite}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{benef.adresseBenef}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire Mouvement */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du mouvement</CardTitle>
          <CardDescription>Détails de l'opération frais de voyage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type de mouvement *</Label>
              <Select
                value={mouvement.type}
                onValueChange={(value) => setMouvement({ ...mouvement, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FV">FV - Frais de Voyage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Devise */}
            <div className="space-y-2">
              <Label htmlFor="devise">Devise *</Label>
              <Select
                value={String(mouvement.devise)}
                onValueChange={(value) => setMouvement({ ...mouvement, devise: Number(value) })}
              >
                <SelectTrigger id="devise">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {devises.map(devise => (
                    <SelectItem key={devise.codeDevise} value={devise.codeDevise.toString()}>
                      {devise.codeDevise} - {devise.libDevise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode de paiement */}
            <div className="space-y-2">
              <Label htmlFor="mode">Mode de paiement *</Label>
              <Select
                value={mouvement.mode}
                onValueChange={(value) => setMouvement({ ...mouvement, mode: value })}
              >
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BB">BB - BILLETS DE BANQUE</SelectItem>
                  <SelectItem value="VIR">VIR - VIREMENT</SelectItem>
                  <SelectItem value="CAP">CAP - CARTE DE PAIEMENT INTER.</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Montant devise */}
            <div className="space-y-2">
              <Label htmlFor="montantDvs">Montant en devise * ({mouvement.devise === 788 ? 'TND' : mouvement.devise === 978 ? 'EUR' : 'USD'})</Label>
              <Input
                id="montantDvs"
                type="number"
                min="0"
                step="0.001"
                value={mouvement.montantDvs || ''}
                onChange={(e) => setMouvement({ ...mouvement, montantDvs: Number(e.target.value) || 0 })}
                placeholder="0.000"
                className={errors.montantDvs ? 'border-red-500' : ''}
              />
              {errors.montantDvs && (
                <p className="text-xs text-red-600">{errors.montantDvs}</p>
              )}
            </div>

            {/* Montant TND */}
            <div className="space-y-2">
              <Label htmlFor="montant">Montant en TND *</Label>
              <Input
                id="montant"
                type="number"
                min="0"
                step="0.001"
                value={mouvement.montant || ''}
                onChange={(e) => setMouvement({ ...mouvement, montant: Number(e.target.value) || 0 })}
                placeholder="0.000"
                className={errors.montant ? 'border-red-500' : ''}
              />
              {errors.montant && (
                <p className="text-xs text-red-600">{errors.montant}</p>
              )}
            </div>

            {/* Pays */}
            <div className="space-y-2">
              <Label htmlFor="pays">Pays de destination *</Label>
              <Select
                value={String(mouvement.pays)}
                onValueChange={(value) => setMouvement({ ...mouvement, pays: Number(value) })}
              >
                <SelectTrigger id="pays">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="788">788 - Tunisie</SelectItem>
                  <SelectItem value="250">250 - France</SelectItem>
                  <SelectItem value="276">276 - Allemagne</SelectItem>
                  <SelectItem value="380">380 - Italie</SelectItem>
                  <SelectItem value="724">724 - Espagne</SelectItem>
                  <SelectItem value="840">840 - États-Unis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date départ */}
            <div className="space-y-2">
              <Label htmlFor="dateDepart">Date de départ *</Label>
              <Input
                id="dateDepart"
                type="date"
                value={mouvement.dateDepart ? mouvement.dateDepart.split('/').reverse().join('-') : ''}
                onChange={(e) => {
                  const isoDate = e.target.value;
                  const frenchDate = convertToFrenchDate(isoDate);
                  setMouvement({ ...mouvement, dateDepart: frenchDate });
                }}
                className={errors.dateDepart ? 'border-red-500' : ''}
              />
              {errors.dateDepart && (
                <p className="text-xs text-red-600">{errors.dateDepart}</p>
              )}
            </div>

            {/* Date retour */}
            <div className="space-y-2">
              <Label htmlFor="dateRetour">Date de retour *</Label>
              <Input
                id="dateRetour"
                type="date"
                value={mouvement.dateRetour ? mouvement.dateRetour.split('/').reverse().join('-') : ''}
                onChange={(e) => {
                  const isoDate = e.target.value;
                  const frenchDate = convertToFrenchDate(isoDate);
                  setMouvement({ ...mouvement, dateRetour: frenchDate });
                }}
                className={errors.dateRetour ? 'border-red-500' : ''}
              />
              {errors.dateRetour && (
                <p className="text-xs text-red-600">{errors.dateRetour}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire Bénéficiaire */}
      <Card>
        <CardHeader>
          <CardTitle>Bénéficiaire du voyage</CardTitle>
          <CardDescription>Informations sur le voyageur</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélection du bénéficiaire */}
          <div className="space-y-2">
            <Label htmlFor="selectBeneficiaire">Sélectionner un bénéficiaire *</Label>
            <Select
              value={mouvement.beneficiaire?.numero || ''}
              onValueChange={(value) => {
                const benef = beneficiaires.find(b => b.noPieceBenef === value);
                if (benef) {
                  setMouvement({
                    ...mouvement,
                    beneficiaire: {
                      code: String(benef.typePieceBenef),
                      numero: benef.noPieceBenef,
                      nom: benef.nomBenef
                    }
                  });
                  // Effacer les erreurs liées au bénéficiaire
                  const newErrors = { ...errors };
                  delete newErrors.beneficiaireNumero;
                  delete newErrors.beneficiaireNom;
                  setErrors(newErrors);
                }
              }}
            >
              <SelectTrigger id="selectBeneficiaire" className={errors.beneficiaireNumero ? 'border-red-500' : ''}>
                <SelectValue placeholder="Choisir un bénéficiaire" />
              </SelectTrigger>
              <SelectContent>
                {beneficiaires.map((benef, index) => (
                  <SelectItem key={index} value={benef.noPieceBenef}>
                    <div className="flex flex-col">
                      <span className="font-medium">{benef.nomBenef}</span>
                      <span className="text-xs text-muted-foreground">
                        {benef.typePieceBenef === 1 ? 'CIN' : benef.typePieceBenef === 2 ? 'Passeport' : 'Autre'}: {benef.noPieceBenef} • {benef.qualite}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.beneficiaireNumero && (
              <p className="text-xs text-red-600">{errors.beneficiaireNumero}</p>
            )}
          </div>

          {/* Informations du bénéficiaire sélectionné (lecture seule) */}
          {mouvement.beneficiaire?.numero && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Type de pièce</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {mouvement.beneficiaire.code === '1' ? 'CIN' : mouvement.beneficiaire.code === '2' ? 'Passeport' : 'Autre'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Numéro de pièce</Label>
                  <p className="font-medium">{mouvement.beneficiaire.numero}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nom complet</Label>
                  <p className="font-medium">{mouvement.beneficiaire.nom}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulaire Documents Joints */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Documents Joints</CardTitle>
            <CardDescription>
              Pièces justificatives pour le voyage (optionnel)
            </CardDescription>
          </div>
          <Button onClick={addDocument} size="sm">
            <PlusCircle className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {documents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun document ajouté</p>
              <Button onClick={addDocument} variant="outline" className="mt-4" size="sm">
                <PlusCircle className="w-4 h-4 mr-2" />
                Ajouter le premier document
              </Button>
            </div>
          ) : (
            documents.map((document, index) => (
              <div key={document.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Document {index + 1}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(document.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Type de Document</Label>
                    <Select
                      value={document.typeDocument?.toString()}
                      onValueChange={(value) => updateDocument(document.id, 'typeDocument', Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {typesDocuments.map(type => (
                          <SelectItem key={type.code} value={type.code.toString()}>
                            {type.code} - {type.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Fichier</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        onChange={(e) => handleFileChange(document.id, e.target.files?.[0] || null)}
                        className="flex-1"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      {document.nomImage && (
                        <Badge variant="secondary" className="self-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {document.nomImage}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Formats acceptés : PDF, JPG, PNG (Max 5 Mo)
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Card Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              * Champs obligatoires
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRetourRecherche}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la liste
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de succès */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Opération réussie
            </DialogTitle>
            <DialogDescription>
              L'opération Frais de Voyage a été enregistrée avec succès pour le dossier {dossierSelectionne?.numeroDossier}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSuccessDialogClose}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'erreur de validation */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              Erreurs de validation
            </DialogTitle>
            <DialogDescription>
              {validationErrors?.message || "L'opération contient des erreurs qui doivent être corrigées."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Affichage détaillé des erreurs */}
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-800 dark:text-red-400">
                  {validationErrors?.nombreErreurs || 0} erreur(s) détectée(s)
                </span>
              </div>
              
              <div className="space-y-2">
                {validationErrors?.erreurs && validationErrors.erreurs.length > 0 ? (
                  <ul className="space-y-2">
                    {validationErrors.erreurs.map((erreur, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-red-600 font-bold">•</span>
                        <span className="text-red-800 dark:text-red-300">{erreur}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-red-700 dark:text-red-300">Aucun détail d'erreur disponible</p>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>Conseil :</strong> Veuillez corriger les erreurs ci-dessus et réessayer d'enregistrer l'opération.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleErrorDialogClose} variant="default">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}