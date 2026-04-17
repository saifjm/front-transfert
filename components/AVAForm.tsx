import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  PlusCircle, 
  Trash2, 
  Upload, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  Save,
  Send,
  Search,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { DossierValidatedModal } from './DossierValidatedModal';
import { controleRne } from '../utils/controleRne';
import { buildDocumentPath, getCurrentDocumentPathParts, safeJsonParse } from '../utils';

interface BeneficiaireMvtDTO {
  id?: string;
  typePieceBenef?: number; // 1, 4 ou 7
  noPieceBenef?: string;
  nomBenef?: string;
  adresseBenef?: string;
  qualite?: string;
  datePiece?: string;
}

interface DocumentDTO {
  id?: string;
  typeDocument?: number;
  referenceFichierJoint?: string;
  extention?: string;
  pathAnnee?: string;
  pathMois?: string;
  cheminFichier?: string;
  fichier?: File | null;
}

interface AvaMarcheMvtDTO {
  id?: string;
  numMarche?: string;
  montantMarche?: number;
  refContrat?: string;
  dateContrat?: string;
  contractant?: string;
  dateFin?: string;
  codeDevise?: number;
  mntDevise?: number;
}

interface BanqueProvenanceDTO {
  codeBanqueProvenance?: number;
  mntAvance?: number;
  mntUtilise?: number;
  mntAutorise?: number;
  mntAutoriseBct?: number;
  solde?: number;
}

interface Banque {
  codeBanque: number;
  libBanque: string;
  sigleBanque?: string;
}

interface TypePiece {
  codeTypePiece: number;
  libelleTypePiece: string;
}

interface Activite {
  codeActivite: number;
  libActivite: string;
}

interface Piece {
  codePiece: number;
  libPiece: string;
}

interface Devise {
  codeDevise: number;
  sigleDevise: string;
  libDevise: string;
}

interface CompteSummary {
  codeAgenceBct: number;
  racineCompte: string;
  cleRib: number;
  codeDevise: number;
}

interface ClientInfo {
  nom?: string;
  prenom?: string;
  comptes?: CompteSummary[];
}

interface OperationCreationResponseDTO {
  refOperation: number;
  numDossier: number;
}

interface BeneficiaireDTO {
  numDossier?: number;
  dateDossier?: string;
  typePieceBenef?: number;
  noPieceBenef?: string;
  codeTypeDos?: number;
  codeAgenceAva?: number;
  nomBenef?: string;
  adresseBenef?: string;
  qualite?: string;
}

interface AvaMarcheDTO {
  numMarche?: number;
  refContrat?: string;
  dateContrat?: string;
  montantMarche?: number;
  montantDevise?: number;
  contractant?: string;
  dateFin?: string;
  codeDevise?: number;
}

interface OuvertureDossierDTO {
  numDossier?: number;
  codeTypeDosAva?: number;
  dateDossier?: string;
  codeAgenceAva?: number;
  typePieceClient?: number;
  noPieceClient?: string;
  numeroCompte?: string;
  tel?: string;
  codeActivite?: number;
  codeSousActivite?: number;
  declarationFiscale?: string;
  dateUltDeclCaf?: string;
  mntAvance?: number;
  mntUtilise?: number;
  mntAutorise?: number;
  mntAutoriseBct?: number;
  mntReserve?: number;
  mntBlocage?: number;
  solde?: number;
  beneficiaires?: BeneficiaireDTO[];
  documents?: DocumentDTO[];
  avaMarche?: AvaMarcheDTO;
}

interface   InitiationOuvertureDTO {
  codeTypeDosAva?: number;
  typePieceClient?: number;
  noPieceClient?: string;
  compteClient?: string | number; // Accepte le RIB au format string (20 caractères) ou number
  tel?: string;
  email?: string;
  codeActivite?: number;
  codeSousActivite?: number;
  declarationFiscale?: string;
  
  mntImportation?: number;
  numeroBct?: number;
  dateBct?: string;
  
  banqueProvenance?: BanqueProvenanceDTO;
  beneficiairesMvtListe?: BeneficiaireMvtDTO[];
  documents?: DocumentDTO[];
  avaMarcheMvt?: AvaMarcheMvtDTO;
}

