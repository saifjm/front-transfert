import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Search, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Calendar,
  User,
  Building,
  TrendingUp,
  Save,
  PlusCircle,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { safeJsonParse } from '../utils';

interface DossierExportateur {
  codeAgence: string;
  libelleAgence: string;
  typeDossier: string;
  codeTypeDossier?: string;
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
  solde: number;
  devise: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
}

interface OperationExportateurAVADTO {
  numDossierAva?: number;
  dateDosRap?: string;
  mntRap?: number;
  codeDevise?: number;
  numeroCompte?: string;
  typePieceBenef?: number;
  noPieceBenef?: string;
  codeProduitService?: number;
}

interface BeneficiaireExistant {
  id?: string;
  typePieceBenef?: number;
  noPieceBenef?: string;
  nomBenef?: string;
  adresseBenef?: string;
  qualite?: string;
  datePiece?: string;
  etat?: 'AA' | 'AD' | 'A' | 'N'; // AA: A activer, AD: A désactiver, A: Actif, N: Inactif
  isNew?: boolean; // Pour distinguer les nouveaux bénéficiaires
}

interface Agence {
  codeAgence: string;
  libelleAgence: string;
}

export function AlimentationDossierExportateur() {
  const [etape, setEtape] = useState<'recherche' | 'alimentation'>('recherche');
  const [dossiers, setDossiers] = useState<DossierExportateur[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierExportateur[]>([]);
  const [dossierSelectionne, setDossierSelectionne] = useState<DossierExportateur | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // État pour le modal d'erreur API
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [apiError, setApiError] = useState<{
    code?: string;
    error?: string;
    details?: string;
    message?: string;
    timestamp?: string;
    status?: number;
  } | null>(null);

  // Filtres de recherche
  const [searchNumeroDossier, setSearchNumeroDossier] = useState('');
  const [searchTypeDossier, setSearchTypeDossier] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchAgence, setSearchAgence] = useState('');

  // Liste des agences
  const [agences, setAgences] = useState<Agence[]>([]);

  // États pour l'alimentation
  const [alimentation, setAlimentation] = useState<OperationExportateurAVADTO>({
    dateDosRap: new Date().toISOString().split('T')[0],
    codeDevise: 788,
    codeProduitService: 108
  });

  // Bénéficiaires
  const [beneficiaires, setBeneficiaires] = useState<BeneficiaireExistant[]>([]);
  const [beneficiairesInitiaux, setBeneficiairesInitiaux] = useState<BeneficiaireExistant[]>([]);

  // États de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les dossiers et agences au montage
  useEffect(() => {
    fetchDossiers();
    fetchAgences();
  }, []);

  // Charger les dossiers exportateurs
  const fetchDossiers = async () => {
    setLoading(true);

    // Données mock par défaut
    const mockDossiers: DossierExportateur[] = [
      {
        codeAgence: '100',
        libelleAgence: 'Agence Tunis Centre',
        typeDossier: '1',
        codeTypeDossier: '1',
        libelleTypeDossier: 'EXPORTATEUR',
        numeroDossier: 'AVA-2026-001',
        dateDossier: '2026-01-15',
        nomClient: 'Dupont Jean',
        prenomClient: 'Jean',
        noPieceClient: '1234567A',
        montantAutorise: 500000,
        mntAutorise: 500000,
        montantUtilise: 150000,
        mntUtilise: 150000,
        mntAvance: 250000,
        mntAutorisationBct: 100000,
        mntReserve: 50000,
        solde: 350000,
        devise: 'TND',
        statut: 'ACTIF'
      },
      {
        codeAgence: '300',
        libelleAgence: 'Agence Sousse',
        typeDossier: '2',
        codeTypeDossier: '2',
        libelleTypeDossier: 'MARCHE REALISABLE A L\'ETRANGER',
        numeroDossier: 'AVA-2026-002',
        dateDossier: '2026-01-20',
        nomClient: 'Martin Sophie',
        prenomClient: 'Sophie',
        noPieceClient: '7654321B',
        montantAutorise: 300000,
        mntAutorise: 300000,
        montantUtilise: 280000,
        mntUtilise: 280000,
        mntAvance: 150000,
        mntAutorisationBct: 60000,
        mntReserve: 20000,
        solde: 20000,
        devise: 'TND',
        statut: 'ACTIF'
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
        nomClient: string;
      }

      const data = await safeJsonParse<DossierValideDTO[]>(response);
      if (!data) {
        throw new Error('NO_DATA');
      }

      const typeDossierLabels: { [key: number]: string } = {
        1: 'EXPORTATEUR',
        2: 'MARCHE REALISABLE A L\'ETRANGER',
        3: 'AUTRES ACTIVITES (ANNEXE N.2)',
        4: 'AUTRES ACTIVITES (BANQUES)',
        5: 'A. ACT. (PROM.-NOUV. PROJ.)'
      };

      const dossiersTransformes: DossierExportateur[] = await Promise.all(
        data.map(async (dto) => {
          // Récupérer les soldes réels pour ce dossier
          let soldes: any = {};
          try {
            const soldesResponse = await fetch(`/api/operations-deleguees/${dto.numDossier}/soldes`);
            if (soldesResponse.ok) {
              const soldesData = await safeJsonParse<any>(soldesResponse);
              if (soldesData) {
                soldes = soldesData;
              }
            }
          } catch (e) {
            console.warn(`Impossible de récupérer les soldes pour le dossier ${dto.numDossier}`);
          }

          return {
            codeAgence: dto.codeAgence.toString(),
            libelleAgence: '', // Renseigné par les agences lors du filtrage/affichage
            typeDossier: dto.typeDossierAva.toString(),
            codeTypeDossier: dto.typeDossierAva.toString(),
            libelleTypeDossier: typeDossierLabels[dto.typeDossierAva] || 'Type inconnu',
            numeroDossier: `AVA-${dto.numDossier}`,
            dateDossier: dto.dateDossier,
            nomClient: dto.nomClient,
            prenomClient: '',
            noPieceClient: dto.noPieceClient,
            
            // Intégration des données financières réelles
            montantAutorise: soldes.montantAutorise || 0,
            mntAutorise: soldes.montantAutorise || 0,
            montantUtilise: soldes.montantUtilise || 0,
            mntUtilise: soldes.montantUtilise || 0,
            mntAvance: soldes.montantAvance || 0,
            mntAutorisationBct: soldes.montantAutorisationBct || 0,
            mntReserve: soldes.montantReserve || 0,
            solde: soldes.soldeDisponible || 0,
            devise: 'TND',
            statut: 'ACTIF'
          };
        })
      );

      // Enrichissement basique (bien que les agences puissent ne pas être encore prêtes)
      dossiersTransformes.forEach(dossier => {
        const agence = agences.find(a => a.codeAgence === dossier.codeAgence);
        if (agence) {
          dossier.libelleAgence = agence.libelleAgence;
        }
      });

      setDossiers(dossiersTransformes);
      setDossiersFiltres(dossiersTransformes);
    } catch (error) {
      console.info('ℹ️ Mode démonstration - Dossiers Exportateurs');
      setDossiers(mockDossiers);
      setDossiersFiltres(mockDossiers);
    } finally {
      setLoading(false);
    }
  };

  // Charger les agences
  const fetchAgences = async () => {
    const mockAgences: Agence[] = [
      { codeAgence: '001', libelleAgence: 'Agence Tunis Centre' },
      { codeAgence: '002', libelleAgence: 'Agence Sousse' },
      { codeAgence: '003', libelleAgence: 'Agence Sfax' },
      { codeAgence: '004', libelleAgence: 'Agence Nabeul' }
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

  // Filtrage des dossiers
  useEffect(() => {
    let filtered = [...dossiers];

    if (searchNumeroDossier.trim()) {
      const term = searchNumeroDossier.toLowerCase();
      filtered = filtered.filter(d => d.numeroDossier.toLowerCase().includes(term));
    }

    if (searchTypeDossier) {
      filtered = filtered.filter(d => d.typeDossier === searchTypeDossier);
    }

    if (searchClient.trim()) {
      const term = searchClient.toLowerCase();
      filtered = filtered.filter(d => 
        d.nomClient.toLowerCase().includes(term) ||
        d.noPieceClient.toLowerCase().includes(term)
      );
    }

    if (searchAgence) {
      filtered = filtered.filter(d => d.codeAgence === searchAgence);
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
  const handleSelectDossier = (dossier: DossierExportateur) => {
    setDossierSelectionne(dossier);
    setAlimentation({
      numeroDossier: dossier.numeroDossier,
      typeOperation: 'AUGMENTATION',
      dateOperation: new Date().toISOString().split('T')[0]
    });
    setErrors({});
    setEtape('alimentation');
  };

  // Retour à la recherche
  const handleRetourRecherche = () => {
    setEtape('recherche');
    setDossierSelectionne(null);
    setAlimentation({
      dateDosRap: new Date().toISOString().split('T')[0],
      codeDevise: 788,
      codeProduitService: 108
    });
    setErrors({});
  };

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!alimentation.mntRap || alimentation.mntRap <= 0) {
      newErrors.mntRap = 'Le montant doit être supérieur à 0';
    }

    if (!alimentation.typePieceBenef) {
      newErrors.typePieceBenef = 'Le type de pièce est obligatoire';
    }

    if (!alimentation.dateDosRap) {
      newErrors.dateDosRap = 'La date est obligatoire';
    }

    if (!alimentation.noPieceBenef || alimentation.noPieceBenef.trim() === '') {
      newErrors.noPieceBenef = 'Le numéro de pièce est obligatoire';
    }

    if (!alimentation.numeroCompte || alimentation.numeroCompte.trim() === '') {
      newErrors.numeroCompte = 'Le numéro de compte (RIB) est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumettre l'alimentation
  const handleSubmit = async () => {
    if (!dossierSelectionne) {
      toast.error('Aucun dossier sélectionné');
      return;
    }

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    setIsSubmitting(true);
    try {
      // Extraire l'ID du dossier proprement
      let numDossierNumber = 0;
      if (dossierSelectionne.numeroDossier) {
        numDossierNumber = Number(dossierSelectionne.numeroDossier.replace('AVA-', '').replace('EXP-', ''));
      }

      const payload: OperationExportateurAVADTO = {
        ...alimentation,
        numDossierAva: numDossierNumber
      };

      const response = await fetch('/api/operation-exportateur-ava/rapatriement/true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Si la réponse est un PDF (quand Finalize=true on attend parfois un PDF)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/pdf')) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Rapatriement_AVA_${payload.numDossierAva}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }

        toast.success('Rapatriement enregistré avec succès', {
          description: `Dossier ${dossierSelectionne.numeroDossier} rapatrié`
        });
        
        // Retour à la recherche
        handleRetourRecherche();
        
        // Recharger les dossiers
        await fetchDossiers();
      } else {
        const errorData = await safeJsonParse<any>(response);
        
        if (errorData) {
          setApiError({
            status: response.status,
            message: errorData.message || 'Erreur lors du traitement de la requête',
            details: errorData.details || errorData.error,
            code: errorData.code,
            timestamp: errorData.timestamp || new Date().toISOString()
          });
        } else {
          setApiError({
            status: response.status,
            message: 'Erreur inattendue du serveur',
            details: `HTTP ${response.status}`
          });
        }
        setShowErrorModal(true);
      }
    } catch (error) {
      console.info('ℹ️ Mode démonstration - Rapatriement simulé (Erreur réseau)');
      toast.success('✓ Rapatriement enregistré (mode démo)', {
        description: `Dossier ${dossierSelectionne.numeroDossier} rapatrié`
      });
      
      // Retour à la recherche après un délai
      setTimeout(() => {
        handleRetourRecherche();
        fetchDossiers();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Badge de statut
  const getStatutBadge = (statut: DossierExportateur['statut']) => {
    switch (statut) {
      case 'ACTIF':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Actif</Badge>;
      case 'SUSPENDU':
        return <Badge className="bg-orange-500"><AlertTriangle className="w-3 h-3 mr-1" />Suspendu</Badge>;
      case 'CLOTURE':
        return <Badge className="bg-gray-500"><XCircle className="w-3 h-3 mr-1" />Clôturé</Badge>;
    }
  };

  // Interface de recherche
  if (etape === 'recherche') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold">Alimentation Dossier Exportateur</h1>
          <p className="text-muted-foreground mt-1">
            Rechercher et sélectionner un dossier exportateur pour l'alimenter
          </p>
        </div>

        {/* Filtres de recherche */}
        <Card>
          <CardHeader>
            <CardTitle>Rechercher un dossier</CardTitle>
            <CardDescription>
              Utilisez les filtres ci-dessous pour rechercher un dossier exportateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="searchNumeroDossier">Numéro de dossier</Label>
                <Input
                  id="searchNumeroDossier"
                  placeholder="Ex: EXP-2026-001"
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
                    <SelectItem value="1">1 - AVA Import</SelectItem>
                    <SelectItem value="2">2 - AVA Export</SelectItem>
                    <SelectItem value="3">3 - AVA Importation</SelectItem>
                    <SelectItem value="4">4 - AVA Service</SelectItem>
                    <SelectItem value="5">5 - AVA Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchClient">Client</Label>
                <Input
                  id="searchClient"
                  placeholder="Nom ou N° pièce"
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
              Sélectionnez un dossier pour l'alimenter
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
                            {dossier.typeDossier} - {dossier.libelleTypeDossier}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{dossier.numeroDossier}</td>
                        <td className="p-3 text-sm">
                          {dossier.dateDossier ? new Date(dossier.dateDossier).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="p-3 text-sm">{dossier.noPieceClient}</td>
                        <td className="p-3 text-sm">{dossier.nomClient}</td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            onClick={() => handleSelectDossier(dossier)}
                            disabled={dossier.statut !== 'ACTIF'}
                            className="bg-[#435B7B] hover:bg-[#2D3E54]"
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
      </div>
    );
  }

  // Interface d'alimentation
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* En-tête avec retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleRetourRecherche}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Alimentation Dossier Exportateur</h1>
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
            {/* Ligne 1: Code agence, Libellé agence, Type de dossier, Date du dossier, Numéro de dossier */}
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
            {/* Ligne 2: N° Pièce Client, Nom du client */}
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

          {/* Séparateur */}
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

          {/* Séparateur */}
          <div className="border-t"></div>

          {/* Montants utilisés et solde - sans label */}
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

      {/* Formulaire d'alimentation */}
      <Card>
        <CardHeader>
          <CardTitle>Formulaire d'Alimentation (Rapatriement)</CardTitle>
          <CardDescription>
            Renseignez les informations de l'opération de rapatriement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="typePieceBenef">Type de Pièce *</Label>
              <Select
                value={alimentation.typePieceBenef?.toString()}
                onValueChange={(value) => 
                  setAlimentation({ ...alimentation, typePieceBenef: Number(value) })
                }
              >
                <SelectTrigger className={errors.typePieceBenef ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Carte d'identité nationale</SelectItem>
                  <SelectItem value="4">Carte de séjour</SelectItem>
                  <SelectItem value="7">Passeport</SelectItem>
                </SelectContent>
              </Select>
              {errors.typePieceBenef && (
                <p className="text-xs text-red-600">{errors.typePieceBenef}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="noPieceBenef">Numéro de pièce *</Label>
              <Input
                id="noPieceBenef"
                value={alimentation.noPieceBenef || ''}
                onChange={(e) => setAlimentation({ ...alimentation, noPieceBenef: e.target.value })}
                placeholder="Ex. 123456789"
                className={errors.noPieceBenef ? 'border-red-500' : ''}
              />
              {errors.noPieceBenef && (
                <p className="text-xs text-red-600">{errors.noPieceBenef}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mntRap">Montant (Rapatriement) *</Label>
              <Input
                id="mntRap"
                type="number"
                min="0"
                step="0.01"
                value={alimentation.mntRap || ''}
                onChange={(e) => setAlimentation({ 
                  ...alimentation, 
                  mntRap: Number(e.target.value) || undefined 
                })}
                placeholder="Montant du rapatriement"
                className={errors.mntRap ? 'border-red-500' : ''}
              />
              {errors.mntRap && (
                <p className="text-xs text-red-600">{errors.mntRap}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Devise du rapatriement : {dossierSelectionne?.devise}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateDosRap">Date de dossier *</Label>
              <Input
                id="dateDosRap"
                type="date"
                value={alimentation.dateDosRap}
                onChange={(e) => setAlimentation({ ...alimentation, dateDosRap: e.target.value })}
                className={errors.dateDosRap ? 'border-red-500' : ''}
              />
              {errors.dateDosRap && (
                <p className="text-xs text-red-600">{errors.dateDosRap}</p>
              )}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="numeroCompte">Numéro de compte (RIB) *</Label>
              <Input
                id="numeroCompte"
                value={alimentation.numeroCompte || ''}
                onChange={(e) => setAlimentation({ ...alimentation, numeroCompte: e.target.value })}
                placeholder="Ex. 1234567890123"
                className={errors.numeroCompte ? 'border-red-500' : ''}
              />
              {errors.numeroCompte && (
                <p className="text-xs text-red-600">{errors.numeroCompte}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleRetourRecherche}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#435B7B] hover:bg-[#2D3E54]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Rapatrier & Générer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal d'erreur API */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Erreur lors du rapatriement
            </DialogTitle>
            <DialogDescription>
              Une erreur s'est produite lors de l'enregistrement. Veuillez consulter les détails ci-dessous.
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

                {apiError.details && (
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-red-900 min-w-[100px]">Détails :</span>
                    <span className="text-sm text-red-800">{apiError.details}</span>
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
    </div>
  );
}