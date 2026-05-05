import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { 
  Search, 
  ArrowLeft, 
  FileText, 
  Save,
  FolderX,
  Building2,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { safeJsonParse } from '../utils';
import { AlertCircle } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

interface ApiError {
  status: number;
  message: string;
  details?: string;
  code?: string;
  timestamp?: string;
}

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

interface ClotureDTO {
  numeroDossier?: string;
  motifCloture?: string;
  dateCloture?: string;
  reference?: string;
  observations?: string;
}

interface Agence {
  codeAgence: string;
  libelleAgence: string;
}

export function AVAClotureDossier() {
  const [etape, setEtape] = useState<'recherche' | 'cloture'>('recherche');
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierAVA[]>([]);
  const [dossierSelectionne, setDossierSelectionne] = useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchNumeroDossier, setSearchNumeroDossier] = useState('');
  const [searchTypeDossier, setSearchTypeDossier] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchAgence, setSearchAgence] = useState('');

  const [agences, setAgences] = useState<Agence[]>([]);

  const [cloture, setCloture] = useState<ClotureDTO>({
    dateCloture: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    fetchDossiers();
    fetchAgences();
  }, []);

  const fetchDossiers = async () => {
    setLoading(true);

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
        montantUtilise: 0,
        mntUtilise: 0,
        mntAvance: 75000,
        mntAutorisationBct: 30000,
        mntReserve: 0,
        mntBlocage: 0,
        solde: 150000,
        devise: 'TND',
        statut: 'ACTIF',
        echeance: '2024-12-31',
        typePieceClient: 1
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
      }

      const data = await safeJsonParse<DossierValideDTO[]>(response);
      if (!data) {
        throw new Error('NO_DATA');
      }
      
      const typeDossierLabels: Record<number, string> = {
        1: "EXPORTATEUR",
        2: "MARCHE REALISABLE A L'ETRANGER",
        3: "AUTRES ACTIVITES (ANNEXE N.2)",
        4: "AUTRES ACTIVITES (BANQUES)",
        5: "A. ACT. (PROM.-NOUV. PROJ.)",
      };

      let agenceNameByCode = new Map<number, string>();
      try {
        const donneesGeneralesResponse = await fetch('/api/ref/donnees-generales');
        if (donneesGeneralesResponse.ok) {
          const donneesGenerales = await safeJsonParse<Array<{ codeBanque?: number }>>(donneesGeneralesResponse);
          const cBanque =
            Array.isArray(donneesGenerales) && donneesGenerales.length > 0
              ? Number(donneesGenerales[0]?.codeBanque)
              : NaN;
          if (Number.isFinite(cBanque)) {
            const uniqueCodes = Array.from(
              new Set(
                data
                  .map((dto) => Number(dto.codeAgence))
                  .filter((code) => Number.isFinite(code))
              ),
            ) as number[];
            const agencesResolved = await Promise.all(
              uniqueCodes.map(async (codeAgence) => {
                try {
                  const agenceResponse = await fetch(`/api/ref/agences/${cBanque}/${codeAgence}`);
                  if (!agenceResponse.ok) return null;
                  const agenceData = await safeJsonParse<{ libAgence?: string }>(agenceResponse);
                  return { codeAgence, libelleAgence: agenceData?.libAgence || `Agence ${codeAgence}` };
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

      const dossiersTransformes: DossierAVA[] = await Promise.all(
        data.map(async (dto) => {
          const nomComplet = dto.nomClient?.trim() || "";
          const nomParts = nomComplet.split(" ");
          const prenom = nomParts.length > 1 ? nomParts[0] : "";
          const nom = nomParts.length > 1 ? nomParts.slice(1).join(" ") : nomComplet;

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

          return {
            codeAgence: dto.codeAgence,
            libelleAgence: agenceNameByCode.get(Number(dto.codeAgence)) || `Agence ${dto.codeAgence}`,
            typeDossier: dto.typeDossierAva,
            codeTypeDossier: dto.typeDossierAva,
            libelleTypeDossier: typeDossierLabels[Number(dto.typeDossierAva)] || `Type ${dto.typeDossierAva}`,
            numeroDossier: `AVA-${dto.numDossier}`,
            dateDossier: dto.dateDossier,
            nomClient: nom || dto.nomClient || "N/A",
            prenomClient: prenom || "",
            noPieceClient: dto.noPieceClient,
            
            // Données financières
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

      // Mettre à jour la liste des agences pour le filtre
      setAgences(prevAgences => {
          const newAgencesMap = new Map(prevAgences.map(a => [a.codeAgence, a]));
          dossiersTransformes.forEach(d => {
              const cAgence = String(d.codeAgence);
              if (cAgence && !newAgencesMap.has(cAgence)) {
                  newAgencesMap.set(cAgence, { codeAgence: cAgence, libelleAgence: d.libelleAgence });
              }
          });
          return Array.from(newAgencesMap.values());
      });

      setDossiers(dossiersTransformes);
      setDossiersFiltres(dossiersTransformes);
    } catch (error) {
      console.info('ℹ️ Mode démonstration - Clôture Dossier');
      setDossiers(mockDossiers);
      setDossiersFiltres(mockDossiers);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgences = async () => {
    // La liste des agences est alimentée dynamiquement via fetchDossiers
  };

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

  const handleSelectDossier = (dossier: DossierAVA) => {
    setDossierSelectionne(dossier);
    setCloture({
      numeroDossier: dossier.numeroDossier,
      dateCloture: new Date().toISOString().split('T')[0]
    });
    setErrors({});
    setEtape('cloture');
  };

  const handleRetourRecherche = () => {
    setEtape('recherche');
    setDossierSelectionne(null);
    setCloture({
      dateCloture: new Date().toISOString().split('T')[0]
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!cloture.motifCloture || cloture.motifCloture.trim() === '') {
      newErrors.motifCloture = 'Le motif est obligatoire';
    }

    if (!cloture.dateCloture) {
      newErrors.dateCloture = 'La date est obligatoire';
    }

    if (!cloture.reference || cloture.reference.trim() === '') {
      newErrors.reference = 'La référence est obligatoire';
    }

    // Vérifier que le montant utilisé est 0
    if (dossierSelectionne && dossierSelectionne.montantUtilise > 0) {
      newErrors.general = 'Impossible de clôturer : le montant utilisé doit être 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    if (!dossierSelectionne?.numeroDossier) return;

    setIsSubmitting(true);
    // Extrait le vrai numéro de dossier s'il est préfixé d'AVA-
    const rawDossierString = dossierSelectionne.numeroDossier.replace('AVA-', '');
    const numDossierId = Number(rawDossierString);

    if (isNaN(numDossierId) || numDossierId <= 0) {
      toast.error("Impossible d'extraire le numéro de dossier valide.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/cloture/${numDossierId}/true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motif: cloture.motifCloture,
          dateCloture: cloture.dateCloture,
          reference: cloture.reference,
          observations: cloture.observations
        })
      });

      if (response.ok) {
        // En cas de succès 200 ça retourne un OuvertureDossierDTO, on peut juste réagir
        toast.success('Clôture enregistrée avec succès', {
          description: `Dossier ${dossierSelectionne?.numeroDossier} clôturé`
        });
        handleRetourRecherche();
        await fetchDossiers();
      } else {
        const errorData = await safeJsonParse<any>(response);
        if (response.status === 422 || response.status === 400 || response.status === 409 || response.status === 404) {
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
              message: 'Erreur inattendue de validation',
              details: `Le serveur a retourné une erreur ${response.status} sans détails supplémentaires.`
            });
          }
          setShowErrorModal(true);
        } else {
          throw new Error('Erreur inattendue serveur');
        }
      }
    } catch (error) {
      console.info('ℹ️ Mode démonstration');
      toast.success('✓ Clôture enregistrée (mode démo)', {
        description: `Dossier ${dossierSelectionne?.numeroDossier} clôturé`
      });
      setTimeout(() => {
        handleRetourRecherche();
        fetchDossiers();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (etape === 'recherche') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        <div className="anim-fade-in-up delay-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}>
              <FolderX className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Clôture Dossier</h1>
              <p className="text-muted-foreground text-sm">
                Rechercher et sélectionner un dossier AVA pour le clôturer
              </p>
            </div>
          </div>
        </div>

        <Card className="anim-fade-in-up delay-100 card-lift border-[#d1dce6]" style={{ borderTop: '3px solid #435B7B' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: '#435B7B' }} />
              <CardTitle className="text-base">Rechercher un dossier</CardTitle>
            </div>
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
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="anim-fade-in-up delay-200 border-[#d1dce6]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: '#435B7B' }} />
                <CardTitle className="text-base">
                  Dossiers clôturables ({dossiersFiltres.length})
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs" style={{ background: '#EEF3F7', color: '#435B7B' }}>
                {dossiersFiltres.length} résultat{dossiersFiltres.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <CardDescription>
              Sélectionnez un dossier pour le clôturer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#d1dce6] border-t-[#435B7B] mx-auto"></div>
                <p className="text-muted-foreground mt-4 text-sm">Chargement des dossiers...</p>
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
                    <tr className="border-b" style={{ background: '#F4F8FC' }}>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>Code Agence</th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>Agence</th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>Type Dossier</th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>Numéro Dossier</th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>Date Dossier</th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>N° Pièce Client</th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>Client</th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersFiltres.map((dossier, index) => (
                      <tr key={index} className="border-b hover:bg-[#EEF3F7]/50 transition-all duration-200">
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
                           disabled={dossier.montantUtilise > 0}
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      <div className="flex items-center justify-between anim-fade-in-up delay-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleRetourRecherche} className="border-[#d1dce6] hover:bg-[#EEF3F7] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}>
              <FolderX className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Clôture Dossier</h1>
              <p className="text-muted-foreground text-sm">
                Dossier : {dossierSelectionne?.numeroDossier} - {dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}
              </p>
            </div>
          </div>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}
          className="text-white gap-2 hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" />
          Enregistrer
        </Button>
      </div>

      <Card className="anim-fade-in-up delay-100 border-[#d1dce6]" style={{ borderTop: '3px solid #435B7B' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: '#435B7B' }} />
            <CardTitle className="text-base">Informations du dossier</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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

      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg anim-fade-in-up">
          <p className="text-red-700 dark:text-red-400">{errors.general}</p>
        </div>
      )}

      <Card className="anim-fade-in-up delay-200 card-lift border-[#d1dce6]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FolderX className="w-4 h-4" style={{ color: '#435B7B' }} />
            <CardTitle className="text-base">Formulaire Clôture</CardTitle>
          </div>
          <CardDescription>Renseignez les informations de clôture</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="motifCloture">Motif *</Label>
              <Input
                id="motifCloture"
                value={cloture.motifCloture || ''}
                onChange={(e) => setCloture({ ...cloture, motifCloture: e.target.value })}
                placeholder="Motif de la clôture"
                className={errors.motifCloture ? 'border-red-500' : ''}
              />
              {errors.motifCloture && (
                <p className="text-xs text-red-600">{errors.motifCloture}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateCloture">Date Clôture *</Label>
              <Input
                id="dateCloture"
                type="date"
                value={cloture.dateCloture}
                onChange={(e) => setCloture({ ...cloture, dateCloture: e.target.value })}
                className={errors.dateCloture ? 'border-red-500' : ''}
              />
              {errors.dateCloture && (
                <p className="text-xs text-red-600">{errors.dateCloture}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Référence *</Label>
              <Input
                id="reference"
                value={cloture.reference || ''}
                onChange={(e) => setCloture({ ...cloture, reference: e.target.value })}
                placeholder="Référence document"
                className={errors.reference ? 'border-red-500' : ''}
              />
              {errors.reference && (
                <p className="text-xs text-red-600">{errors.reference}</p>
              )}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="observations">Observations</Label>
              <Input
                id="observations"
                value={cloture.observations || ''}
                onChange={(e) => setCloture({ ...cloture, observations: e.target.value })}
                placeholder="Observations éventuelles"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="anim-fade-in-up delay-300 border-[#d1dce6]">
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
                className="gap-2 border-[#d1dce6]"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la liste
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}
                className="text-white gap-2 hover:opacity-90 transition-opacity"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Clôture en cours...' : 'Confirmer la clôture'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal d'erreur API - similaire à l'exportateur */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl text-red-600">Action impossible</DialogTitle>
                <DialogDescription>
                  La clôture n'a pas pu être effectuée en raison d'un blocage de validation ou règle métier.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-4">
              {apiError?.message && (
                <div>
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    Motif du rejet
                  </h4>
                  <p className="mt-1 text-sm text-slate-700 bg-white p-3 rounded border border-slate-200 whitespace-pre-wrap">
                    {apiError.message}
                  </p>
                </div>
              )}
            </div>

            {((apiError?.status && apiError.status !== 200) || apiError?.code) && (
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-500">
                {apiError.status && <span>Code HTTP: {apiError.status}</span>}
                {apiError.code && <span>Code métier: {apiError.code}</span>}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 border-t border-slate-200 pt-4">
            <Button onClick={() => setShowErrorModal(false)} variant="outline">
              Fermer l'alerte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}