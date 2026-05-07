import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { authenticatedFetch } from '../utils/api';
import { 
  ArrowLeft, 
  FileText, 
  AlertTriangle,
  RefreshCw,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { safeJsonParse } from '../utils';
import { startRapatriementDecision,continueRapatriementDecision } from '../utils/workflowApi';
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
  numeroCompte?: string;
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

interface Agence {
  codeAgence: string;
  libelleAgence: string;
}

export function AlimentationDossierExportateur({ initialDossierNum }: { initialDossierNum?: string } = {}) {
  const deepLinked = useRef(false);
  const [etape, setEtape] = useState<'recherche' | 'alimentation'>('recherche');
  const [dossiers, setDossiers] = useState<DossierExportateur[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierExportateur[]>([]);
  const [dossierSelectionne, setDossierSelectionne] = useState<DossierExportateur | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // État workflow
  const [wfRapatriementBusinessKey, setWfRapatriementBusinessKey] = useState<string | null>(null);

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

  // États de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les dossiers et agences au montage
  useEffect(() => {
    fetchDossiers();
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
        numeroCompte: '123456789012345678901234',
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
        numeroCompte: '987654321098765432109876',
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
      const response = await authenticatedFetch('/api/operations-deleguees/dossiers-valides-avec-nom');
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
        numeroCompte?: string;
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

      let agenceNameByCode = new Map<number, string>();
      try {
        const donneesGeneralesResponse = await authenticatedFetch('/api/ref/donnees-generales');
        if (donneesGeneralesResponse.ok) {
          const donneesGenerales = await safeJsonParse<Array<{ codeBanque?: number }>>(donneesGeneralesResponse);
          const codeBanque =
            Array.isArray(donneesGenerales) && donneesGenerales.length > 0
              ? Number(donneesGenerales[0]?.codeBanque)
              : NaN;
          if (Number.isFinite(codeBanque)) {
            const uniqueCodes = Array.from(
              new Set(
                data
                  .map((dto: any) => Number(dto.codeAgence))
                  .filter((code: number) => Number.isFinite(code)),
              ),
            ) as number[];
            const agencesResolved = await Promise.all(
              uniqueCodes.map(async (codeAgence) => {
                try {
                  const agenceResponse = await authenticatedFetch(`/api/ref/agences/${codeBanque}/${codeAgence}`);
                  if (!agenceResponse.ok) return null;
                  const agence = await safeJsonParse<{ libAgence?: string }>(agenceResponse);
                  return { codeAgence, libelleAgence: agence?.libAgence || `Agence ${codeAgence}` };
                } catch {
                  return null;
                }
              }),
            );
            agenceNameByCode = new Map(
              agencesResolved
                .filter((item): item is { codeAgence: number; libelleAgence: string } => Boolean(item))
                .map((item) => [item.codeAgence, item.libelleAgence]),
            );
          }
        }
      } catch {
        agenceNameByCode = new Map();
      }

      const dossiersTransformes: DossierExportateur[] = await Promise.all(
        data.map(async (dto) => {
          // Récupérer les soldes réels pour ce dossier
          let soldes: any = {};
          try {
            const soldesResponse = await authenticatedFetch(`/api/operations-deleguees/${dto.numDossier}/soldes`);
            if (soldesResponse.ok) {
              const soldesData = await safeJsonParse<any>(soldesResponse);
              if (soldesData) {
                soldes = soldesData;
              }
            }
          } catch (e) {
            console.warn(`Impossible de récupérer les soldes pour le dossier ${dto.numDossier}`);
          }

          // Récupérer le numéro de compte
          let numeroCompte = dto.numeroCompte || soldes.numeroCompte;
          if (!numeroCompte) {
            try {
              const detailsResponse = await authenticatedFetch(`/api/operations-deleguees/${dto.numDossier}`);
              if (detailsResponse.ok) {
                const detailsData = await safeJsonParse<any>(detailsResponse);
                numeroCompte = detailsData?.numeroCompte;
              }
            } catch (e) {
              console.warn(`Impossible de récupérer les détails pour le dossier ${dto.numDossier}`);
            }
          }
          if (!numeroCompte) {
            try {
              const compteResponse = await authenticatedFetch(`/api/operations-deleguees/${dto.numDossier}/numero-compte`);
              if (compteResponse.ok) {
                const compteData = await safeJsonParse<any>(compteResponse);
                numeroCompte = compteData?.numeroCompte;
              }
            } catch (e) {
              console.warn(`Impossible de récupérer le numéro de compte pour le dossier ${dto.numDossier}`);
            }
          }

          return {
            codeAgence: dto.codeAgence.toString(),
            libelleAgence: agenceNameByCode.get(dto.codeAgence) || `Agence ${dto.codeAgence}`,
            typeDossier: dto.typeDossierAva.toString(),
            codeTypeDossier: dto.typeDossierAva.toString(),
            libelleTypeDossier: typeDossierLabels[dto.typeDossierAva] || 'Type inconnu',
            numeroDossier: `AVA-${dto.numDossier}`,
            dateDossier: dto.dateDossier,
            nomClient: dto.nomClient,
            prenomClient: '',
            noPieceClient: dto.noPieceClient,
            numeroCompte: numeroCompte,
            
            // Intégration des données financières réelles
            montantAutorise: soldes.montantAutorise || 0,
            mntAutorise: soldes.montantAutorise || 0,
            montantUtilise: soldes.montantUtilise || 0,
            mntUtilise: soldes.montantUtilise || 0,
            mntAvance: soldes.mntAvance || 0,
            mntAutorisationBct: soldes.mntAutorisationBct || 0,
            mntReserve: soldes.montantReserve || soldes.mntReserve || 0,
            mntBlocage: soldes.mntBlocage || 0,
            solde: soldes.soldeDisponible || 0,
            devise: 'TND',
            statut: 'ACTIF' as const
          };
        })
      );

      setAgences(Array.from(new Map(dossiersTransformes.map(d => [d.codeAgence, { codeAgence: d.codeAgence, libelleAgence: d.libelleAgence }])).values()));

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

  // Deep-link: auto-select dossier navigated from dashboard
  useEffect(() => {
    if (!initialDossierNum || deepLinked.current || dossiers.length === 0) return;
    const found = dossiers.find(d => d.numeroDossier === initialDossierNum);
    if (found) { deepLinked.current = true; handleSelectDossier(found); }
  }, [dossiers, initialDossierNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sélectionner un dossier
  const handleSelectDossier = async (dossier: DossierExportateur) => {
    setDossierSelectionne(dossier);
    setWfRapatriementBusinessKey(null); // Reset workflow state
    
    let numeroCompte = dossier.numeroCompte;
    
    // Si aucun compte n'est trouvé, essayez via l'API comptes par pièce client
    if (!numeroCompte && dossier.noPieceClient) {
      try {
        const comptesResponse = await authenticatedFetch(`/api/ref/comptes/by-piece-client/${encodeURIComponent(dossier.noPieceClient)}`);
        if (comptesResponse.ok) {
          const comptesData = await safeJsonParse<any[]>(comptesResponse);
          if (comptesData && comptesData.length > 0) {
            const compte = comptesData[0];
            if (compte.numeroCompte) {
              numeroCompte = compte.numeroCompte;
            } else if (compte.racineCompte) {
              // Directement la racine du compte (13 caractères)
              numeroCompte = String(compte.racineCompte).padStart(13, '0');
            }
          }
        }
      } catch (e) {
        console.warn('Erreur appel compte', e);
      }
    }

    // Retirer les 5 premiers caractères et les 2 derniers si on a un RIB complet (20 caractères)
    if (numeroCompte && typeof numeroCompte === 'string' && numeroCompte.length === 20) {
      numeroCompte = numeroCompte.substring(5, 18);
    }

    setAlimentation({
      numDossierAva: Number(dossier.numeroDossier.replace('AVA-', '').replace('EXP-', '')),
      dateDosRap: new Date().toISOString().split('T')[0],
      codeDevise: 788,
      codeProduitService: 108,
      numeroCompte: numeroCompte || ''
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

      // Préparer le payload pour le workflow
      const payload: OperationExportateurAVADTO = {
        numDossierAva: numDossierNumber,
        dateDosRap: alimentation.dateDosRap,
        mntRap: alimentation.mntRap,
        codeDevise: alimentation.codeDevise,
        codeProduitService: alimentation.codeProduitService,
        numeroCompte: alimentation.numeroCompte,
        typePieceBenef: alimentation.typePieceBenef,
        noPieceBenef: alimentation.noPieceBenef
      };

      console.log('[WF] Rapatriement Exportateur - Début soumission');
      console.log('[WF] Business key actuelle:', wfRapatriementBusinessKey);
      console.log('[WF] Payload:', payload);

      // Appel workflow
      const wfResponse = wfRapatriementBusinessKey
        ? await continueRapatriementDecision(
            wfRapatriementBusinessKey,
            'SOUMETTRE',
            payload
          )
        : await startRapatriementDecision(
            'SOUMETTRE',
            payload
          );

      console.log('[WF] Réponse workflow:', wfResponse);

      // Traiter la réponse du workflow
      if (wfResponse.result === 'OK') {
        // Sauvegarder la business key pour les soumissions futures
        const newKey = wfResponse.state?.businessKey;
        if (newKey) {
          console.log('[WF] Business key sauvegardée:', newKey);
          setWfRapatriementBusinessKey(newKey);
        }

        toast.success('Rapatriement exportateur soumis avec succès', {
          description: newKey ? `Référence: ${newKey}` : `Dossier ${dossierSelectionne.numeroDossier} rapatrié`,
          duration: 5000,
        });
        
        // Retour à la recherche
        handleRetourRecherche();
        
        // Recharger les dossiers
        await fetchDossiers();

      } else if (wfResponse.result === 'REJECTED') {
        console.error('[WF] Opération rejetée:', wfResponse.errorMessage);
        toast.error('Opération rejetée par le workflow', {
          description: wfResponse.errorMessage || 'Veuillez vérifier les données',
        });

      } else if (wfResponse.result === 'ERROR') {
        console.error('[WF] Erreur workflow:', wfResponse.errorMessage);
        toast.error('Erreur workflow', {
          description: wfResponse.errorMessage || 'Une erreur est survenue',
        });
      }
    } catch (error) {
      console.error('[WF] Exception:', error);
      toast.error('Erreur lors de la soumission', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      setIsSubmitting(false);
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

            <div className="hidden">
              <Input
                id="numeroCompte"
                value={alimentation.numeroCompte || ''}
                readOnly
              />
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