export function AVAForm() {
  const documentStorageBasePath = String(
    import.meta.env.VITE_DOCUMENTS_BASE_PATH || '',
  ).trim();
  const [formData, setFormData] = useState<InitiationOuvertureDTO>({
    beneficiairesMvtListe: [],
    documents: [],
    avaMarcheMvt: undefined,
    typePieceClient: 3, // Type pièce client fixé à 3 (hidden)
  });

  const [beneficiaires, setBeneficiaires] = useState<BeneficiaireMvtDTO[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [avaMarcheMvt, setAvaMarcheMvt] = useState<AvaMarcheMvtDTO | null>(null);
  const [banqueProvenance, setBanqueProvenance] = useState<BanqueProvenanceDTO>({});
  
  // État pour les erreurs de validation par champ
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // État pour la prévisualisation des documents
  const [previewDocument, setPreviewDocument] = useState<{ file: File | null; url: string | null; name: string } | null>(null);
  const [localStorageDirHandle, setLocalStorageDirHandle] = useState<any>(null);
  const skipDraftCleanupRef = useRef(false);
  const persistedFilePathsRef = useRef<Set<string>>(new Set());
  const documentsRef = useRef<DocumentDTO[]>([]);
  
  // États pour les données de référence
  const [banques, setBanques] = useState<Banque[]>([]);
  const [typesPiece, setTypesPiece] = useState<TypePiece[]>([]);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [devises, setDevises] = useState<Devise[]>([]);
  
  // États de chargement
  const [loadingBanques, setLoadingBanques] = useState(false);
  const [loadingTypesPiece, setLoadingTypesPiece] = useState(false);
  const [loadingActivites, setLoadingActivites] = useState(false);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [loadingDevises, setLoadingDevises] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // États pour le modal de dossier validé
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierValide, setDossierValide] = useState<OuvertureDossierDTO | null>(null);
  const [banqueProvenanceError, setBanqueProvenanceError] = useState<string>('');
  
  // État pour le modal d'erreur API
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [apiError, setApiError] = useState<{
    code?: string;
    error?: string;
    message?: string;
    timestamp?: string;
    status?: number;
  } | null>(null);
  
  const [banqueProvenanceFieldErrors, setBanqueProvenanceFieldErrors] = useState<{
    mntAvance?: string;
    mntUtilise?: string;
    mntAutorise?: string;
    mntAutoriseBct?: string;
    solde?: string;
  }>({});
  const [importationError, setImportationError] = useState<string>('');
  const [bctError, setBctError] = useState<string>('');
  const [importationWarning, setImportationWarning] = useState<string>('');
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [searchingClient, setSearchingClient] = useState(false);
  const [telError, setTelError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [rneError, setRneError] = useState<string>('');
  const [clientNotFound, setClientNotFound] = useState<boolean>(false);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    return () => {
      if (!skipDraftCleanupRef.current) {
        const paths = Array.from(
          new Set(
            documentsRef.current
              .map((d) => d.cheminFichier || '')
              .filter((p) => Boolean(p) && !persistedFilePathsRef.current.has(p)),
          ),
        );
        if (paths.length > 0) {
          void Promise.all(paths.map((p) => deleteLocalFileByPath(p)));
        }
      }
    };
  }, []);

  // Constantes métier
  const CODE_ACTIVITE_TYPE4_OBLIGATOIRE = 26;
  const MONTANT_IMPORTATION_PLAFOND = 200000;
  const ACTIVITE_IMPORTATION_SENSIBLE = 24;
  const TYPE_DOSSIER_IMPORTATION_SENSIBLE = 3;
  const TYPES_DOSSIER_SOUS_ACTIVITE_OBLIGATOIRE = [3, 4, 5];

  // Règles conditionnelles pour Code Activité et Sous Activité
  // Type dossier in (3,5) → Code activité depuis /api/activites, Sous activité depuis /api/ref/activites
  // Type dossier = 4 → Code activité = 26 (statique), Sous activité vide
  // Type dossier in (1,2) → Code activité depuis /api/ref/activites, Sous activité vide
  const getCodeActiviteSource = () => {
    if (!formData.codeTypeDosAva) return 'ref'; // Par défaut
    if ([3, 5].includes(formData.codeTypeDosAva)) return 'activites'; // /api/activites
    if ([1, 2].includes(formData.codeTypeDosAva)) return 'ref'; // /api/ref/activites
    if (formData.codeTypeDosAva === 4) return 'fixed'; // Code activité fixe à 26
    return 'ref';
  };

  const isSousActiviteVisible = () => {
    if (!formData.codeTypeDosAva) return true; // Par défaut visible
    if ([3, 5].includes(formData.codeTypeDosAva)) return true; // Visible et depuis /api/ref/activites
    return false; // Caché pour types 1, 2, 4
  };

  const isCodeActiviteDisabled = () => {
    return formData.codeTypeDosAva === 4; // Désactivé uniquement pour type 4 (valeur fixe)
  };

  // Vérifier si l'onglet Marchés AVA doit être activé
  const isMarchesAvaEnabled = formData.codeTypeDosAva === 2;

  // Vérifier si le montant importation doit être visible/requis
  const isImportationVisible = formData.codeTypeDosAva === 3 && formData.codeActivite === 24;
  const isImportationRequired = isImportationVisible;

  // Vérifier si sous-activité est obligatoire (seulement pour types 3 et 5 maintenant)
  const isSousActiviteRequired = formData.codeTypeDosAva ? [3, 5].includes(formData.codeTypeDosAva) : false;

  // Déterminer si Montant Avance doit être 0 (non modifiable) ou >= 0
  const isMontantAvanceReadonly = banqueProvenance.codeBanqueProvenance && formData.codeTypeDosAva !== 3;
  
  // Charger les types de pièce
  const fetchTypesPiece = async () => {
    setLoadingTypesPiece(true);
    const mockTypesPiece: TypePiece[] = [
      { codeTypePiece: 1, libelleTypePiece: "Carte d'identité nationale" },
      { codeTypePiece: 4, libelleTypePiece: "Carte de séjour" },
      { codeTypePiece: 7, libelleTypePiece: "Passeport" }
    ];
      setTypesPiece(mockTypesPiece);
    setLoadingTypesPiece(false);
  };

  // Charger les banques
  const fetchBanques = async () => {
    setLoadingBanques(true);
    const mockBanques: Banque[] = [
      { codeBanque: 1, libBanque: 'Banque A' },
      { codeBanque: 2, libBanque: 'Banque B' },
      { codeBanque: 3, libBanque: 'Banque C' }
    ];
    try {
      const response = await fetch('/api/ref/banques');
      const data = await safeJsonParse<Banque[]>(response);
      if (data) {
        setBanques(data);
      } else {
        throw new Error('NO_DATA');
      }
    } catch (error) {
      setBanques(mockBanques);
    } finally {
      setLoadingBanques(false);
    }
  };

  // Charger les activités
  const fetchActivites = async () => {
    setLoadingActivites(true);
    const mockActivites: Activite[] = [
      { codeActivite: 1, libActivite: "PROFESSIONS LIBERALES ORGANISEES DANS LE CADRE D'UN ORDRE OU D'UN CONSEIL NATIONAL" },
      { codeActivite: 2, libActivite: "ETUDES ET CONSEILS (BUREAUX D'ETUDES, BUREAUX DE CONTROLE, CONSEILLERS, ...)" },
      { codeActivite: 24, libActivite: "IMPORTATION DE MARCHANDISES" },
      { codeActivite: 26, libActivite: "AUTRES ACTIVITES" }
    ];
    try {
      const response = await fetch('/api/ref/activites');
      const data = await safeJsonParse<Activite[]>(response);
      if (data) {
        setActivites(data);
      } else {
        throw new Error('NO_DATA');
      }
    } catch (error) {
      setActivites(mockActivites);
    } finally {
      setLoadingActivites(false);
    }
  };

  // Charger les pièces justificatives
  const fetchPieces = async () => {
    setLoadingPieces(true);
    const mockPieces: Piece[] = [
      { codePiece: 1, libPiece: 'Facture' },
      { codePiece: 2, libPiece: 'Bon de commande' },
      { codePiece: 3, libPiece: 'Contrat' }
    ];
    try {
      const response = await fetch('/api/ref/pieces');
      const data = await safeJsonParse<Piece[]>(response);
      if (data) {
        setPieces(data);
      } else {
        throw new Error('NO_DATA');
      }
    } catch (error) {
      setPieces(mockPieces);
    } finally {
      setLoadingPieces(false);
    }
  };

  // Charger les devises
  const fetchDevises = async () => {
    setLoadingDevises(true);
    const mockDevises: Devise[] = [
      { codeDevise: 1, sigleDevise: 'EUR', libDevise: 'Euro' },
      { codeDevise: 2, sigleDevise: 'USD', libDevise: 'Dollar' },
      { codeDevise: 3, sigleDevise: 'GBP', libDevise: 'Livre Sterling' }
    ];
    try {
      const response = await fetch('/api/ref/devises/getall');
      const data = await safeJsonParse<Devise[]>(response);
      if (data) {
        setDevises(data);
      } else {
        throw new Error('NO_DATA');
      }
    } catch (error) {
      setDevises(mockDevises);
    } finally {
      setLoadingDevises(false);
    }
  };

  // Charger toutes les données de référence au montage
  useEffect(() => {
    fetchTypesPiece();
    fetchBanques();
    fetchActivites();
    fetchPieces();
    fetchDevises();
  }, []);
  
  // Rechercher un client
  const searchClient = async (typePiece: number | undefined, noPiece: string) => {
    if (!noPiece || !typePiece) {
      setClientInfo(null);
      setClientNotFound(false);
      return;
    }
    
    setSearchingClient(true);
    setClientNotFound(false);
    setClientInfo(null);
    
    try {
      // Récupérer les informations de la personne
      const personneResponse = await fetch(`/api/ref/personnes/by-nopiececlient/${encodeURIComponent(noPiece)}`);
      const personneRaw = await safeJsonParse<any>(personneResponse);

      // API may return an array or a direct object
      const personneData = Array.isArray(personneRaw) ? personneRaw[0] : personneRaw;

      if (!personneResponse.ok || !personneData || !personneData.nom) {
        throw new Error('Personne not found');
      }

      // Récupérer les comptes
      const comptesResponse = await fetch(`/api/ref/comptes/by-piece-client/${encodeURIComponent(noPiece)}`);
      const comptesData = await safeJsonParse<CompteSummary[]>(comptesResponse);

      if (comptesData && Array.isArray(comptesData)) {
        setClientInfo({
          nom: personneData.nom,
          prenom: personneData.prenom || '',
          comptes: comptesData
        });
        setClientNotFound(false);
        console.log('✅ API: Client trouvé:', { nom: personneData.nom, prenom: personneData.prenom, comptes: comptesData });
      } else {
        throw new Error('Comptes not found');
      }
    } catch (error) {
      console.error('❌ Erreur API - Recherche client:', error);
      setClientInfo(null);
      setClientNotFound(true);
      toast.error('Erreur', {
        description: 'Impossible de récupérer les informations du client.'
      });
    } finally {
      setSearchingClient(false);
    }
  };

  // Gestionnaire de validation automatique lors du onBlur
  const handleNoPieceClientBlur = () => {
    const noPiece = formData.noPieceClient;
    
    if (!noPiece) {
      setRneError('');
      setClientInfo(null);
      setClientNotFound(false);
      return;
    }

    // 1. Validation du format RNE
    const validation = validateRNE(noPiece);
    
    if (!validation.valid) {
      setRneError(validation.message);
      setClientInfo(null);
      setClientNotFound(false);
      return;
    }

    // 2. Si format valide, rechercher le client automatiquement
    setRneError('');
    searchClient(formData.typePieceClient, noPiece);
  };

  // Gérer les changements de type de dossier pour Code Activité et Sous Activité
  useEffect(() => {
    if (!formData.codeTypeDosAva) return;

    const typeDossier = formData.codeTypeDosAva;

    // Type dossier = 4 → Code activité fixé à 26, Sous activité vide
    if (typeDossier === 4) {
      setFormData(prev => ({ 
        ...prev, 
        codeActivite: 26,
        codeSousActivite: undefined 
      }));
    }

    // Type dossier in (1, 2) → Vider la sous activité
    if ([1, 2].includes(typeDossier)) {
      setFormData(prev => ({ 
        ...prev, 
        codeSousActivite: undefined 
      }));
    }

    // Type dossier in (3, 5) → Charger depuis /api/activites pour code activité
    if ([3, 5].includes(typeDossier)) {
      // Recharger les activités depuis /api/activites
      const fetchActivitesSpecial = async () => {
        setLoadingActivites(true);
        const mockActivites: Activite[] = [
          { codeActivite: 1, libActivite: "PROFESSIONS LIBERALES ORGANISEES DANS LE CADRE D'UN ORDRE OU D'UN CONSEIL NATIONAL" },
          { codeActivite: 2, libActivite: "ETUDES ET CONSEILS (BUREAUX D'ETUDES, BUREAUX DE CONTROLE, CONSEILLERS, ...)" },
          { codeActivite: 24, libActivite: "IMPORTATION DE MARCHANDISES" },
          { codeActivite: 26, libActivite: "AUTRES ACTIVITES" }
        ];
        try {
          const response = await fetch('/api/activites');
          const data = await safeJsonParse<Activite[]>(response);
          if (data) {
            setActivites(data);
          } else {
            throw new Error('NO_DATA');
          }
        } catch (error) {
          setActivites(mockActivites);
        } finally {
          setLoadingActivites(false);
        }
      };
      fetchActivitesSpecial();
    }

    // Type dossier in (1, 2) → Charger depuis /api/ref/activites pour code activité
    if ([1, 2].includes(typeDossier)) {
      fetchActivites(); // Utilise la fonction existante qui charge depuis /api/ref/activites
    }
  }, [formData.codeTypeDosAva]);

  // Validation du téléphone tunisien
  const validateTelephoneTunisien = (tel: string): string => {
    if (!tel) return '';
    
    // Séparer les numéros par point-virgule et nettoyer les espaces
    const numeros = tel.split(';').map(num => num.trim()).filter(num => num !== '');
    
    // Si aucun numéro après nettoyage
    if (numeros.length === 0) return '';
    
    // Formats acceptés pour chaque numéro :
    // - 8 chiffres (ex: 12345678)
    // - +216 suivi de 8 chiffres (ex: +21612345678)
    // - 00216 suivi de 8 chiffres (ex: 0021612345678)
    const regex8Digits = /^\d{8}$/;
    const regexPlus216 = /^\+216\d{8}$/;
    const regex00216 = /^00216\d{8}$/;
    
    // Valider chaque numéro
    for (let i = 0; i < numeros.length; i++) {
      const numero = numeros[i];
      if (!regex8Digits.test(numero) && !regexPlus216.test(numero) && !regex00216.test(numero)) {
        return `Numéro ${i + 1} invalide ("${numero}"). Format attendu : 8 chiffres, +216XXXXXXXX ou 00216XXXXXXXX`;
      }
    }
    
    return '';
  };

  // Validation de l'email (supporte plusieurs emails séparés par ;)
  const validateEmail = (email: string): string => {
    if (!email) return '';
    
    // Séparer les emails par point-virgule et nettoyer les espaces
    const emails = email.split(';').map(em => em.trim()).filter(em => em !== '');
    
    // Si aucun email après nettoyage
    if (emails.length === 0) return '';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Valider chaque email
    for (let i = 0; i < emails.length; i++) {
      const em = emails[i];
      if (!emailRegex.test(em)) {
        return `Email ${i + 1} invalide ("${em}")`;
      }
    }
    
    return '';
  };

  // Validation des montants de la banque de provenance
  const validateBanqueProvenanceField = (field: keyof BanqueProvenanceDTO, value: number | undefined): string => {
    if (banqueProvenance.codeBanqueProvenance && value !== undefined) {
      // Si code banque renseigné ET type dossier != 3 → montant avance = 0
      if (field === 'mntAvance' && formData.codeTypeDosAva !== 3) {
        if (value !== 0) {
          return 'Le montant avance doit être 0 pour les types de dossier différents de 3';
        }
      }
      if (value < 0) {
        return 'Le montant doit être positif';
      }
    }
    return '';
  };

  // Validation du numéro RNE (Registre National des Entreprises)
  // Basé sur l'algorithme BCT avec contrôle de clé (traduction fidèle du PL/SQL)
  const validateRNE = (rne: string): { valid: boolean; message: string } => {
    if (!rne) {
      return { valid: true, message: '' }; // Vide = pas de validation
    }

    // Utiliser la fonction controleRne (traduction fidèle du PL/SQL)
    const resultat = controleRne(rne);

    if (resultat === 0) {
      return { valid: true, message: '' };
    } else {
      // Fournir un message d'erreur détaillé
      if (rne.length !== 8) {
        return {
          valid: false,
          message: 'Le numéro RNE doit contenir exactement 8 caractères'
        };
      }

      const sevenDigits = rne.substring(0, 7);
      if (!/^\d{7}$/.test(sevenDigits)) {
        return {
          valid: false,
          message: 'Les 7 premiers caractères doivent être des chiffres'
        };
      }

      const numericValue = parseInt(sevenDigits, 10);
      if (numericValue >= 9999999) {
        return {
          valid: false,
          message: 'Le numéro RNE est invalide (valeur trop grande)'
        };
      }

      // Si toutes les vérifications passent mais controleRne retourne 1,
      // c'est la clé de contrôle qui est incorrecte
      const vecteur = 'ABCDEFGHJKLMNPQRSTVWXYZ';
      let somme = 0;
      for (let i = 1; i <= 7; i++) {
        const ch = rne.substring(8 - i - 1, 8 - i);
        const digit = Number(ch);
        somme += digit * i;
      }
      somme = (somme % 23) + 1;
      const cleCalculee = vecteur.substring(somme - 1, somme);
      const cleSaisie = rne.substring(7, 8).toUpperCase();

      return {
        valid: false,
        message: `Clé de contrôle incorrecte. Attendu: ${cleCalculee}, trouvé: ${cleSaisie}`
      };
    }
  };

  // Mise à jour avec validation de la banque de provenance
  const updateBanqueProvenanceField = (field: keyof BanqueProvenanceDTO, value: number | undefined) => {
    // Si code banque renseigné ET type dossier != 3 → forcer montant avance à 0
    if (field === 'mntAvance' && banqueProvenance.codeBanqueProvenance && formData.codeTypeDosAva !== 3) {
      value = 0;
    }
    
    setBanqueProvenance({ ...banqueProvenance, [field]: value });
    
    // Valider le champ
    const error = validateBanqueProvenanceField(field, value);
    setBanqueProvenanceFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Effet pour forcer montant avance à 0 si conditions remplies
  useEffect(() => {
    if (banqueProvenance.codeBanqueProvenance && formData.codeTypeDosAva !== 3) {
      if (banqueProvenance.mntAvance !== 0) {
        setBanqueProvenance(prev => ({ ...prev, mntAvance: 0 }));
      }
    }
  }, [banqueProvenance.codeBanqueProvenance, formData.codeTypeDosAva]);

  // Calcul automatique du solde
  useEffect(() => {
    if (banqueProvenance.codeBanqueProvenance) {
      // Vérifier si tous les champs sont renseignés
      if (
        banqueProvenance.mntAvance === undefined ||
        banqueProvenance.mntUtilise === undefined ||
        banqueProvenance.mntAutorise === undefined ||
        banqueProvenance.mntAutoriseBct === undefined ||
        banqueProvenance.solde === undefined
      ) {
        setBanqueProvenanceError('Tous les montants doivent être renseignés si une banque est sélectionnée');
      } else {
        // Vérifier la formule du solde
        const soldeCalcule = 
          banqueProvenance.mntAutorise + 
          banqueProvenance.mntAvance - 
          banqueProvenance.mntUtilise + 
          banqueProvenance.mntAutoriseBct;
        
        if (Math.abs(banqueProvenance.solde - soldeCalcule) > 0.01) {
          setBanqueProvenanceError(
            `Le solde doit respecter la formule : ${banqueProvenance.mntAutorise} + ${banqueProvenance.mntAvance} - ${banqueProvenance.mntUtilise} + ${banqueProvenance.mntAutoriseBct} = ${soldeCalcule.toFixed(2)}`
          );
        } else {
          setBanqueProvenanceError('');
        }
      }
    } else {
      setBanqueProvenanceError('');
    }
  }, [
    banqueProvenance.codeBanqueProvenance,
    banqueProvenance.mntAvance,
    banqueProvenance.mntUtilise,
    banqueProvenance.mntAutorise,
    banqueProvenance.mntAutoriseBct,
    banqueProvenance.solde
  ]);

  // Contrôle cohérence Numéro BCT / Date BCT
  useEffect(() => {
    const numeroPresent = formData.numeroBct !== undefined && formData.numeroBct !== null;
    const datePresente = formData.dateBct !== undefined && formData.dateBct !== null && formData.dateBct !== '';

    if (numeroPresent && !datePresente) {
      setBctError('DATE_BCT_OBLIGATOIRE: Date autorisation BCT non renseignée');
    } else if (!numeroPresent && datePresente) {
      setBctError('NUMERO_BCT_OBLIGATOIRE: Numéro autorisation BCT non renseigné');
    } else {
      setBctError('');
    }
  }, [formData.numeroBct, formData.dateBct]);

  // Contrôle montant d'importation
  useEffect(() => {
    const montant = formData.mntImportation || 0;
    const codeActivite = formData.codeActivite;
    const typeDossier = formData.codeTypeDosAva;
    const numeroBct = formData.numeroBct;

    // Réinitialiser les messages
    setImportationError('');
    setImportationWarning('');

    // Si type dossier = 3 ET code activité = 24
    if (typeDossier === 3 && codeActivite === 24) {
      // Montant obligatoire et >= 200000
      if (montant === 0) {
        setImportationError('MONTANT_IMPORTATION_OBLIGATOIRE: Montant importation obligatoire');
      } else if (montant < MONTANT_IMPORTATION_PLAFOND) {
        setImportationError(`Le montant d'importation doit être >= ${MONTANT_IMPORTATION_PLAFOND}`);
      }
    } else {
      // Sinon montant importation doit être vide
      if (montant > 0) {
        setImportationError('Le montant d\'importation doit être vide (Type != 3 ou Activité != 24)');
      }
    }
  }, [formData.mntImportation, formData.codeActivite, formData.codeTypeDosAva, formData.numeroBct]);

  // Ajout d'un bénéficiaire
  const addBeneficiaire = () => {
    setBeneficiaires([...beneficiaires, { id: Date.now().toString() }]);
  };

  // Suppression d'un bénéficiaire
  const removeBeneficiaire = (id: string) => {
    setBeneficiaires(beneficiaires.filter(b => b.id !== id));
  };

  // Mise à jour d'un bénéficiaire
  const updateBeneficiaire = (id: string, field: keyof BeneficiaireMvtDTO, value: any) => {
    setBeneficiaires(beneficiaires.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  // Validation de la date pièce bénéficiaire
  const validateBeneficiaireDatePiece = (date: string): string => {
    if (!date) return '';
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      return 'La date de la pièce ne peut pas être dans le futur';
    }
    return '';
  };

  // Fonction utilitaire pour effacer une erreur spécifique
  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      const { [fieldName]: _, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  // Ajout d'un document
  const addDocument = () => {
    setDocuments([...documents, { id: Date.now().toString() }]);
  };

  // Suppression d'un document
  const removeDocument = (id: string) => {
    const toDelete = documents.find((d) => d.id === id)?.cheminFichier;
    if (toDelete && !persistedFilePathsRef.current.has(toDelete)) {
      void deleteLocalFileByPath(toDelete);
    }
    setDocuments(documents.filter(d => d.id !== id));
  };

  // Mise à jour d'un document
  const updateDocument = (id: string, field: keyof DocumentDTO, value: any) => {
    setDocuments(
      documents.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, [field]: value } as DocumentDTO;
        const fileName = next.referenceFichierJoint || '';
        if (fileName) {
          const built = buildDocumentPath({
            fileName,
            basePath: documentStorageBasePath,
            pathAnnee: next.pathAnnee,
            pathMois: next.pathMois,
          });
          next.pathAnnee = built.pathAnnee;
          next.pathMois = built.pathMois;
          next.cheminFichier = built.fullPath;
        }
        return next;
      }),
    );
  };

  // Gestion du changement de fichier
  const handleFileChange = (id: string, file: File | null) => {
    if (file) {
      const previousPath = documents.find((d) => d.id === id)?.cheminFichier;
      const extension = file.name.split('.').pop() || '';
      const defaultParts = getCurrentDocumentPathParts();
      const builtForSave = buildDocumentPath({
        fileName: file.name,
        basePath: documentStorageBasePath,
        pathAnnee: defaultParts.pathAnnee,
        pathMois: defaultParts.pathMois,
      });
      setDocuments(documents.map(d => 
        d.id === id
          ? {
              ...d,
              fichier: file,
              referenceFichierJoint: file.name,
              extention: extension,
              ...(() => {
                const built = buildDocumentPath({
                  fileName: file.name,
                  basePath: documentStorageBasePath,
                  pathAnnee: d.pathAnnee || defaultParts.pathAnnee,
                  pathMois: d.pathMois || defaultParts.pathMois,
                });
                return {
                  pathAnnee: built.pathAnnee,
                  pathMois: built.pathMois,
                  cheminFichier: built.fullPath,
                };
              })(),
            }
          : d
      ));
      if (
        previousPath &&
        previousPath !== builtForSave.fullPath &&
        !persistedFilePathsRef.current.has(previousPath)
      ) {
        void deleteLocalFileByPath(previousPath);
      }
      void saveFileToLocalPath(file, builtForSave.pathAnnee, builtForSave.pathMois, builtForSave.fullPath);
    }
  };

  const chooseLocalStorageFolder = async () => {
    try {
      const picker = (window as any).showDirectoryPicker;
      if (!picker) {
        toast.error('Sélection du dossier non supportée par ce navigateur');
        return;
      }
      const handle = await picker({ mode: 'readwrite' });
      setLocalStorageDirHandle(handle);
      toast.success(`Dossier de stockage sélectionné: ${handle?.name || 'local'}`);
    } catch {
      // User may cancel folder selection.
    }
  };

  const saveFileToLocalPath = async (
    file: File,
    pathAnnee: string,
    pathMois: string,
    fullPath: string,
  ) => {
    const writeThroughDevServer = async () => {
      const fileBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(fileBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const contentBase64 = btoa(binary);
      const response = await fetch('/__localfs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPath: fullPath,
          contentBase64,
        }),
      });
      const payload = await safeJsonParse<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || `HTTP_${response.status}`);
    };

    try {
      if (!documentStorageBasePath) return;
      const isLocalPath = /^[a-zA-Z]:[\\/]/.test(documentStorageBasePath) || documentStorageBasePath.startsWith('/');
      if (!isLocalPath) return;

      const picker = (window as any).showDirectoryPicker;
      if (!picker) {
        await writeThroughDevServer();
        return;
      }

      let root = localStorageDirHandle;
      if (!root) {
        // First time: ask user once for the base folder.
        root = await picker({ mode: 'readwrite' });
        setLocalStorageDirHandle(root);
      }
      if (!root) return;

      const yearDir = await root.getDirectoryHandle(pathAnnee, { create: true });
      const monthDir = await yearDir.getDirectoryHandle(pathMois, { create: true });
      const fileHandle = await monthDir.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      toast.success(`Document enregistré localement: ${pathAnnee}/${pathMois}/${file.name}`);
    } catch (error) {
      console.warn('Échec sauvegarde locale document:', error);
    }
  };

  const deleteLocalFileByPath = async (targetPath: string) => {
    try {
      if (!targetPath) return;
      const response = await fetch('/__localfs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath }),
      });
      const payload = await safeJsonParse<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || `HTTP_${response.status}`);
      console.log('🧹 [OUVERTURE] Fichier supprimé (draft cleanup):', targetPath);
    } catch (error) {
      console.warn('⚠️ [OUVERTURE] Suppression locale ignorée:', targetPath, error);
    }
  };

  const cleanupDraftDocuments = async () => {
    const paths = Array.from(
      new Set(
        documents
          .map((d) => d.cheminFichier || '')
          .filter((p) => Boolean(p) && !persistedFilePathsRef.current.has(p)),
      ),
    );
    if (paths.length === 0) return;
    await Promise.all(paths.map((p) => deleteLocalFileByPath(p)));
  };

  const markCurrentFilesAsPersisted = () => {
    documents.forEach((d) => {
      if (d.cheminFichier) persistedFilePathsRef.current.add(d.cheminFichier);
    });
    skipDraftCleanupRef.current = true;
  };

  // Prévisualiser un document
  const handlePreviewDocument = (document: DocumentDTO) => {
    if (document.fichier) {
      const url = URL.createObjectURL(document.fichier);
      setPreviewDocument({
        file: document.fichier,
        url: url,
        name: document.referenceFichierJoint || 'Document'
      });
    }
  };

  // Fermer la prévisualisation
  const closePreview = () => {
    if (previewDocument?.url) {
      URL.revokeObjectURL(previewDocument.url);
    }
    setPreviewDocument(null);
  };

  // Ajout d'un marché AVA
  const addMarcheAva = () => {
    setAvaMarcheMvt({ id: Date.now().toString() });
  };

  // Suppression d'un marché AVA
  const removeMarcheAva = () => {
    setAvaMarcheMvt(null);
  };

  // Mise à jour d'un marché AVA
  const updateMarcheAva = (field: keyof AvaMarcheMvtDTO, value: any) => {
    if (avaMarcheMvt) {
      setAvaMarcheMvt({ ...avaMarcheMvt, [field]: value });
    }
  };

  // ========================================================================
  // SOUMISSION DU FORMULAIRE AVEC VALIDATION VISUELLE
  // ========================================================================
  // Ce système de validation affiche les erreurs sous chaque champ concerné
  // avec une bordure rouge et un message d'erreur en rouge.
  // 
  // Architecture :
  // 1. État `fieldErrors: Record<string, string>` stocke les erreurs par nom de champ
  // 2. Fonction `clearFieldError(fieldName)` retire l'erreur quand l'utilisateur corrige
  // 3. handleSubmit construit un objet `newErrors` avec toutes les validations
  // 4. Si des erreurs existent :
  //    - Elles sont affichées sous chaque champ avec <span className="text-sm text-red-500">
  //    - Les champs ont une bordure rouge via className='border-red-500'
  //    - Une alerte globale en haut du formulaire liste les 5 premières erreurs
  //    - Un scroll automatique vers le premier champ en erreur
  // 5. Les erreurs disparaissent quand l'utilisateur modifie le champ concerné
  // ========================================================================
  
  // Soumission du formulaire
  const handleSubmit = async () => {
    console.log('🔍 [DEBUG] handleSubmit appelé');
    console.log('🔍 [DEBUG] formData:', formData);
    console.log('🔍 [DEBUG] beneficiaires:', beneficiaires);
    console.log('🔍 [DEBUG] documents:', documents);
    
    // Réinitialiser les erreurs
    const newErrors: Record<string, string> = {};
    
    // ✅ 1. Validation des champs obligatoires de base
    if (!formData.codeTypeDosAva) newErrors.codeTypeDosAva = 'Le type de dossier AVA est obligatoire';
    if (!formData.noPieceClient) newErrors.noPieceClient = 'Le numéro de pièce client (RNE) est obligatoire';
    if (!formData.compteClient) {
      newErrors.compteClient = 'Le numéro du compte (RIB) est obligatoire';
    } else {
      // Validation du format RIB (20 caractères commençant par 26)
      const ribStr = String(formData.compteClient);
      if (ribStr.length !== 20) {
        newErrors.compteClient = 'Le RIB doit contenir exactement 20 caractères';
      } else if (!ribStr.startsWith('26')) {
        newErrors.compteClient = 'Le RIB doit commencer par 26';
      }
    }
    if (!formData.codeActivite) newErrors.codeActivite = 'Le code activité est obligatoire';
    
    // ✅ Déclaration fiscale obligatoire SEULEMENT si code banque est renseigné
    if (banqueProvenance.codeBanqueProvenance && !formData.declarationFiscale) {
      newErrors.declarationFiscale = 'La déclaration fiscale est obligatoire si une banque de provenance est sélectionnée';
    }
    
    // ✅ 2. Sous-activité obligatoire seulement pour types (3,5)
    if (isSousActiviteRequired && !formData.codeSousActivite) {
      newErrors.codeSousActivite = 'La sous-activité est obligatoire pour les types dossier 3 et 5';
    }

    // ✅ 2.1. Validation du RNE avant soumission
    if (formData.noPieceClient) {
      console.log('🔍 [DEBUG] Validation RNE:', formData.noPieceClient);
      const rneValidation = validateRNE(formData.noPieceClient);
      console.log('🔍 [DEBUG] Résultat validation RNE:', rneValidation);
      if (!rneValidation.valid) {
        console.log('❌ [DEBUG] RNE invalide');
        newErrors.noPieceClient = rneValidation.message || 'Numéro RNE invalide';
      }
    }

    // ✅ 2.5. Validation du téléphone et de l'email
    if (formData.tel) {
      const telValidation = validateTelephoneTunisien(formData.tel);
      if (telValidation) {
        newErrors.tel = telValidation;
      }
    }

    if (formData.email) {
      const emailValidation = validateEmail(formData.email);
      if (emailValidation) {
        newErrors.email = emailValidation;
      }
    }

    // ✅ 3. Validation cohérence BCT (numéro et date ensemble ou aucun)
    const numeroPresent = formData.numeroBct !== undefined && formData.numeroBct !== null;
    const datePresente = formData.dateBct !== undefined && formData.dateBct !== null && formData.dateBct !== '';

    if (numeroPresent && !datePresente) {
      newErrors.dateBct = 'La date BCT doit être renseignée si le numéro est présent';
    }
    
    if (!numeroPresent && datePresente) {
      newErrors.numeroBct = 'Le numéro BCT doit être renseigné si la date est présente';
    }

    // ✅ 4. Validation montant importation
    // Si type dossier = 3 ET code activité = 24 → obligatoire et >= 200000
    if (formData.codeTypeDosAva === 3 && formData.codeActivite === 24) {
      if (!formData.mntImportation || formData.mntImportation === 0) {
        newErrors.mntImportation = 'Le montant d\'importation est requis (Type=3, Activité=24)';
      } else if (formData.mntImportation < MONTANT_IMPORTATION_PLAFOND) {
        newErrors.mntImportation = `Le montant d'importation doit être >= ${MONTANT_IMPORTATION_PLAFOND.toLocaleString('fr-TN')} TND`;
      }
    } else {
      // Sinon, montant importation doit être vide
      if (formData.mntImportation && formData.mntImportation > 0) {
        newErrors.mntImportation = 'Le montant d\'importation doit être vide pour ce type de dossier et activité';
      }
    }

    // ✅ 5. Validation montant avance
    if (banqueProvenance.codeBanqueProvenance) {
      if (formData.codeTypeDosAva !== 3) {
        // Si code banque renseigné ET type dossier != 3 → montant avance = 0
        if (banqueProvenance.mntAvance !== 0) {
          newErrors.mntAvance = 'Le montant avance doit être 0 pour les types de dossier différents de 3';
        }
      } else {
        // Si code banque renseigné ET type dossier = 3 → montant avance >= 0
        if (banqueProvenance.mntAvance === undefined || banqueProvenance.mntAvance < 0) {
          newErrors.mntAvance = 'Le montant avance doit être >= 0 pour le type de dossier 3';
        }
      }
    }

    // ✅ 6. Validation des documents : au moins une PJ
    if (documents.length === 0) {
      newErrors.documents = 'Au moins une pièce jointe (document) est requise pour soumettre le dossier';
    }

    // ✅ 7. Validation des bénéficiaires : au moins un bénéficiaire
    if (beneficiaires.length === 0) {
      newErrors.beneficiaires = 'Au moins un bénéficiaire doit être ajouté au dossier';
    }

    console.log('🔍 [DEBUG] Erreurs de validation:', newErrors);
    
    // Si des erreurs existent, les afficher et arrêter
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      toast.error('Formulaire invalide', {
        description: 'Veuillez corriger les erreurs avant de soumettre le dossier',
      });
      
      // Faire défiler jusqu'au premier champ en erreur
      setTimeout(() => {
        const firstErrorField = Object.keys(newErrors)[0];
        const element = document.getElementById(firstErrorField) || 
                       document.querySelector(`[name="${firstErrorField}"]`) ||
                       document.querySelector('.border-red-500');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Si pas d'élément trouvé, scroller en haut pour voir l'alerte globale
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
      
      return;
    }
    
    // Réinitialiser les erreurs si tout est valide
    setFieldErrors({});

    // ✅ 8. Validation complète de chaque bénéficiaire
    for (let i = 0; i < beneficiaires.length; i++) {
      const benef = beneficiaires[i];
      const missingFields: string[] = [];

      if (benef.typePieceBenef === undefined || benef.typePieceBenef === null) missingFields.push('Type de Pièce');
      if (!benef.noPieceBenef) missingFields.push('Numéro de Pièce');
      if (!benef.nomBenef) missingFields.push('Nom');
      if (!benef.adresseBenef) missingFields.push('Adresse');
      if (!benef.qualite) missingFields.push('Qualité');
      if (!benef.datePiece) missingFields.push('Date Pièce');

      if (missingFields.length > 0) {
        toast.error(`Bénéficiaire ${i + 1} incomplet`, {
          description: `Champs manquants : ${missingFields.join(', ')}`,
        });
        return;
      }

      // Validation date pièce <= date du jour
      const dateError = validateBeneficiaireDatePiece(benef.datePiece!);
      if (dateError) {
        toast.error(`Bénéficiaire ${i + 1} - Date invalide`, {
          description: dateError,
        });
        return;
      }
    }

    // ✅ 9. Validation des champs banque de provenance (si banque sélectionnée)
    if (banqueProvenance.codeBanqueProvenance) {
      // Vérifier que tous les champs sont renseignés
      if (
        banqueProvenance.mntAvance === undefined ||
        banqueProvenance.mntUtilise === undefined ||
        banqueProvenance.mntAutorise === undefined ||
        banqueProvenance.mntAutoriseBct === undefined ||
        banqueProvenance.solde === undefined
      ) {
        toast.error('Validation échouée', {
          description: 'Si une banque est sélectionnée, tous les montants doivent être renseignés.',
        });
        return;
      }

      // Vérifier que tous les montants sont positifs ou nuls (>= 0)
      const errors: string[] = [];
      if (banqueProvenance.mntAvance < 0) errors.push('Montant Avance');
      if (banqueProvenance.mntUtilise < 0) errors.push('Montant Utilisé');
      if (banqueProvenance.mntAutorise < 0) errors.push('Montant Autorisé');
      if (banqueProvenance.mntAutoriseBct < 0) errors.push('Montant Autorisé BCT');
      if (banqueProvenance.solde < 0) errors.push('Solde');

      if (errors.length > 0) {
        toast.error('Montants invalides', {
          description: `Les champs suivants ne peuvent pas être négatifs : ${errors.join(', ')}`,
        });
        return;
      }

      // Vérifier la formule du solde
      const soldeCalcule = 
        banqueProvenance.mntAutorise + 
        banqueProvenance.mntAvance - 
        banqueProvenance.mntUtilise + 
        banqueProvenance.mntAutoriseBct;

      if (Math.abs(banqueProvenance.solde - soldeCalcule) > 0.01) {
        toast.error('Erreur de calcul du solde', {
          description: `Le solde doit être égal à : Montant Autorisé (${banqueProvenance.mntAutorise}) + Montant Avance (${banqueProvenance.mntAvance}) - Montant Utilisé (${banqueProvenance.mntUtilise}) + Montant Autorisé BCT (${banqueProvenance.mntAutoriseBct}) = ${soldeCalcule.toFixed(2)}`,
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // ÉTAPE 1 : INITIALISATION (POST /api/operations-deleguees-mvt/initialisation)
      // ═══════════════════════════════════════════════════════════════════════
      
      // Préparation du DTO complet - Nettoyage des champs id temporaires
      const cleanBeneficiaires = beneficiaires.map(({ id, ...rest }) => rest);
      const cleanDocuments = documents.map(({ id, fichier, ...rest }) => {
        const fileName = rest.referenceFichierJoint || '';
        if (!fileName) return rest;
        const built = buildDocumentPath({
          fileName,
          basePath: documentStorageBasePath,
          pathAnnee: rest.pathAnnee,
          pathMois: rest.pathMois,
        });
        return {
          ...rest,
          pathAnnee: built.pathAnnee,
          pathMois: built.pathMois,
          cheminFichier: built.fullPath,
        };
      });
      const cleanMarche = avaMarcheMvt ? { ...avaMarcheMvt } : undefined;
      if (cleanMarche) {
        delete (cleanMarche as any).id;
      }

      const dto: InitiationOuvertureDTO = {
        ...formData,
        beneficiairesMvtListe: cleanBeneficiaires,
        documents: cleanDocuments,
        avaMarcheMvt: cleanMarche,
        banqueProvenance: Object.keys(banqueProvenance).length > 0 ? banqueProvenance : undefined,
      };

      console.log('📤 [ÉTAPE 1/2] Initialisation du dossier...', JSON.stringify(dto, null, 2));
      console.log('🔍 [DEBUG] RIB (compteClient):', dto.compteClient, '(longueur:', String(dto.compteClient).length, 'caractères)');
      
      toast.info('Initialisation du dossier en cours...', {
        description: 'Étape 1/2 : Création du mouvement',
      });

      const initialisationResponse = await fetch('/api/operations-deleguees-mvt/initialisation?finalize=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
      });

      // Si initialisation réussie sans JSON (ou réponse vide) 
      const responseText = await initialisationResponse.text();
      let creationResponse;
      try {
        creationResponse = JSON.parse(responseText);
      } catch (e) {
        creationResponse = null;
      }

      // Vérifier le statut de la réponse
      if (!initialisationResponse.ok) {
        if (creationResponse) {
          // Si le dossier a déjà été validé/existe, le traiter comme succès pour avancer
          if ((creationResponse.message && creationResponse.message.includes('déjà')) || 
              (creationResponse.error && creationResponse.error.includes('déjà'))) {
             console.warn('⚠️ Dossier existant détecté, on avance à la popup', creationResponse);
             // On s'assure d'avoir l'ID si c'est dans le message
             if (!creationResponse.numDossier) {
                const match = (creationResponse.message || creationResponse.error).match(/numDossier=(\d+)/);
                if (match) creationResponse.numDossier = Number(match[1]);
             }
          } else {
             // Afficher la popup avec les détails de l'erreur
             setApiError({
               code: creationResponse.code,
               error: creationResponse.error,
               message: creationResponse.message,
               timestamp: creationResponse.timestamp,
               status: creationResponse.status || initialisationResponse.status,
             });
             setShowErrorModal(true);
             
             console.error('❌ [ÉTAPE 1/2] Erreur d\'initialisation:', creationResponse);
             return;
          }
        } else {
          // Erreur sans payload structuré
          toast.error('Erreur lors de l\'initialisation du dossier', {
            description: `Code HTTP ${initialisationResponse.status} : ${initialisationResponse.statusText}`,
          });
          
          console.error('❌ [ÉTAPE 1/2] Erreur d\'initialisation:', initialisationResponse.status, initialisationResponse.statusText);
          return;
        }
      }

      // Récupérer la réponse de création
      if (!creationResponse) {
        // Mode démonstration - simuler une réponse valide
        const mockResponse: OperationCreationResponseDTO = {
          refOperation: Date.now(),
          numDossier: Math.floor(Math.random() * 10000) + 1000,
        };
        
        // Utiliser la réponse mock et continuer en mode démonstration
        toast.success('Mode Démonstration', {
          description: 'Dossier simulé créé avec succès',
        });
        
        // Afficher le modal de succès avec les données mock
        setDossierValide(mockResponse as any);
        setShowDossierModal(true);
        return;
      }
      
      console.log('✅ [ÉTAPE 1/2] Initialisation réussie:', creationResponse);
      
      if (!creationResponse.numDossier) {
        toast.error('Erreur de réponse', {
          description: 'Le numéro de dossier n\'a pas été retourné par le serveur',
        });
        console.error('❌ numDossier manquant dans la réponse:', creationResponse);
        return;
      }

      toast.success('Dossier ouvert avec succès', {
        description: `Numéro de dossier: ${creationResponse.numDossier}`,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // SUCCÈS - Afficher le popup de dossier ouvert
      // ═══════════════════════════════════════════════════════════════════════

      console.log(`📤 [ÉTAPE 2/2] Validation du dossier ${creationResponse.numDossier}...`);
      
      toast.info('Validation du dossier en cours...', {
        description: `Étape 2/2 : Création de l'opération déléguée finale`,
      });

      const validationResponse = await fetch(`/api/operations-deleguees/validation/${creationResponse.numDossier}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Vérifier le statut de la réponse
      if (!validationResponse.ok) {
        let errorMessage = 'Erreur lors de la validation du dossier';
        let errorDetails = '';
        
        const errorData = await safeJsonParse<any>(validationResponse);
        if (errorData) {
          errorDetails = errorData.message || errorData.error || JSON.stringify(errorData);
        } else {
          errorDetails = `Code HTTP ${validationResponse.status} : ${validationResponse.statusText}`;
        }

        if (validationResponse.status === 404) {
          errorMessage = 'Numéro de dossier introuvable';
          errorDetails = `Le dossier ${creationResponse.numDossier} n'a pas été trouvé`;
        } else if (validationResponse.status === 422) {
          if (errorDetails.includes('existe déjà')) {
             console.warn('⚠️ [ÉTAPE 2/2] Dossier déjà validé, on l\'affiche.');
             // On simule une réponse de validation si le dossier existe déjà
             const existingResponse: OuvertureDossierDTO = {
                numDossier: creationResponse.numDossier,
                dateDossier: new Date().toISOString().split('T')[0],
                // ... on met ce qu'on peut récupérer
                ...creationResponse,
             } as OuvertureDossierDTO;
             
             markCurrentFilesAsPersisted();
             setDossierValide(existingResponse);
             setShowDossierModal(true);
             return;
          }
          errorMessage = 'Contrôles métier non satisfaits';
          errorDetails = errorDetails || 'Les contrôles métier (RIB, matricule, montants) ont échoué';
        }

        toast.error(errorMessage, {
          description: errorDetails,
        });
        
        console.error('❌ [ÉTAPE 2/2] Erreur de validation:', errorDetails);
        return;
      }

      // Récupérer le dossier validé complet
      const validationApiResponse = await safeJsonParse<any>(validationResponse);
      if (!validationApiResponse) {
        // En mode démonstration, utiliser les données de l'étape 1
        const mockValidatedResponse: OuvertureDossierDTO = {
          ...creationResponse,
          // Ajouter les données manquantes
          mntAutorise: banqueProvenance.mntAutorise,
          mntAvance: banqueProvenance.mntAvance,
        } as OuvertureDossierDTO;
        
        // Afficher le modal de succès avec les données mock
        markCurrentFilesAsPersisted();
        setDossierValide(mockValidatedResponse);
        setShowDossierModal(true);
        return;
      }
      
      // Mapper la réponse de l'API vers le format OuvertureDossierDTO
      // L'API retourne: { codeActivite, codeAgence, dateDossier, declarationFiscale, 
      //                  mntAutorise, mntAutoriseBct, mntAvance, mntBlocage, mntReserve, 
      //                  mntUtilise, noPieceClient, numDossier, numeroCompte, solde, typeDossierAva }
      const dossierValideResponse: OuvertureDossierDTO = {
        numDossier: validationApiResponse.numDossier,
        codeTypeDosAva: validationApiResponse.typeDossierAva, // API: typeDossierAva -> DTO: codeTypeDosAva
        dateDossier: validationApiResponse.dateDossier,
        codeAgenceAva: validationApiResponse.codeAgence, // API: codeAgence -> DTO: codeAgenceAva
        typePieceClient: formData.typePieceClient,
        noPieceClient: formData.noPieceClient,
        numeroCompte: formData.compteClient ? String(formData.compteClient) : undefined, // Utiliser le compte sélectionné
        tel: formData.tel,
        codeActivite: formData.codeActivite,
        codeSousActivite: formData.codeSousActivite,
        declarationFiscale: validationApiResponse.declarationFiscale,
        dateUltDeclCaf: (formData as any).dateUltDeclCaf,
        mntAvance: validationApiResponse.mntAvance,
        mntUtilise: validationApiResponse.mntUtilise,
        mntAutorise: validationApiResponse.mntAutorise,
        mntAutoriseBct: validationApiResponse.mntAutoriseBct,
        mntReserve: validationApiResponse.mntReserve,
        mntBlocage: validationApiResponse.mntBlocage,
        solde: validationApiResponse.solde,
        beneficiaires: cleanBeneficiaires as BeneficiaireDTO[],
        documents: cleanDocuments as DocumentDTO[],
        avaMarche: formData.avaMarcheMvt as AvaMarcheDTO
      };

      toast.success('🎉 Dossier AVA créé et validé avec succès !', {
        description: `Numéro de dossier: ${dossierValideResponse.numDossier} | Date: ${dossierValideResponse.dateDossier || 'N/A'} | Bénéficiaires: ${dossierValideResponse.beneficiaires?.length || 0}`,
        duration: 5000,
      });

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('✅ SUCCÈS COMPLET - Détails du dossier validé:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Numéro dossier:', dossierValideResponse.numDossier);
      console.log('Type dossier:', dossierValideResponse.codeTypeDosAva);
      console.log('Date dossier:', dossierValideResponse.dateDossier);
      console.log('Client RNE:', dossierValideResponse.noPieceClient);
      console.log('Compte:', dossierValideResponse.numeroCompte);
      console.log('Activité:', dossierValideResponse.codeActivite);
      console.log('Bénéficiaires:', dossierValideResponse.beneficiaires?.length || 0);
      console.log('Documents:', dossierValideResponse.documents?.length || 0);
      console.log('Montant Autorisé:', dossierValideResponse.mntAutorise);
      console.log('Solde:', dossierValideResponse.solde);
      console.log('═══════════════════════════════════════════════════════════════');

      // Ouvrir le modal avec les détails du dossier validé
      markCurrentFilesAsPersisted();
      setDossierValide(dossierValideResponse);
      setShowDossierModal(true);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement', {
        description: 'Veuillez réessayer ou contacter le support.',
      });
      console.error('❌ Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Réinitialisation du formulaire
  const resetForm = () => {
    if (!skipDraftCleanupRef.current) {
      void cleanupDraftDocuments();
    }
    skipDraftCleanupRef.current = false;
    setFormData({ beneficiairesMvtListe: [], documents: [], avaMarcheMvt: undefined, typePieceClient: 3 });
    setBeneficiaires([]);
    setDocuments([]);
    setAvaMarcheMvt(null);
    setBanqueProvenance({});
    setClientInfo(null);
    setClientNotFound(false);
    setRneError('');
  };

  // Gestion de la fermeture du modal (avec réinitialisation)
  const handleCloseModal = () => {
    setShowDossierModal(false);
    setDossierValide(null);
    skipDraftCleanupRef.current = true;
    resetForm();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ouverture Dossier AVA</h1>
          <p className="text-muted-foreground mt-1">
            Allocation pour Voyage d'Affaire - Formulaire d'initiation
          </p>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          <Send className="w-4 h-4 mr-2" />
          Soumettre le dossier
        </Button>
      </div>

      {/* Alerte de validation globale */}
      {Object.keys(fieldErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Le formulaire contient {Object.keys(fieldErrors).length} erreur(s) :</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {Object.entries(fieldErrors).slice(0, 5).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
              {Object.keys(fieldErrors).length > 5 && (
                <li className="italic">... et {Object.keys(fieldErrors).length - 5} autre(s) erreur(s)</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="informations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="marches" disabled={!isMarchesAvaEnabled}>
            Marchés AVA
            {!isMarchesAvaEnabled && (
              <span className="ml-2 text-xs text-muted-foreground">(Type 2 requis)</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="beneficiaires">Bénéficiaires</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Onglet 1: Informations de base */}
        <TabsContent value="informations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations Client</CardTitle>
              <CardDescription>
                Renseignements d'identification du client et du dossier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Champ hidden pour typePieceClient (fixé à 3) */}
              <input type="hidden" name="typePieceClient" value={formData.typePieceClient || 3} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codeTypeDosAva">Type Dossier AVA *</Label>
                  <Select
                    value={formData.codeTypeDosAva?.toString()}
                    onValueChange={(value) => {
                      setFormData({ ...formData, codeTypeDosAva: Number(value) });
                      if (fieldErrors.codeTypeDosAva) {
                        const { codeTypeDosAva, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                  >
                    <SelectTrigger className={fieldErrors.codeTypeDosAva ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - EXPORTATEUR</SelectItem>
                      <SelectItem value="2">2 - MARCHE REALISABLE A L'ETRANGER</SelectItem>
                      <SelectItem value="3">3 - AUTRES ACTIVITES (ANNEXE N.2)</SelectItem>
                      <SelectItem value="4">4 - AUTRES ACTIVITES (BANQUES)</SelectItem>
                      <SelectItem value="5">5 - A. ACT. (PROM.-NOUV. PROJ.)</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.codeTypeDosAva && (
                    <span className="text-sm text-red-500">{fieldErrors.codeTypeDosAva}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="noPieceClient">Numéro Pièce Client (RNE) *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="noPieceClient"
                      value={formData.noPieceClient || ''}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setFormData({ ...formData, noPieceClient: value });
                        setClientInfo(null);
                        setClientNotFound(false);
                        setRneError('');
                        clearFieldError('noPieceClient');
                      }}
                      onBlur={handleNoPieceClientBlur}
                      placeholder="Ex: 1695881M"
                      className={`flex-1 ${fieldErrors.noPieceClient || rneError ? 'border-red-500' : clientInfo ? 'border-green-500' : ''}`}
                      maxLength={8}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        const validation = validateRNE(formData.noPieceClient || '');
                        if (validation.valid) {
                          setRneError('');
                          searchClient(formData.typePieceClient, formData.noPieceClient || '');
                        } else {
                          setRneError(validation.message);
                        }
                      }}
                      disabled={searchingClient || !formData.noPieceClient}
                      title="Rechercher le client manuellement"
                    >
                      {searchingClient ? (
                        <div className="w-4 h-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Messages de validation et résultats */}
                  {searchingClient && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                      <div className="w-3 h-3 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
                      <span>Recherche en cours...</span>
                    </div>
                  )}
                  
                  {fieldErrors.noPieceClient && !searchingClient && (
                    <span className="text-sm text-red-500">{fieldErrors.noPieceClient}</span>
                  )}
                  
                  {rneError && !searchingClient && !fieldErrors.noPieceClient && (
                    <p className="text-xs text-red-600 mt-1">❌ {rneError}</p>
                  )}
                  
                  {clientNotFound && !searchingClient && !rneError && !fieldErrors.noPieceClient && (
                    <p className="text-xs text-red-600 mt-1">❌ Client non trouvé pour ce numéro RNE</p>
                  )}
                  
                  {clientInfo && !searchingClient && !rneError && (
                    <div className="text-xs text-green-600 mt-1 font-medium">
                      ✓ Client: {clientInfo.prenom} {clientInfo.nom}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: 7 chiffres + 1 lettre de contrôle (validation automatique)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="compteClient">Numéro du compte (RIB) *</Label>
                  {clientInfo && clientInfo.comptes && clientInfo.comptes.length > 0 ? (
                    <Select
                      value={formData.compteClient?.toString()}
                      onValueChange={(value) => {
                        setFormData({ ...formData, compteClient: value as any });
                        clearFieldError('compteClient');
                      }}
                    >
                      <SelectTrigger className={fieldErrors.compteClient ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Sélectionner un compte" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientInfo.comptes.map((compte, index) => {
                          // Construire le RIB au format 20 caractères
                          const codeAgence = String(compte.codeAgenceBct).padStart(3, '0');
                          const racineCompte = String(compte.racineCompte).padStart(13, '0');
                          const cleRib = String(compte.cleRib).padStart(2, '0');
                          const rib = `26${codeAgence}${racineCompte}${cleRib}`;
                          
                          return (
                            <SelectItem key={index} value={rib}>
                              {rib} ({devises.find(d => d.codeDevise === compte.codeDevise)?.sigleDevise || compte.codeDevise})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="compteClient"
                      type="text"
                      value={formData.compteClient || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Permettre uniquement les chiffres
                        if (value === '' || /^\d+$/.test(value)) {
                          setFormData({ ...formData, compteClient: value as any });
                          clearFieldError('compteClient');
                          
                          // Valider le format si renseigné
                          if (value.length > 0 && value.length < 20) {
                            // Pas d'erreur, juste un indicateur visuel
                          } else if (value.length === 20 && !value.startsWith('26')) {
                            setFieldErrors({ ...fieldErrors, compteClient: 'Le RIB doit commencer par 26' });
                          } else if (value.length > 20) {
                            // Empêcher de dépasser 20 caractères
                            return;
                          }
                        }
                      }}
                      placeholder="Ex: 10001001234567890012"
                      maxLength={20}
                      className={fieldErrors.compteClient ? 'border-red-500' : ''}
                    />
                  )}
                  {fieldErrors.compteClient && (
                    <span className="text-sm text-red-500">{fieldErrors.compteClient}</span>
                  )}
                  {formData.compteClient && String(formData.compteClient).length > 0 && String(formData.compteClient).length < 20 && (
                    <span className="text-sm text-orange-500">
                      {String(formData.compteClient).length}/20 caractères
                    </span>
                  )}
                  {formData.compteClient && String(formData.compteClient).length === 20 && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Format valide
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input
                    id="tel"
                    type="tel"
                    value={formData.tel || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, tel: value });
                      setTelError(validateTelephoneTunisien(value));
                      clearFieldError('tel');
                    }}
                    placeholder="12345678 ou +21612345678;+21687654321"
                    className={fieldErrors.tel || telError ? 'border-red-500' : ''}
                  />
                  {fieldErrors.tel && (
                    <span className="text-sm text-red-500">{fieldErrors.tel}</span>
                  )}
                  {!fieldErrors.tel && (
                    <p className="text-xs text-muted-foreground">
                      Séparez plusieurs numéros par un point-virgule (;)
                    </p>
                  )}
                  {telError && (
                    <p className="text-xs text-red-600">{telError}</p>
                  )}
                  {!telError && formData.tel && (
                    <p className="text-xs text-green-600">
                      ✓ {formData.tel.split(';').filter(t => t.trim()).length} numéro(s) valide(s)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="text"
                    value={formData.email || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, email: value });
                      setEmailError(validateEmail(value));
                      clearFieldError('email');
                    }}
                    placeholder="exemple@email.com;autre@email.com"
                    className={fieldErrors.email || emailError ? 'border-red-500' : ''}
                  />
                  {fieldErrors.email && (
                    <span className="text-sm text-red-500">{fieldErrors.email}</span>
                  )}
                  {!fieldErrors.email && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Séparez plusieurs emails par un point-virgule (;)
                      </p>
                      {emailError && (
                        <p className="text-xs text-red-600">{emailError}</p>
                      )}
                      {!emailError && formData.email && (
                        <p className="text-xs text-green-600">
                          ✓ {formData.email.split(';').filter(e => e.trim()).length} email(s) valide(s)
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codeActivite">Code Activité *</Label>
                  {isCodeActiviteDisabled() ? (
                    <Input
                      id="codeActivite"
                      value="26 - AUTRES ACTIVITES"
                      disabled
                      className="bg-gray-100"
                    />
                  ) : (
                    <Select
                      value={formData.codeActivite?.toString()}
                      onValueChange={(value) => {
                        setFormData({ ...formData, codeActivite: Number(value) });
                        clearFieldError('codeActivite');
                      }}
                      disabled={loadingActivites}
                    >
                      <SelectTrigger className={fieldErrors.codeActivite ? 'border-red-500' : ''}>
                        <SelectValue placeholder={loadingActivites ? "Chargement..." : "Sélectionner"} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingActivites ? (
                          <div className="p-2 text-sm text-muted-foreground">Chargement...</div>
                        ) : activites.length > 0 ? (
                          activites.map(activite => (
                            <SelectItem key={activite.codeActivite} value={activite.codeActivite.toString()}>
                              {activite.codeActivite} - {activite.libActivite}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">Aucune donnée</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {fieldErrors.codeActivite && (
                    <span className="text-sm text-red-500">{fieldErrors.codeActivite}</span>
                  )}
                  {!fieldErrors.codeActivite && formData.codeTypeDosAva && (
                    <p className="text-xs text-muted-foreground">
                      {getCodeActiviteSource() === 'activites' && 'Source : Référentiel AVA'}
                      {getCodeActiviteSource() === 'ref' && 'Source : Référentiel général'}
                      {getCodeActiviteSource() === 'fixed' && 'Valeur fixe pour type 4'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {isSousActiviteVisible() && (
                  <div className="space-y-2">
                    <Label htmlFor="codeSousActivite">
                      Code Sous-Activité {isSousActiviteRequired && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="codeSousActivite"
                      type="number"
                      value={formData.codeSousActivite || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, codeSousActivite: value ? Number(value) : undefined });
                        clearFieldError('codeSousActivite');
                      }}
                      placeholder="Ex: 1"
                      className={fieldErrors.codeSousActivite || (isSousActiviteRequired && !formData.codeSousActivite) ? 'border-red-500' : ''}
                    />
                    {fieldErrors.codeSousActivite && (
                      <span className="text-sm text-red-500">{fieldErrors.codeSousActivite}</span>
                    )}
                    {!fieldErrors.codeSousActivite && isSousActiviteRequired && (
                      <p className="text-xs text-blue-600">
                        ℹ️ Champ requis pour types dossier 3 et 5 (Source : Référentiel général)
                      </p>
                    )}
                    {!isSousActiviteRequired && formData.codeTypeDosAva && [3, 5].includes(formData.codeTypeDosAva) && (
                      <p className="text-xs text-muted-foreground">
                        Source : Référentiel général
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Banque de Provenance */}
          <Card>
            <CardHeader>
              <CardTitle>Banque de Provenance</CardTitle>
              <CardDescription>Informations sur la banque d'origine et les montants associés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ligne 1 : Code Banque */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codeBanqueProvenance">Code Banque</Label>
                  <Select
                    value={banqueProvenance.codeBanqueProvenance?.toString()}
                    onValueChange={(value) => setBanqueProvenance({ ...banqueProvenance, codeBanqueProvenance: Number(value) || undefined })}
                    disabled={loadingBanques}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingBanques ? "Chargement..." : "Sélectionner une banque"} />
                    </SelectTrigger>
                    <SelectContent>
                      {banques.map(banque => (
                        <SelectItem key={banque.codeBanque} value={banque.codeBanque.toString()}>
                          {banque.codeBanque} - {banque.libBanque}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lignes 2-3 : Montants */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mntAutorise">Montant Autorisé</Label>
                  <Input
                    id="mntAutorise"
                    type="number"
                    step="0.01"
                    value={banqueProvenance.mntAutorise ?? ''}
                    onChange={(e) => updateBanqueProvenanceField('mntAutorise', e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="0.00"
                  />
                  {banqueProvenanceFieldErrors.mntAutorise && (
                    <p className="text-xs text-red-500">
                      {banqueProvenanceFieldErrors.mntAutorise}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mntAvance">Montant Avance</Label>
                  <Input
                    id="mntAvance"
                    type="number"
                    step="0.01"
                    value={banqueProvenance.mntAvance ?? ''}
                    onChange={(e) => {
                      updateBanqueProvenanceField('mntAvance', e.target.value === '' ? undefined : Number(e.target.value));
                      clearFieldError('mntAvance');
                    }}
                    placeholder="0.00"
                    disabled={Boolean(isMontantAvanceReadonly)}
                    className={`${isMontantAvanceReadonly ? 'bg-muted cursor-not-allowed' : ''} ${fieldErrors.mntAvance ? 'border-red-500' : ''}`}
                  />
                  {fieldErrors.mntAvance && (
                    <span className="text-sm text-red-500">{fieldErrors.mntAvance}</span>
                  )}
                  {!fieldErrors.mntAvance && isMontantAvanceReadonly && (
                    <p className="text-xs text-blue-600">
                      ℹ️ Montant fixé à 0 (Type dossier != 3)
                    </p>
                  )}
                  {banqueProvenanceFieldErrors.mntAvance && (
                    <p className="text-xs text-red-500">
                      {banqueProvenanceFieldErrors.mntAvance}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mntUtilise">Montant Utilisé</Label>
                  <Input
                    id="mntUtilise"
                    type="number"
                    step="0.01"
                    value={banqueProvenance.mntUtilise ?? ''}
                    onChange={(e) => updateBanqueProvenanceField('mntUtilise', e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="0.00"
                  />
                  {banqueProvenanceFieldErrors.mntUtilise && (
                    <p className="text-xs text-red-500">
                      {banqueProvenanceFieldErrors.mntUtilise}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mntAutoriseBct">Montant Autorisé BCT</Label>
                  <Input
                    id="mntAutoriseBct"
                    type="number"
                    step="0.01"
                    value={banqueProvenance.mntAutoriseBct ?? ''}
                    onChange={(e) => updateBanqueProvenanceField('mntAutoriseBct', e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="0.00"
                  />
                  {banqueProvenanceFieldErrors.mntAutoriseBct && (
                    <p className="text-xs text-red-500">
                      {banqueProvenanceFieldErrors.mntAutoriseBct}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solde">Solde</Label>
                  <Input
                    id="solde"
                    type="number"
                    step="0.01"
                    value={banqueProvenance.solde ?? ''}
                    onChange={(e) => updateBanqueProvenanceField('solde', e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="0.00"
                  />
                  {banqueProvenanceFieldErrors.solde && (
                    <p className="text-xs text-red-500">
                      {banqueProvenanceFieldErrors.solde}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formule à respecter : Montant Autorisé + Montant Avance - Montant Utilisé + Montant Autorisé BCT
                  </p>
                </div>
              </div>

              {/* Ligne 4 : Déclaration Fiscale */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="declarationFiscale">
                    Déclaration Fiscale {banqueProvenance.codeBanqueProvenance && <span className="text-red-500">*</span>}
                  </Label>
                  <Select
                    value={formData.declarationFiscale}
                    onValueChange={(value) => {
                      setFormData({ ...formData, declarationFiscale: value });
                      clearFieldError('declarationFiscale');
                    }}
                  >
                    <SelectTrigger className={fieldErrors.declarationFiscale ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="O">Oui (O)</SelectItem>
                      <SelectItem value="N">Non (N)</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.declarationFiscale && (
                    <span className="text-sm text-red-500">{fieldErrors.declarationFiscale}</span>
                  )}
                  {banqueProvenance.codeBanqueProvenance && (
                    <p className="text-xs text-blue-600">
                      ℹ️ Champ requis car une banque de provenance est sélectionnée
                    </p>
                  )}
                </div>
              </div>

              {banqueProvenanceError && (
                <Alert className="mt-4" variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {banqueProvenanceError}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Importation et Informations BCT côte à côte */}
          <div className="grid grid-cols-2 gap-6">
            {/* Importation */}
            <Card>
              <CardHeader>
                <CardTitle>Importation</CardTitle>
                <CardDescription>Montant d'importation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="mntImportation">
                    Montant Importation {isImportationRequired && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="mntImportation"
                    type="number"
                    value={formData.mntImportation || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, mntImportation: Number(e.target.value) || undefined });
                      if (isImportationRequired) {
                        setImportationError('');
                      }
                      clearFieldError('mntImportation');
                    }}
                    placeholder="0"
                    className={fieldErrors.mntImportation || (isImportationRequired && !formData.mntImportation) ? 'border-red-500' : ''}
                  />
                  {fieldErrors.mntImportation && (
                    <span className="text-sm text-red-500">{fieldErrors.mntImportation}</span>
                  )}
                  {isImportationRequired && (
                    <p className="text-xs text-blue-600">
                      ℹ️ Champ requis car Type Dossier = 3 et Code Activité = 24 (doit être &gt;= 200000)
                    </p>
                  )}
                  {!isImportationRequired && formData.codeTypeDosAva && formData.codeActivite && (
                    <p className="text-xs text-muted-foreground">
                      ℹ️ Doit être vide (Type != 3 ou Activité != 24)
                    </p>
                  )}
                  {importationError && (
                    <p className="text-xs text-red-500">
                      {importationError}
                    </p>
                  )}
                  {importationWarning && (
                    <p className="text-xs text-yellow-500">
                      {importationWarning}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informations BCT */}
            <Card>
              <CardHeader>
                <CardTitle>Informations BCT</CardTitle>
                <CardDescription>Banque Centrale de Tunisie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numeroBct">Numéro BCT</Label>
                    <Input
                      id="numeroBct"
                      type="number"
                      value={formData.numeroBct || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, numeroBct: Number(e.target.value) || undefined });
                        clearFieldError('numeroBct');
                      }}
                      placeholder="Ex: 123456"
                      className={fieldErrors.numeroBct ? 'border-red-500' : ''}
                    />
                    {fieldErrors.numeroBct && (
                      <span className="text-sm text-red-500">{fieldErrors.numeroBct}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateBct">Date BCT</Label>
                    <Input
                      id="dateBct"
                      type="date"
                      value={formData.dateBct || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, dateBct: e.target.value || undefined });
                        clearFieldError('dateBct');
                      }}
                      className={fieldErrors.dateBct ? 'border-red-500' : ''}
                    />
                    {fieldErrors.dateBct && (
                      <span className="text-sm text-red-500">{fieldErrors.dateBct}</span>
                    )}
                  </div>
                </div>

                {bctError && (
                  <Alert className="mt-4" variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {bctError}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onglet 2: Marchés AVA */}
        <TabsContent value="marches" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Liste des Marchés AVA</CardTitle>
                  <CardDescription>
                    Détails des marchés liés au voyage d'affaire
                  </CardDescription>
                </div>
                <Button onClick={addMarcheAva} size="sm">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!avaMarcheMvt ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun marché AVA ajouté</p>
                  <Button onClick={addMarcheAva} variant="outline" className="mt-4" size="sm">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Ajouter le marché
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Marché AVA</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeMarcheAva}
                    >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Numéro de Marché</Label>
                        <Input
                          value={avaMarcheMvt.numMarche || ''}
                          onChange={(e) => updateMarcheAva('numMarche', e.target.value)}
                          placeholder="Ex: 15g"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Montant du Marché</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={avaMarcheMvt.montantMarche || ''}
                          onChange={(e) => updateMarcheAva('montantMarche', Number(e.target.value))}
                          placeholder="154"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Référence Contrat</Label>
                        <Input
                          value={avaMarcheMvt.refContrat || ''}
                          onChange={(e) => updateMarcheAva('refContrat', e.target.value)}
                          placeholder="Ex: 14e"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Date Contrat</Label>
                        <Input
                          type="date"
                          value={avaMarcheMvt.dateContrat || ''}
                          onChange={(e) => updateMarcheAva('dateContrat', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Contractant</Label>
                        <Input
                          value={avaMarcheMvt.contractant || ''}
                          onChange={(e) => updateMarcheAva('contractant', e.target.value)}
                          placeholder="Ex: me"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Date Fin</Label>
                        <Input
                          type="date"
                          value={avaMarcheMvt.dateFin || ''}
                          onChange={(e) => updateMarcheAva('dateFin', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Code Devise</Label>
                        <Select
                          value={avaMarcheMvt.codeDevise?.toString()}
                          onValueChange={(value) => updateMarcheAva('codeDevise', Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {loadingDevises ? (
                              <div className="p-2 text-sm text-muted-foreground">Chargement...</div>
                            ) : devises.length > 0 ? (
                              devises.map(devise => (
                                <SelectItem key={devise.codeDevise} value={devise.codeDevise.toString()}>
                                  {devise.sigleDevise} - {devise.libDevise}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">Aucune donnée</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Montant Devise</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={avaMarcheMvt.mntDevise || ''}
                          onChange={(e) => updateMarcheAva('mntDevise', Number(e.target.value))}
                          placeholder="125"
                        />
                      </div>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 3: Bénéficiaires */}
        <TabsContent value="beneficiaires" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Liste des Bénéficiaires</CardTitle>
                  <CardDescription>
                    Ajoutez les bénéficiaires du voyage d'affaire
                  </CardDescription>
                </div>
                <Button onClick={addBeneficiaire} size="sm">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
              {fieldErrors.beneficiaires && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{fieldErrors.beneficiaires}</AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {beneficiaires.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun bénéficiaire ajouté</p>
                  <Button onClick={addBeneficiaire} variant="outline" className="mt-4" size="sm">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Ajouter le premier bénéficiaire
                  </Button>
                </div>
              ) : (
                beneficiaires.map((beneficiaire, index) => {
                  const datePieceError = beneficiaire.datePiece ? validateBeneficiaireDatePiece(beneficiaire.datePiece) : '';
                  
                  return (
                    <div key={beneficiaire.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Bénéficiaire {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBeneficiaire(beneficiaire.id!)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type de Pièce *</Label>
                          <Select
                            value={beneficiaire.typePieceBenef?.toString()}
                            onValueChange={(value) => updateBeneficiaire(beneficiaire.id!, 'typePieceBenef', Number(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {loadingTypesPiece ? (
                                <div className="p-2 text-sm text-muted-foreground">Chargement...</div>
                              ) : typesPiece.length > 0 ? (
                                typesPiece.map(tp => (
                                  <SelectItem key={tp.codeTypePiece} value={tp.codeTypePiece.toString()}>
                                    {tp.libelleTypePiece}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-muted-foreground">Aucune donnée</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Numéro de Pièce *</Label>
                          <Input
                            value={beneficiaire.noPieceBenef || ''}
                            onChange={(e) => updateBeneficiaire(beneficiaire.id!, 'noPieceBenef', e.target.value)}
                            placeholder="Ex: 1234567H"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Nom Bénéficiaire *</Label>
                          <Input
                            value={beneficiaire.nomBenef || ''}
                            onChange={(e) => updateBeneficiaire(beneficiaire.id!, 'nomBenef', e.target.value)}
                            placeholder="Ex: Dupont"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Adresse Bénéficiaire *</Label>
                          <Input
                            value={beneficiaire.adresseBenef || ''}
                            onChange={(e) => updateBeneficiaire(beneficiaire.id!, 'adresseBenef', e.target.value)}
                            placeholder="Ex: 12 Rue de la Paix"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Qualité *</Label>
                          <Select
                            value={beneficiaire.qualite || ''}
                            onValueChange={(value) => updateBeneficiaire(beneficiaire.id!, 'qualite', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dirigeant">Dirigeant</SelectItem>
                              <SelectItem value="conseil d'administration">Conseil d'Administration</SelectItem>
                              <SelectItem value="employé">Employé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Date Pièce *</Label>
                          <Input
                            type="date"
                            value={beneficiaire.datePiece || ''}
                            onChange={(e) => updateBeneficiaire(beneficiaire.id!, 'datePiece', e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className={datePieceError ? 'border-red-500' : ''}
                          />
                          {datePieceError && (
                            <p className="text-xs text-red-500">{datePieceError}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            La date doit être &le; à aujourd'hui
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 4: Documents */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents Joints</CardTitle>
                  <CardDescription>
                    Pièces justificatives requises pour le dossier AVA
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={chooseLocalStorageFolder}>
                    Dossier local
                  </Button>
                  <Button onClick={addDocument} size="sm">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </div>
              {fieldErrors.documents && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{fieldErrors.documents}</AlertDescription>
                </Alert>
              )}
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
                        onClick={() => removeDocument(document.id!)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>Type de Document</Label>
                        <Select
                          value={document.typeDocument?.toString() || ''}
                          onValueChange={(value) => updateDocument(document.id!, 'typeDocument', Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {loadingPieces ? (
                              <div className="p-2 text-sm text-muted-foreground">Chargement...</div>
                            ) : pieces.length > 0 ? (
                              pieces.map(piece => (
                                <SelectItem key={piece.codePiece} value={piece.codePiece.toString()}>
                                  {piece.codePiece} - {piece.libPiece}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">Aucune donnée</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label>Fichier</Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            onChange={(e) => handleFileChange(document.id!, e.target.files?.[0] || null)}
                            className="flex-1"
                          />
                          {document.referenceFichierJoint && (
                            <>
                              <Badge variant="secondary" className="self-center">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {document.referenceFichierJoint}
                              </Badge>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handlePreviewDocument(document)}
                                className="self-center"
                                title="Prévisualiser le document"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          La référence du fichier sera générée automatiquement
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Path Année</Label>
                        <Input
                          value={document.pathAnnee || ''}
                          onChange={(e) => updateDocument(document.id!, 'pathAnnee' as keyof DocumentDTO, e.target.value)}
                          placeholder="YYYY"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Path Mois</Label>
                        <Input
                          value={document.pathMois || ''}
                          onChange={(e) => updateDocument(document.id!, 'pathMois' as keyof DocumentDTO, e.target.value)}
                          placeholder="MM"
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label>Chemin de stockage/preview</Label>
                        <Input
                          readOnly
                          value={
                            document.referenceFichierJoint && document.pathAnnee && document.pathMois
                              ? `${documentStorageBasePath.replace(/[\\/]+$/, '')}/${document.pathAnnee}/${document.pathMois}/${document.referenceFichierJoint}`
                              : ''
                          }
                          placeholder={
                            documentStorageBasePath
                              ? 'Sélectionnez un fichier pour générer le chemin'
                              : 'Renseignez VITE_DOCUMENTS_BASE_PATH dans .env'
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions finales */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              * Champs obligatoires
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Réinitialiser
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <Send className="w-4 h-4 mr-2" />
                Soumettre le dossier
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmation du dossier validé */}
      <DossierValidatedModal
        isOpen={showDossierModal}
        dossier={dossierValide}
        onClose={handleCloseModal}
      />

      {/* Modal d'erreur API */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Erreur lors de l'initialisation du dossier
            </DialogTitle>
            <DialogDescription>
              Une erreur s'est produite lors de la création du dossier. Veuillez consulter les détails ci-dessous.
            </DialogDescription>
          </DialogHeader>
          
          {apiError && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                {apiError.code && (
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-red-900 min-w-[100px]">Code :</span>
                    <span className="text-sm text-red-800 font-mono">{apiError.code}</span>
                  </div>
                )}
                
                {apiError.error && (
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-red-900 min-w-[100px]">Erreur :</span>
                    <span className="text-sm text-red-800">{apiError.error}</span>
                  </div>
                )}
                
                {apiError.message && (
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-red-900 min-w-[100px]">Message :</span>
                    <span className="text-sm text-red-800">{apiError.message}</span>
                  </div>
                )}
                
                {apiError.status && (
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-red-900 min-w-[100px]">Statut HTTP :</span>
                    <span className="text-sm text-red-800">{apiError.status}</span>
                  </div>
                )}
                
                {apiError.timestamp && (
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-red-900 min-w-[100px]">Horodatage :</span>
                    <span className="text-sm text-red-800 font-mono">{apiError.timestamp}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setShowErrorModal(false)} variant="outline">
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de prévisualisation des documents */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="!w-[98vw] !max-w-[98vw] h-[96vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévisualisation du document</DialogTitle>
            <DialogDescription>
              {previewDocument?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewDocument?.file && (
              <>
                {/* Prévisualisation pour les images */}
                {previewDocument.file.type.startsWith('image/') && (
                  <img
                    src={previewDocument.url || ''}
                    alt={previewDocument.name}
                    className="w-full max-h-[80vh] object-contain rounded-lg border"
                  />
                )}

                {/* Prévisualisation pour les PDFs */}
                {previewDocument.file.type === 'application/pdf' && (
                  <iframe
                    src={previewDocument.url || ''}
                    title={previewDocument.name}
                    className="w-full h-[80vh] border rounded-lg"
                  />
                )}

                {/* Prévisualisation pour les fichiers texte */}
                {previewDocument.file.type.startsWith('text/') && (
                  <iframe
                    src={previewDocument.url || ''}
                    title={previewDocument.name}
                    className="w-full h-[80vh] border rounded-lg bg-white"
                  />
                )}

                {/* Message pour les autres types de fichiers */}
                {!previewDocument.file.type.startsWith('image/') &&
                 previewDocument.file.type !== 'application/pdf' &&
                 !previewDocument.file.type.startsWith('text/') && (
                  <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/50">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground mb-2">
                      La prévisualisation n'est pas disponible pour ce type de fichier
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Type: {previewDocument.file.type || 'inconnu'}
                    </p>
                    <Button
                      onClick={() => {
                        if (previewDocument.url) {
                          const link = document.createElement('a');
                          link.href = previewDocument.url;
                          link.download = previewDocument.name;
                          link.click();
                        }
                      }}
                      variant="outline"
                    >
                      Télécharger le fichier
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
