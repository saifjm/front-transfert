import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { 
  Search, 
  ArrowLeft, 
  FileText, 
  Save,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { DocumentsManager } from './DocumentsManager';
import { safeJsonParse } from '../utils';

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
}

interface Agence {
  codeAgence: string;
  libelleAgence: string;
}

export function AVARetrocession() {
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
    cheminFichier?: string;
    fichier?: File | null;
  }>>([]);

  // États pour les opérations associées au dossier
  const [operations, setOperations] = useState<OperationMouvement[]>([]);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [operationSelectionnee, setOperationSelectionnee] = useState<OperationMouvement | null>(null);

  // Charger les dossiers et agences au montage
  useEffect(() => {
    fetchDossiers();
    fetchAgences();
  }, []);

  // Charger les dossiers AVA
  const fetchDossiers = async () => {
    setLoading(true);

    const mockDossiers: DossierAVA[] = [
      {
        codeAgence: 100,
        libelleAgence: 'Agence Tunis Centre',
        typeDossier: 3,
        codeTypeDossier: 3,
        libelleTypeDossier: 'AUTRES ACTIVITES (ANNEXE N.2)',
        numeroDossier: '22360500',
        dateDossier: '2026-01-02',
        noPieceClient: '1695881M',
        nomClient: 'Ben Ali',
        prenomClient: 'Ahmed',
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
        typeDossier: 3,
        codeTypeDossier: 3,
        libelleTypeDossier: 'AUTRES ACTIVITES (ANNEXE N.2)',
        numeroDossier: '22360542',
        dateDossier: '2026-01-02',
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
      }
    ];

    try {
      const response = await fetch('/api/operations-deleguees/dossiers-valides-avec-nom');
      if (response.ok) {
        const data = await safeJsonParse<DossierAVA[]>(response);
        if (data) {
          setDossiers(data);
          setDossiersFiltres(data);
          return;
        }
      }
      throw new Error('API_ERROR');
    } catch (error) {
      console.info('ℹ️ Mode démonstration - Rétrocession');
      setDossiers(mockDossiers);
      setDossiersFiltres(mockDossiers);
    } finally {
      setLoading(false);
    }
  };

  // Charger les agences
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

  // Sélectionner un dossier
  const handleSelectDossier = (dossier: DossierAVA) => {
    setDossierSelectionne(dossier);
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
    setEtape('recherche');
    setDossierSelectionne(null);
    setRetrocession({
      typeMouvement: 'RAV'
    });
    setErrors({});
    setDocuments([]);
    setOperations([]); // Réinitialiser les opérations
  };

  // Charger les opérations associées au dossier
  const fetchOperations = async (numDossier: string) => {
    setLoadingOperations(true);

    const mockOperations: OperationMouvement[] = [
      {
        id: {
          refOperation: 740063,
          dateOperation: '2026-01-15'
        },
        codeTypeDosAva: 3,
        mntReserve: 15000
      },
      {
        id: {
          refOperation: 740068,
          dateOperation: '2026-01-20'
        },
        codeTypeDosAva: 3,
        mntReserve: 8500
      },
      {
        id: {
          refOperation: 740075,
          dateOperation: '2026-02-05'
        },
        codeTypeDosAva: 3,
        mntReserve: 6500
      }
    ];

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
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await safeJsonParse<OperationMouvement[]>(response);
        if (data) {
          setOperations(data);
          return;
        }
      }
      throw new Error('API_ERROR');
    } catch (error) {
      console.info('ℹ️ Mode démonstration - Opérations du dossier');
      setOperations(mockOperations);
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
      toast.error('Veuillez corriger les erreurs du formulaire');
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
          ligne: index + 1,
          nomImage: doc.nomImage || '',
          cheminFichier: doc.cheminFichier || '',
          typeDocument: doc.typeDocument || 1
        }));
      }

      const response = await fetch('/api/operations-rc?finalize=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Rétrocession enregistrée avec succès', {
          description: `Dossier ${dossierSelectionne.numeroDossier} - Type ${retrocession.typeMouvement}`
        });
        handleRetourRecherche();
        await fetchDossiers();
      } else {
        const errorData = await response.json().catch(() => null);
        
        // Gérer le format d'erreur de l'API
        if (errorData && errorData.erreurs && Array.isArray(errorData.erreurs)) {
          // Afficher toutes les erreurs
          errorData.erreurs.forEach((erreur: string) => {
            toast.error('Erreur de validation', {
              description: erreur
            });
          });
        } else if (errorData?.message) {
          toast.error('Erreur', {
            description: errorData.message
          });
        } else {
          toast.error('Erreur', {
            description: 'Une erreur est survenue lors de l\'enregistrement'
          });
        }
        
        setIsSubmitting(false);
        return;
      }
    } catch (error: any) {
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
    setDocuments(documents.filter(d => d.id !== id));
  };

  const updateDocument = (id: string, field: string, value: any) => {
    setDocuments(documents.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const handleFileChange = (id: string, file: File | null) => {
    if (file) {
      const nomImage = file.name;
      const cheminFichier = `/documents/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${file.name}`;
      
      updateDocument(id, 'fichier', file);
      updateDocument(id, 'nomImage', nomImage);
      updateDocument(id, 'cheminFichier', cheminFichier);
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
    setOpenDialog(false);
    setOperationSelectionnee(null);
    setRetrocession({
      typeMouvement: 'RAV'
    });
    setErrors({});
    setDocuments([]);
  };

  // Soumettre depuis le dialog
  const handleSubmitDialog = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
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
          ligne: index + 1,
          nomImage: doc.nomImage || '',
          cheminFichier: doc.cheminFichier || '',
          typeDocument: doc.typeDocument || 1
        }));
      }

      const response = await fetch('/api/operations-rc?finalize=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Rétrocession enregistrée avec succès', {
          description: `Dossier ${dossierSelectionne.numeroDossier} - Type ${retrocession.typeMouvement}`
        });
        handleCloseDialog();
        await fetchOperations(dossierSelectionne.numeroDossier);
      } else {
        const errorData = await response.json().catch(() => null);
        
        // Gérer le format d'erreur de l'API
        if (errorData && errorData.erreurs && Array.isArray(errorData.erreurs)) {
          // Afficher toutes les erreurs
          errorData.erreurs.forEach((erreur: string) => {
            toast.error('Erreur de validation', {
              description: erreur
            });
          });
        } else if (errorData?.message) {
          toast.error('Erreur', {
            description: errorData.message
          });
        } else {
          toast.error('Erreur', {
            description: 'Une erreur est survenue lors de l\'enregistrement'
          });
        }
        
        setIsSubmitting(false);
        return;
      }
    } catch (error: any) {
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
                        {op.mntReserve.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Formulaire Rétrocession</DialogTitle>
            <DialogDescription>
              Opération sélectionnée : Réf. {operationSelectionnee?.id.refOperation || 'N/A'} - Renseignez les informations selon le type de mouvement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Type de mouvement */}
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

            <div className="grid grid-cols-2 gap-4">
              {/* Référence Opération */}
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

              {/* Champs conditionnels pour RRV */}
              {retrocession.typeMouvement === 'RRV' && (
                <>
                  {/* Numéro Déclaration */}
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

                  {/* Date Déclaration */}
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

                  {/* Montant (mntMvt) */}
                  <div className="space-y-2">
                    <Label htmlFor="dialog-mntMvt">Montant (mntMvt) *</Label>
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
                    <p className="text-xs text-muted-foreground">
                      Format: avec 3 décimales (ex: 2000.000)
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Documents Scannés */}
            <div className="space-y-2">
              <Label>
                Documents Scannés {retrocession.typeMouvement === 'RRV' && '*'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {retrocession.typeMouvement === 'RRV' 
                  ? 'Au moins un document scanné est requis pour les opérations de type RRV'
                  : 'Documents scannés optionnels pour les opérations de type RAV'}
              </p>
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmitDialog} disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
