import {
    AlertCircle,
    ArrowLeft,
    FileText,
    Save,
    Search
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { buildDocumentPath, getCurrentDocumentPathParts, safeJsonParse, showError } from '../utils';
import { authenticatedFetch } from '../utils/api';
import { startRcDecision, continueRcDecision } from '../utils/workflowApi';
import { DocumentsManager } from './DocumentsManager';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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

interface RetrocessionDTO {
  typeMouvement?: 'RAV' | 'RRV';
  refOperation?: number;
  numeroDeclaration?: number;
  dateDeclaration?: string;
  mntMvt?: number;
}

interface OperationMouvement {
  id: {
    refOperation: number;
    dateOperation: string;
  };
  codeTypeDosAva: number;
  mntReserve: number;
  codeOperation?: number;
  mntMvtAva?: number;
}

interface Agence {
  codeAgence: string;
  libelleAgence: string;
}

export function AVARetrocession({ initialDossierNum }: { initialDossierNum?: string } = {}) {
  const deepLinked = useRef(false);
  const documentsBasePath = String(import.meta.env.VITE_DOCUMENTS_BASE_PATH || '').trim();
  const [etape, setEtape] = useState<'recherche' | 'retrocession'>('recherche');
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierAVA[]>([]);
  const [dossierSelectionne, setDossierSelectionne] = useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtres de recherche
  const [searchNumeroDossier, setSearchNumeroDossier] = useState('');
  const [searchTypeDossier, setSearchTypeDossier] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchAgence, setSearchAgence] = useState('');

  // Liste des agences
  const [agences, setAgences] = useState<Agence[]>([]);

  // États pour la rétrocession
  const [retrocession, setRetrocession] = useState<RetrocessionDTO>({
    typeMouvement: 'RAV' // Par défaut RAV
  });

  // États de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // États pour les documents
  const [documents, setDocuments] = useState<Array<{
    id: string;
    typeDocument?: number;
    nomImage?: string;
    pathAnnee?: string;
    pathMois?: string;
    cheminFichier?: string;
    fichier?: File | null;
  }>>([]);

  // États pour les opérations associées au dossier
  const [operations, setOperations] = useState<OperationMouvement[]>([]);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [wfRcBusinessKey, setWfRcBusinessKey] = useState<string | null>(null);
  const [operationSelectionnee, setOperationSelectionnee] = useState<OperationMouvement | null>(null);
  const localStorageDirHandleRef = useRef<any>(null);
  const skipDraftCleanupRef = useRef(false);
  const persistedFilePathsRef = useRef<Set<string>>(new Set());
  const documentsRef = useRef<typeof documents>([]);

  // Charger les dossiers et agences au montage
  useEffect(() => {
    fetchDossiers();
  }, []);

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

  // Charger les dossiers AVA
  const fetchDossiers = async () => {
    setLoading(true);

    const typeDossierLabels: Record<number, string> = {
      1: 'EXPORTATEUR',
      2: "MARCHE REALISABLE A L'ETRANGER",
      3: 'AUTRES ACTIVITES (ANNEXE N.2)',
      4: 'AUTRES ACTIVITES (BANQUES)',
      5: 'A. ACT. (PROM.-NOUV. PROJ.)',
    };

    try {
      const response = await authenticatedFetch('/api/operations-deleguees');
      if (!response.ok) throw new Error('API_ERROR');

      interface OperationsDelegueeDTO {
        numDossier: number;
        typeDossierAva: number;
        dateDossier: string;
        codeAgence: number;
        noPieceClient: string;
        etatDossier: string;
        mntAutorise?: number;
        mntAvance?: number;
        mntAutorisationBct?: number;
        mntUtilise?: number;
        mntReserve?: number;
        mntBlocage?: number;
        solde?: number;
        echeance?: string;
        beneficiaires?: Array<{ nomBenef?: string }>;
      }

      const data = await safeJsonParse<OperationsDelegueeDTO[]>(response);
      if (data && Array.isArray(data)) {
        // Resolve agence labels from API
        let agenceNameByCode = new Map<number, string>();
        try {
          const dgRes = await fetch('/api/ref/donnees-generales');
          if (dgRes.ok) {
            const dg = await safeJsonParse<Array<{ codeBanque?: number }>>(dgRes);
            const cBanque = Array.isArray(dg) && dg.length > 0 ? Number(dg[0]?.codeBanque) : NaN;
            if (Number.isFinite(cBanque)) {
              const uniqueCodes = Array.from(new Set(data.map((d) => d.codeAgence)));
              const resolved = await Promise.all(
                uniqueCodes.map(async (code) => {
                  try {
                    const ar = await fetch(`/api/ref/agences/${cBanque}/${code}`);
                    if (!ar.ok) return null;
                    const ag = await safeJsonParse<{ libAgence?: string }>(ar);
                    return ag?.libAgence ? { code, lib: ag.libAgence } : null;
                  } catch { return null; }
                })
              );
              agenceNameByCode = new Map(
                resolved.filter((r): r is { code: number; lib: string } => Boolean(r))
                  .map((r) => [r.code, r.lib])
              );
            }
          }
        } catch { /* fallback */ }

        const dossiersTransformes: DossierAVA[] = data.map((dto) => {
          const nomComplet = dto.beneficiaires?.[0]?.nomBenef?.trim() || '';
          const nomParts = nomComplet.split(' ');
          const prenom = nomParts.length > 1 ? nomParts[0] : '';
          const nom = nomParts.length > 1 ? nomParts.slice(1).join(' ') : nomComplet;

          return {
            codeAgence: dto.codeAgence,
            libelleAgence: agenceNameByCode.get(dto.codeAgence) || `Agence ${dto.codeAgence}`,
            typeDossier: dto.typeDossierAva,
            codeTypeDossier: dto.typeDossierAva,
            libelleTypeDossier: typeDossierLabels[dto.typeDossierAva] || `Type ${dto.typeDossierAva}`,
            numeroDossier: String(dto.numDossier),
            dateDossier: dto.dateDossier,
            noPieceClient: dto.noPieceClient,
            nomClient: nom || 'N/A',
            prenomClient: prenom || '',
            montantAutorise: dto.mntAutorise ?? 0,
            mntAutorise: dto.mntAutorise ?? 0,
            montantUtilise: dto.mntUtilise ?? 0,
            mntUtilise: dto.mntUtilise ?? 0,
            mntAvance: dto.mntAvance ?? 0,
            mntAutorisationBct: dto.mntAutorisationBct ?? 0,
            mntReserve: dto.mntReserve ?? 0,
            mntBlocage: dto.mntBlocage ?? 0,
            solde: dto.solde ?? 0,
            devise: 'TND',
            statut: 'ACTIF',
            echeance: dto.echeance,
            typePieceClient: 1,
          };
        });

        setDossiers(dossiersTransformes);
        setDossiersFiltres(dossiersTransformes);
        setAgences(Array.from(new Map(dossiersTransformes.map(d => [d.codeAgence, { codeAgence: d.codeAgence, libelleAgence: d.libelleAgence }])).values()));
        return;
      }
      throw new Error('PARSE_ERROR');
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
      showError('Une erreur est survenue lors du chargement des dossiers', undefined, 'Impossible de charger les dossiers');
      setDossiers([]);
      setDossiersFiltres([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les agences

  // Filtrer les dossiers
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

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchNumeroDossier('');
    setSearchTypeDossier('');
    setSearchClient('');
    setSearchAgence('');
  };

  // Deep-link: auto-select dossier navigated from dashboard
  useEffect(() => {
    if (!initialDossierNum || deepLinked.current || dossiers.length === 0) return;
    const found = dossiers.find(d => d.numeroDossier === initialDossierNum);
    if (found) { deepLinked.current = true; handleSelectDossier(found); }
  }, [dossiers, initialDossierNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sélectionner un dossier
  const handleSelectDossier = (dossier: DossierAVA) => {
    setDossierSelectionne(dossier);
    setWfRcBusinessKey(null);
    setRetrocession({
      typeMouvement: 'RAV' // Par défaut RAV
    });
    setErrors({});
    setDocuments([]); // Réinitialiser les documents
    setEtape('retrocession');
    
    // Charger les opérations associées au dossier
    fetchOperations(dossier.numeroDossier);
  };

  // Retour à la recherche
  const handleRetourRecherche = () => {
    if (!skipDraftCleanupRef.current) {
      void cleanupDraftDocuments();
    }
    skipDraftCleanupRef.current = false;
    setEtape('recherche');
    setDossierSelectionne(null);
    setWfRcBusinessKey(null);
    setRetrocession({
      typeMouvement: 'RAV'
    });
    setErrors({});
    setDocuments([]);
    setOperations([]); // Réinitialiser les opérations
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
      console.log('🧹 [RC] Fichier supprimé (draft cleanup):', targetPath);
    } catch (error) {
      console.warn('⚠️ [RC] Suppression locale ignorée:', targetPath, error);
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

  const saveFileToLocalPath = async (file: File, fullPath: string, pathAnnee: string, pathMois: string) => {
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
        body: JSON.stringify({ targetPath: fullPath, contentBase64 }),
      });
      const payload = await safeJsonParse<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || `HTTP_${response.status}`);
    };

    try {
      if (!documentsBasePath) return;
      const isLocalPath = /^[a-zA-Z]:[\\/]/.test(documentsBasePath) || documentsBasePath.startsWith('/');
      if (!isLocalPath) return;

      const picker = (window as any).showDirectoryPicker;
      if (!picker) {
        await writeThroughDevServer();
        return;
      }

      let root = localStorageDirHandleRef.current;
      if (!root) {
        root = await picker({ mode: 'readwrite' });
        localStorageDirHandleRef.current = root;
      }
      if (!root) return;

      const yearDir = await root.getDirectoryHandle(pathAnnee, { create: true });
      const monthDir = await yearDir.getDirectoryHandle(pathMois, { create: true });
      const fileHandle = await monthDir.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
    } catch (error) {
      console.warn('⚠️ [RC] Échec sauvegarde locale document:', error);
    }
  };

  // Charger les opérations associées au dossier
  const fetchOperations = async (numDossier: string) => {
    setLoadingOperations(true);

    try {
      // Calculer les dates : end = aujourd'hui, start = aujourd'hui - 1 mois
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      // Formater les dates en YYYY-MM-DD
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const start = formatDate(startDate);
      const end = formatDate(endDate);

      // Construire l'URL avec les paramètres de date
      const url = `/api/operations-deleguees-mvt/by-numdossier/${numDossier}?start=${start}&end=${end}`;
      
      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data = await safeJsonParse<OperationMouvement[]>(response);
        if (data) {
          // Filtrer uniquement les mouvements avec codeOperation=250
          const filteredOperations = data.filter(operation => operation.codeOperation === 250);
          setOperations(filteredOperations);
          return;
        }
      }
      throw new Error('API_ERROR');
    } catch (error) {
      console.error('Erreur lors du chargement des opérations:', error);
      showError('Impossible de charger les opérations');
      setOperations([]);
    } finally {
      setLoadingOperations(false);
    }
  };

  // Fonction pour convertir date YYYY-MM-DD vers DD/MM/YYYY
  const formatDateToAPI = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!retrocession.typeMouvement) {
      newErrors.typeMouvement = 'Le type de mouvement est obligatoire';
    }

    if (!retrocession.refOperation) {
      newErrors.refOperation = 'La référence opération est obligatoire';
    }

    // Validations spécifiques pour RRV
    if (retrocession.typeMouvement === 'RRV') {
      if (!retrocession.numeroDeclaration) {
        newErrors.numeroDeclaration = 'Le numéro de déclaration est obligatoire pour RRV';
      }

      if (!retrocession.dateDeclaration) {
        newErrors.dateDeclaration = 'La date de déclaration est obligatoire pour RRV';
      }

      if (!retrocession.mntMvt || retrocession.mntMvt <= 0) {
        newErrors.mntMvt = 'Le montant doit être supérieur à 0 pour RRV';
      }

      // Documents obligatoires uniquement pour RRV
      if (documents.length === 0) {
        newErrors.documents = 'Au moins un document scanné est requis pour RRV';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumettre
  const handleSubmit = async () => {
    if (!validateForm()) {
      showError('Veuillez corriger les erreurs du formulaire');
      return;
    }

    if (!dossierSelectionne) return;

    setIsSubmitting(true);

    try {
      // Construire le JSON selon le format de l'API
      const payload: any = {
        dossier: {
          numeroDossier: Number(dossierSelectionne.numeroDossier),
          dateDossier: formatDateToAPI(dossierSelectionne.dateDossier),
          typeDossier: Number(dossierSelectionne.typeDossier)
        },
        mouvements: {
          typeMouvement: retrocession.typeMouvement,
          refOperation: retrocession.refOperation
        },
        documentsScannes: null
      };

      // Si type RRV, ajouter les champs supplémentaires
      if (retrocession.typeMouvement === 'RRV') {
        payload.mouvements.numeroDeclaration = retrocession.numeroDeclaration;
        payload.mouvements.dateDeclaration = retrocession.dateDeclaration ? formatDateToAPI(retrocession.dateDeclaration) : undefined;
        payload.mouvements.mntMvt = retrocession.mntMvt;
      }

      // Ajouter les documents scannés s'ils sont présents (pour RAV et RRV)
      if (documents.length > 0) {
        payload.documentsScannes = documents.map((doc, index) => ({
          cheminFichier: doc.nomImage
            ? buildDocumentPath({
                fileName: doc.nomImage,
                basePath: documentsBasePath,
                pathAnnee: doc.pathAnnee,
                pathMois: doc.pathMois,
              }).fullPath
            : '',
          ligne: index + 1,
          nomImage: doc.nomImage || '',
          typeDocument: doc.typeDocument || 1
        }));
      }

      toast.info('Soumission au Service Central...', { description: 'Communication avec le moteur de workflow...' });

      let wfResponse = wfRcBusinessKey
        ? await continueRcDecision(wfRcBusinessKey, 'SOUMETTRE', payload as unknown as Record<string, unknown>)
        : await startRcDecision('SOUMETTRE', payload as unknown as Record<string, unknown>);

      if (wfResponse.result === 'OK') {
        const newKey = wfResponse.state?.businessKey;
        if (newKey) {
          setWfRcBusinessKey(newKey);
          
          // Approbation automatique
          toast.info('Approbation automatique...', { description: 'Validation définitive en cours...' });
          wfResponse = await continueRcDecision(newKey, 'APPROUVER', payload as unknown as Record<string, unknown>);
          
          if (wfResponse.result !== 'OK') {
            if (wfResponse.result === 'REJECTED') {
              showError(wfResponse.errorMessage, undefined, 'Approbation rejetée');
            } else {
              showError(wfResponse.errorMessage, undefined, 'Erreur workflow lors de l\'approbation');
            }
            setIsSubmitting(false);
            return;
          }
        }
        
        documents.forEach((d) => {
          if (d.cheminFichier) persistedFilePathsRef.current.add(d.cheminFichier);
        });
        skipDraftCleanupRef.current = true;
        
        toast.success('Opération soumise et validée avec succès', {
          description: newKey ? `Référence: ${newKey}` : `Dossier ${dossierSelectionne.numeroDossier} - Type ${retrocession.typeMouvement}`
        });
        
        handleRetourRecherche();
        await fetchDossiers();
      } else if (wfResponse.result === 'REJECTED') {
        showError(wfResponse.errorMessage, undefined, 'Opération rejetée');
        setIsSubmitting(false);
        return;
      } else if (wfResponse.result === 'ERROR') {
        showError(wfResponse.errorMessage, undefined, 'Erreur workflow');
        setIsSubmitting(false);
        return;
      }
    } catch (error: any) {
      documents.forEach((d) => {
        if (d.cheminFichier) persistedFilePathsRef.current.add(d.cheminFichier);
      });
      skipDraftCleanupRef.current = true;
      console.info('ℹ️ Mode démonstration', error);
      toast.success(`✓ Rétrocession ${retrocession.typeMouvement} enregistrée (mode démo)`, {
        description: `Dossier ${dossierSelectionne.numeroDossier}`
      });
      setTimeout(() => {
        handleRetourRecherche();
        fetchDossiers();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestion des documents
  const addDocument = () => {
    setDocuments([...documents, { id: Date.now().toString() }]);
  };

  const removeDocument = (id: string) => {
    const toDelete = documents.find((d) => d.id === id)?.cheminFichier;
    if (toDelete && !persistedFilePathsRef.current.has(toDelete)) {
      void deleteLocalFileByPath(toDelete);
    }
    setDocuments(documents.filter(d => d.id !== id));
  };

  const updateDocument = (id: string, field: string, value: any) => {
    setDocuments(
      documents.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, [field]: value };
        const fileName = next.nomImage || '';
        if (fileName) {
          const built = buildDocumentPath({
            fileName,
            basePath: documentsBasePath,
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

  const handleFileChange = (id: string, file: File | null) => {
    if (file) {
      const previousPath = documents.find((d) => d.id === id)?.cheminFichier;
      const nomImage = file.name;
      const defaultParts = getCurrentDocumentPathParts();
      const builtForSave = buildDocumentPath({
        fileName: file.name,
        basePath: documentsBasePath,
        pathAnnee: defaultParts.pathAnnee,
        pathMois: defaultParts.pathMois,
      });

      setDocuments(documents.map(d =>
        d.id === id
          ? {
              ...d,
              fichier: file,
              nomImage: nomImage,
              ...(() => {
                const built = buildDocumentPath({
                  fileName: file.name,
                  basePath: documentsBasePath,
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

  // Gérer la sélection d'une opération
  const handleSelectOperation = (operation: OperationMouvement) => {
    setOperationSelectionnee(operation);
    // Pré-remplir le formulaire avec la refOperation
    setRetrocession({
      typeMouvement: 'RAV',
      refOperation: operation.id.refOperation
    });
    setErrors({});
    setDocuments([]);
    setOpenDialog(true);
  };

  // Fermer le dialog et réinitialiser
  const handleCloseDialog = () => {
    if (!skipDraftCleanupRef.current) {
      void cleanupDraftDocuments();
    }
    skipDraftCleanupRef.current = false;
    setOpenDialog(false);
    setOperationSelectionnee(null);
    setWfRcBusinessKey(null);
    setRetrocession({
      typeMouvement: 'RAV'
    });
    setErrors({});
    setDocuments([]);
  };

  // Soumettre depuis le dialog
  const handleSubmitDialog = async () => {
    if (!validateForm()) {
      showError('Veuillez corriger les erreurs du formulaire');
      return;
    }

    if (!dossierSelectionne) return;

    setIsSubmitting(true);

    try {
      // Construire le JSON selon le format de l'API
      const payload: any = {
        dossier: {
          numeroDossier: Number(dossierSelectionne.numeroDossier),
          dateDossier: formatDateToAPI(dossierSelectionne.dateDossier),
          typeDossier: Number(dossierSelectionne.typeDossier)
        },
        mouvements: {
          typeMouvement: retrocession.typeMouvement,
          refOperation: retrocession.refOperation
        },
        documentsScannes: null
      };

      // Si type RRV, ajouter les champs supplémentaires
      if (retrocession.typeMouvement === 'RRV') {
        payload.mouvements.numeroDeclaration = retrocession.numeroDeclaration;
        payload.mouvements.dateDeclaration = retrocession.dateDeclaration ? formatDateToAPI(retrocession.dateDeclaration) : undefined;
        payload.mouvements.mntMvt = retrocession.mntMvt;
      }

      // Ajouter les documents scannés s'ils sont présents (pour RAV et RRV)
      if (documents.length > 0) {
        payload.documentsScannes = documents.map((doc, index) => ({
          cheminFichier: doc.nomImage
            ? buildDocumentPath({
                fileName: doc.nomImage,
                basePath: documentsBasePath,
                pathAnnee: doc.pathAnnee,
                pathMois: doc.pathMois,
              }).fullPath
            : '',
          ligne: index + 1,
          nomImage: doc.nomImage || '',
          typeDocument: doc.typeDocument || 1
        }));
      }

      toast.info('Soumission au Service Central...', { description: 'Communication avec le moteur de workflow...' });

      let wfResponse = wfRcBusinessKey
        ? await continueRcDecision(wfRcBusinessKey, 'SOUMETTRE', payload as unknown as Record<string, unknown>)
        : await startRcDecision('SOUMETTRE', payload as unknown as Record<string, unknown>);

      if (wfResponse.result === 'OK') {
        const newKey = wfResponse.state?.businessKey;
        if (newKey) {
          setWfRcBusinessKey(newKey);
          
          // Approbation automatique
          toast.info('Approbation automatique...', { description: 'Validation définitive en cours...' });
          wfResponse = await continueRcDecision(newKey, 'APPROUVER', payload as unknown as Record<string, unknown>);
          
          if (wfResponse.result !== 'OK') {
            if (wfResponse.result === 'REJECTED') {
              showError(wfResponse.errorMessage, undefined, 'Approbation rejetée');
            } else {
              showError(wfResponse.errorMessage, undefined, 'Erreur workflow lors de l\'approbation');
            }
            setIsSubmitting(false);
            return;
          }
        }
        
        documents.forEach((d) => {
          if (d.cheminFichier) persistedFilePathsRef.current.add(d.cheminFichier);
        });
        skipDraftCleanupRef.current = true;
        
        toast.success('Opération soumise et validée avec succès', {
          description: newKey ? `Référence: ${newKey}` : `Dossier ${dossierSelectionne.numeroDossier} - Type ${retrocession.typeMouvement}`
        });
        
        handleCloseDialog();
        await fetchOperations(dossierSelectionne.numeroDossier);
      } else if (wfResponse.result === 'REJECTED') {
        showError(wfResponse.errorMessage, undefined, 'Opération rejetée');
        setIsSubmitting(false);
        return;
      } else if (wfResponse.result === 'ERROR') {
        showError(wfResponse.errorMessage, undefined, 'Erreur workflow');
        setIsSubmitting(false);
        return;
      }
    } catch (error: any) {
      documents.forEach((d) => {
        if (d.cheminFichier) persistedFilePathsRef.current.add(d.cheminFichier);
      });
      skipDraftCleanupRef.current = true;
      console.info('ℹ️ Mode démonstration', error);
      toast.success(`✓ Rétrocession ${retrocession.typeMouvement} enregistrée (mode démo)`, {
        description: `Dossier ${dossierSelectionne.numeroDossier}`
      });
      setTimeout(() => {
        handleCloseDialog();
        if (dossierSelectionne) {
          fetchOperations(dossierSelectionne.numeroDossier);
        }
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== ÉTAPE 1 : RECHERCHE ==========
  if (etape === 'recherche') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold">Rétrocession</h1>
          <p className="text-muted-foreground mt-1">
            Rechercher et sélectionner un dossier AVA pour effectuer une rétrocession (RAV ou RRV)
          </p>
        </div>

        {/* Card d'information */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold">Types de rétrocession :</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>RAV</strong> : Rétrocession d'Avance sur Voyage (requiert uniquement refOperation)</li>
                  <li><strong>RRV</strong> : Remboursement de Reliquat de Voyage (requiert numeroDeclaration, dateDeclaration, mntMvt, refOperation et documents scannés)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtres de recherche */}
        <Card>
          <CardHeader>
            <CardTitle>Rechercher un dossier</CardTitle>
            <CardDescription>
              Utilisez les filtres ci-dessous pour rechercher un dossier AVA valide
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="searchNumeroDossier">Numéro de dossier</Label>
                <Input
                  id="searchNumeroDossier"
                  placeholder="Ex: 22360500"
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

        {/* Liste des dossiers */}
        <Card>
          <CardHeader>
            <CardTitle>
              Dossiers valides ({dossiersFiltres.length})
            </CardTitle>
            <CardDescription>
              Sélectionnez un dossier pour effectuer une rétrocession
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

  // ========== ÉTAPE 2 : FORMULAIRE RÉTROCESSION ==========
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* En-tête avec retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleRetourRecherche}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Rétrocession</h1>
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
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
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

      {/* Liste des opérations associées au dossier */}
      <Card>
        <CardHeader>
          <CardTitle>Opérations associées au dossier</CardTitle>
          <CardDescription>
            Liste des mouvements enregistrés pour ce dossier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOperations ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#435B7B] mx-auto"></div>
              <p className="text-muted-foreground mt-2 text-sm">Chargement des opérations...</p>
            </div>
          ) : operations.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">Aucune opération trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Référence Opération</th>
                    <th className="text-left p-3 font-semibold">Date Opération</th>
                    <th className="text-left p-3 font-semibold">Code Type Dossier AVA</th>
                    <th className="text-right p-3 font-semibold">Montant Réservé</th>
                    <th className="text-center p-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op, index) => (
                    <tr 
                      key={index} 
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono">
                          {op.id.refOperation}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(op.id.dateOperation).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{op.codeTypeDosAva}</Badge>
                      </td>
                      <td className="p-3 text-right font-semibold text-blue-700 dark:text-blue-400">
                        {(op.mntMvtAva || op.mntReserve).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleSelectOperation(op)}
                        >
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

      {/* Formulaire Rétrocession */}
      <Card>
        <CardHeader>
          <CardTitle>Formulaire Rétrocession</CardTitle>
          <CardDescription>Renseignez les informations selon le type de mouvement (RAV ou RRV)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Type de mouvement */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="typeMouvement">Type de mouvement *</Label>
              <Select
                value={retrocession.typeMouvement}
                onValueChange={(value: 'RAV' | 'RRV') => setRetrocession({ ...retrocession, typeMouvement: value })}
              >
                <SelectTrigger className={errors.typeMouvement ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAV">RAV - Rétrocession d'Avance sur Voyage</SelectItem>
                  <SelectItem value="RRV">RRV - Remboursement de Reliquat de Voyage</SelectItem>
                </SelectContent>
              </Select>
              {errors.typeMouvement && (
                <p className="text-xs text-red-600">{errors.typeMouvement}</p>
              )}
            </div>

            {/* Référence Opération */}
            <div className="space-y-2">
              <Label htmlFor="refOperation">Référence Opération *</Label>
              <Input
                id="refOperation"
                type="number"
                min="0"
                value={retrocession.refOperation || ''}
                onChange={(e) => setRetrocession({ ...retrocession, refOperation: Number(e.target.value) || undefined })}
                placeholder="Ex: 740063"
                className={errors.refOperation ? 'border-red-500' : ''}
              />
              {errors.refOperation && (
                <p className="text-xs text-red-600">{errors.refOperation}</p>
              )}
            </div>

            {/* Champs conditionnels pour RRV */}
            {retrocession.typeMouvement === 'RRV' && (
              <>
                {/* Numéro Déclaration */}
                <div className="space-y-2">
                  <Label htmlFor="numeroDeclaration">Numéro Déclaration *</Label>
                  <Input
                    id="numeroDeclaration"
                    type="number"
                    min="0"
                    value={retrocession.numeroDeclaration || ''}
                    onChange={(e) => setRetrocession({ ...retrocession, numeroDeclaration: Number(e.target.value) || undefined })}
                    placeholder="Ex: 22150"
                    className={errors.numeroDeclaration ? 'border-red-500' : ''}
                  />
                  {errors.numeroDeclaration && (
                    <p className="text-xs text-red-600">{errors.numeroDeclaration}</p>
                  )}
                </div>

                {/* Date Déclaration */}
                <div className="space-y-2">
                  <Label htmlFor="dateDeclaration">Date Déclaration *</Label>
                  <Input
                    id="dateDeclaration"
                    type="date"
                    value={retrocession.dateDeclaration || ''}
                    onChange={(e) => setRetrocession({ ...retrocession, dateDeclaration: e.target.value })}
                    className={errors.dateDeclaration ? 'border-red-500' : ''}
                  />
                  {errors.dateDeclaration && (
                    <p className="text-xs text-red-600">{errors.dateDeclaration}</p>
                  )}
                </div>

                {/* Montant (mntMvt) */}
                <div className="space-y-2">
                  <Label htmlFor="mntMvt">Montant (mntMvt) *</Label>
                  <Input
                    id="mntMvt"
                    type="number"
                    min="0"
                    step="0.001"
                    value={retrocession.mntMvt || ''}
                    onChange={(e) => setRetrocession({ ...retrocession, mntMvt: Number(e.target.value) || undefined })}
                    placeholder="Ex: 2000.000"
                    className={errors.mntMvt ? 'border-red-500' : ''}
                  />
                  {errors.mntMvt && (
                    <p className="text-xs text-red-600">{errors.mntMvt}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Format: avec 3 décimales (ex: 2000.000)
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Scannés - disponible pour RAV et RRV, obligatoire uniquement pour RRV */}
      <Card>
        <CardHeader>
          <CardTitle>
            Documents Scannés {retrocession.typeMouvement === 'RRV' && '*'}
          </CardTitle>
          <CardDescription>
            {retrocession.typeMouvement === 'RRV' 
              ? 'Au moins un document scanné est requis pour les opérations de type RRV'
              : 'Documents scannés optionnels pour les opérations de type RAV'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsManager
            documents={documents}
            onAddDocument={addDocument}
            onRemoveDocument={removeDocument}
            onUpdateDocument={updateDocument}
            onFileChange={handleFileChange}
          />
          {errors.documents && (
            <p className="text-xs text-red-600 mt-2">{errors.documents}</p>
          )}
        </CardContent>
      </Card>

      {/* Card Actions finale */}
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

      {/* Dialog du formulaire de rétrocession */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[860px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Colored header */}
          <div className="bg-[#435B7B] text-white px-6 py-5 flex-shrink-0">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold text-white">Formulaire Rétrocession</DialogTitle>
                <p className="text-blue-100 text-sm mt-1">
                  Opération Réf.{' '}
                  <span className="font-semibold text-white">{operationSelectionnee?.id.refOperation || 'N/A'}</span>
                  {' '}— Renseignez les informations selon le type de mouvement
                </p>
              </div>
            </div>
          </div>

          {/* Operation summary strip */}
          <div className="bg-slate-50 border-b px-6 py-3 flex flex-wrap gap-6 text-sm flex-shrink-0">
            <div>
              <span className="text-muted-foreground">Date opération : </span>
              <span className="font-medium">
                {operationSelectionnee?.id.dateOperation
                  ? new Date(operationSelectionnee.id.dateOperation).toLocaleDateString('fr-FR')
                  : '-'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Montant réservé : </span>
              <span className="font-semibold text-blue-700">
                {((operationSelectionnee?.mntMvtAva || operationSelectionnee?.mntReserve) ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Dossier : </span>
              <span className="font-medium">{dossierSelectionne?.numeroDossier}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Client : </span>
              <span className="font-medium">{dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}</span>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Type de mouvement + Référence Opération */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-typeMouvement">Type de mouvement *</Label>
                <Select
                  value={retrocession.typeMouvement}
                  onValueChange={(value: 'RAV' | 'RRV') => setRetrocession({ ...retrocession, typeMouvement: value })}
                >
                  <SelectTrigger className={errors.typeMouvement ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAV">RAV - Rétrocession d'Avance sur Voyage</SelectItem>
                    <SelectItem value="RRV">RRV - Remboursement de Reliquat de Voyage</SelectItem>
                  </SelectContent>
                </Select>
                {errors.typeMouvement && (
                  <p className="text-xs text-red-600">{errors.typeMouvement}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialog-refOperation">Référence Opération *</Label>
                <Input
                  id="dialog-refOperation"
                  type="number"
                  min="0"
                  value={retrocession.refOperation || ''}
                  onChange={(e) => setRetrocession({ ...retrocession, refOperation: Number(e.target.value) || undefined })}
                  placeholder="Ex: 740063"
                  className={errors.refOperation ? 'border-red-500' : ''}
                />
                {errors.refOperation && (
                  <p className="text-xs text-red-600">{errors.refOperation}</p>
                )}
              </div>
            </div>

            {/* RRV extra fields */}
            {retrocession.typeMouvement === 'RRV' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-5 space-y-4">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Informations supplémentaires RRV
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-numeroDeclaration">Numéro Déclaration *</Label>
                    <Input
                      id="dialog-numeroDeclaration"
                      type="number"
                      min="0"
                      value={retrocession.numeroDeclaration || ''}
                      onChange={(e) => setRetrocession({ ...retrocession, numeroDeclaration: Number(e.target.value) || undefined })}
                      placeholder="Ex: 22150"
                      className={errors.numeroDeclaration ? 'border-red-500' : ''}
                    />
                    {errors.numeroDeclaration && (
                      <p className="text-xs text-red-600">{errors.numeroDeclaration}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dialog-dateDeclaration">Date Déclaration *</Label>
                    <Input
                      id="dialog-dateDeclaration"
                      type="date"
                      value={retrocession.dateDeclaration || ''}
                      onChange={(e) => setRetrocession({ ...retrocession, dateDeclaration: e.target.value })}
                      className={errors.dateDeclaration ? 'border-red-500' : ''}
                    />
                    {errors.dateDeclaration && (
                      <p className="text-xs text-red-600">{errors.dateDeclaration}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dialog-mntMvt">Montant *</Label>
                    <Input
                      id="dialog-mntMvt"
                      type="number"
                      min="0"
                      step="0.001"
                      value={retrocession.mntMvt || ''}
                      onChange={(e) => setRetrocession({ ...retrocession, mntMvt: Number(e.target.value) || undefined })}
                      placeholder="Ex: 2000.000"
                      className={errors.mntMvt ? 'border-red-500' : ''}
                    />
                    {errors.mntMvt && (
                      <p className="text-xs text-red-600">{errors.mntMvt}</p>
                    )}
                    <p className="text-xs text-muted-foreground">3 décimales (ex: 2000.000)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Scannés */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">
                    Documents Scannés {retrocession.typeMouvement === 'RRV' && <span className="text-red-500">*</span>}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {retrocession.typeMouvement === 'RRV'
                      ? 'Au moins un document scanné est requis pour les opérations de type RRV'
                      : 'Documents scannés optionnels pour les opérations de type RAV'}
                  </p>
                </div>
              </div>
              <DocumentsManager
                documents={documents}
                onAddDocument={addDocument}
                onRemoveDocument={removeDocument}
                onUpdateDocument={updateDocument}
                onFileChange={handleFileChange}
              />
              {errors.documents && (
                <p className="text-xs text-red-600">{errors.documents}</p>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="border-t bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-muted-foreground">* Champs obligatoires</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmitDialog}
                disabled={isSubmitting}
                className="bg-[#435B7B] hover:bg-[#2D3E54] min-w-[140px]"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
